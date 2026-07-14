import { NextRequest, NextResponse } from "next/server";
import { registerBotRequestSchema, bots, pairingCodes } from "@/shared/schema";
import { storage } from "@/server/storage";
import { db } from "@/server/db";
import { eq, and, isNull } from "drizzle-orm";
import { generateBotId, generateApiKey, generateClaimToken, hashApiKey, getApiKeyPrefix, generateWebhookSecret } from "@/features/platform-management/agent-management/crypto";
import { normalizePairingCode } from "@/features/platform-management/agent-management/pairing-code-format";
import { sendOwnerRegistrationEmail } from "@/features/platform-management/email";
import { fireWebhook } from "@/features/agent-interaction/webhooks";
import { notifyWalletActivated } from "@/features/platform-management/notifications";
import { provisionTunnelForBot, cleanupTunnel, type TunnelProvisionOutput } from "@/features/agent-interaction/webhook-tunnel";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
const RATE_WINDOW = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

function attachTunnelResponse(response: Record<string, unknown>, tunnel: TunnelProvisionOutput) {
  response.webhook_url = tunnel.responseData.webhook_url;
  response.tunnel_token = tunnel.responseData.tunnel_token;
  response.tunnel_setup = tunnel.responseData.tunnel_setup;
  if (tunnel.responseData.openclaw_hooks_token) {
    response.openclaw_hooks_token = tunnel.responseData.openclaw_hooks_token;
    response.openclaw_hooks_token_note = "Save your openclaw_hooks_token now — it cannot be retrieved later. Set it as CREDITCLAW_HOOKS_TOKEN in your OpenClaw environment.";
  }
}

export async function POST(request: NextRequest) {
  let tunnel: TunnelProvisionOutput | null = null;
  let botId: string = "";

  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "rate_limited", message: "Too many registrations. Try again later.", retry_after_seconds: 3600 },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "invalid_json", message: "Request body must be valid JSON" },
        { status: 400 }
      );
    }

    const parsed = registerBotRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", message: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { bot_name, owner_email, description, callback_url, bot_type, local_port, webhook_path } = parsed.data;
    const pairing_code = parsed.data.pairing_code ? normalizePairingCode(parsed.data.pairing_code) : undefined;
    const tenantId = request.headers.get("x-tenant-id") || "creditclaw";

    const isDuplicate = await storage.checkDuplicateRegistration(bot_name, owner_email);
    if (isDuplicate) {
      return NextResponse.json(
        { error: "duplicate_registration", message: `A bot named "${bot_name}" is already registered with this email.` },
        { status: 409 }
      );
    }

    let pairingCodeRecord = null;
    if (pairing_code) {
      pairingCodeRecord = await storage.getPairingCodeByCode(pairing_code);
      if (!pairingCodeRecord || pairingCodeRecord.status !== "pending" || pairingCodeRecord.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "invalid_pairing_code", message: "Pairing code is invalid, expired, or already used." },
          { status: 400 }
        );
      }
    }

    const codeHasOwner = !!pairingCodeRecord?.ownerUid;

    botId = generateBotId();
    const apiKey = generateApiKey();
    const claimToken = pairing_code && codeHasOwner ? null : generateClaimToken();
    const apiKeyHash = await hashApiKey(apiKey);
    const apiKeyPrefix = getApiKeyPrefix(apiKey);

    const effectiveBotType = bot_type || "openclaw";

    let effectiveCallbackUrl = callback_url || null;
    let webhookSecret: string | null = callback_url ? generateWebhookSecret() : null;

    if (!callback_url) {
      tunnel = await provisionTunnelForBot(botId, effectiveBotType, local_port, webhook_path);
      if (tunnel) {
        effectiveCallbackUrl = tunnel.dbFields.callbackUrl;
        webhookSecret = tunnel.dbFields.webhookSecret;
      }
    }

    const botBaseValues = {
      botId,
      botName: bot_name,
      description: description || null,
      ownerEmail: owner_email,
      apiKeyHash,
      apiKeyPrefix,
      callbackUrl: effectiveCallbackUrl,
      webhookSecret,
      webhookStatus: tunnel ? "pending" : (effectiveCallbackUrl ? "active" : "none"),
      webhookFailCount: 0,
      signupTenant: tenantId,
      botType: effectiveBotType,
      agentPlatform: pairingCodeRecord?.agentPlatform || null,
      tunnelId: tunnel?.dbFields.tunnelId || null,
      tunnelToken: tunnel?.dbFields.tunnelToken || null,
      tunnelStatus: tunnel ? "provisioned" : "none",
      tunnelLocalPort: tunnel?.dbFields.tunnelLocalPort || null,
      openclawHooksToken: tunnel?.dbFields.openclawHooksToken || null,
    };

    if (pairingCodeRecord && pairing_code && pairingCodeRecord.ownerUid) {
      const codeOwnerUid = pairingCodeRecord.ownerUid;
      const result = await db.transaction(async (tx) => {
        const [bot] = await tx.insert(bots).values({
          ...botBaseValues,
          claimToken: null,
          walletStatus: "active",
          ownerUid: codeOwnerUid,
          claimedAt: new Date(),
        }).returning();

        const [claimed] = await tx
          .update(pairingCodes)
          .set({ status: "claimed", botId, claimedAt: new Date() })
          .where(
            and(
              eq(pairingCodes.code, pairing_code),
              eq(pairingCodes.status, "pending")
            )
          )
          .returning();

        if (!claimed) {
          throw new Error("PAIRING_RACE");
        }

        return bot;
      });

      fireWebhook(result, "wallet.activated", {
        owner_uid: codeOwnerUid,
        wallet_status: "active",
        message: "Owner paired bot via pairing code and wallet is now live.",
      }).catch((err) => console.error("Webhook fire failed:", err));

      notifyWalletActivated(codeOwnerUid, result.botName, result.botId).catch(() => {});

      const response: Record<string, unknown> = {
        bot_id: botId,
        api_key: apiKey,
        claim_token: null,
        status: "active",
        paired: true,
        owner_uid: codeOwnerUid,
        important: "Save your api_key now — it cannot be retrieved later. Your wallet is already active via pairing code.",
      };

      if (webhookSecret) {
        response.webhook_secret = webhookSecret;
        response.webhook_note = "Save your webhook_secret now — it cannot be retrieved later. Use it to verify HMAC signatures on incoming webhook payloads.";
      }

      if (tunnel) {
        attachTunnelResponse(response, tunnel);
      }

      return NextResponse.json(response, { status: 201 });
    }

    if (pairingCodeRecord && pairing_code) {
      const anonResult = await db.transaction(async (tx) => {
        const [registered] = await tx
          .update(pairingCodes)
          .set({ botId, status: "registered" })
          .where(and(
            eq(pairingCodes.code, pairing_code),
            eq(pairingCodes.status, "pending"),
            isNull(pairingCodes.ownerUid),
          ))
          .returning();

        if (registered) {
          const [bot] = await tx.insert(bots).values({
            ...botBaseValues,
            claimToken,
            walletStatus: "pending",
            ownerUid: null,
            claimedAt: null,
          }).returning();
          return { bot, activatedOwnerUid: null as string | null };
        }

        const [current] = await tx
          .select()
          .from(pairingCodes)
          .where(eq(pairingCodes.code, pairing_code))
          .limit(1);

        if (current && current.status === "pending" && current.ownerUid) {
          const [claimed] = await tx
            .update(pairingCodes)
            .set({ status: "claimed", botId, claimedAt: new Date() })
            .where(and(
              eq(pairingCodes.code, pairing_code),
              eq(pairingCodes.status, "pending"),
            ))
            .returning();
          if (!claimed) throw new Error("PAIRING_RACE");

          const [bot] = await tx.insert(bots).values({
            ...botBaseValues,
            claimToken: null,
            walletStatus: "active",
            ownerUid: current.ownerUid,
            claimedAt: new Date(),
          }).returning();
          return { bot, activatedOwnerUid: current.ownerUid };
        }

        throw new Error("PAIRING_RACE");
      });

      if (anonResult.activatedOwnerUid) {
        fireWebhook(anonResult.bot, "wallet.activated", {
          owner_uid: anonResult.activatedOwnerUid,
          wallet_status: "active",
          message: "Owner paired bot via pairing code and wallet is now live.",
        }).catch((err) => console.error("Webhook fire failed:", err));

        notifyWalletActivated(anonResult.activatedOwnerUid, anonResult.bot.botName, anonResult.bot.botId).catch(() => {});
      }

      const response: Record<string, unknown> = anonResult.activatedOwnerUid
        ? {
            bot_id: botId,
            api_key: apiKey,
            claim_token: null,
            status: "active",
            paired: true,
            owner_uid: anonResult.activatedOwnerUid,
            important: "Save your api_key now — it cannot be retrieved later. Your wallet is already active via pairing code.",
          }
        : {
            bot_id: botId,
            api_key: apiKey,
            claim_token: claimToken,
            status: "pending_owner_verification",
            paired: false,
            pairing_code_status: "registered",
            important: "Save your api_key now — it cannot be retrieved later. Your human's pairing code links you automatically once they finish signing in — no further action needed.",
          };

      if (webhookSecret) {
        response.webhook_secret = webhookSecret;
        response.webhook_note = "Save your webhook_secret now — it cannot be retrieved later. Use it to verify HMAC signatures on incoming webhook payloads.";
      }

      if (tunnel) {
        attachTunnelResponse(response, tunnel);
      }

      return NextResponse.json(response, { status: 201 });
    }

    const bot = await storage.createBot({
      ...botBaseValues,
      claimToken,
      walletStatus: "pending",
      ownerUid: null,
      claimedAt: null,
    });

    sendOwnerRegistrationEmail({
      ownerEmail: owner_email,
      botName: bot_name,
      claimToken: claimToken!,
      description,
    }).catch((err) => {
      console.error("Failed to send owner email:", err);
    });

    const response: Record<string, unknown> = {
      bot_id: botId,
      api_key: apiKey,
      claim_token: claimToken,
      status: "pending_owner_verification",
      owner_verification_url: `https://creditclaw.com/claim?token=${claimToken}`,
      important: "Save your api_key now — it cannot be retrieved later. Give the claim_token to your human so they can activate your wallet.",
    };

    if (webhookSecret) {
      response.webhook_secret = webhookSecret;
      response.webhook_note = "Save your webhook_secret now — it cannot be retrieved later. Use it to verify HMAC signatures on incoming webhook payloads.";
    }

    if (tunnel) {
      attachTunnelResponse(response, tunnel);
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    if (tunnel) {
      cleanupTunnel(tunnel.dbFields.tunnelId, botId);
    }
    if (error?.message === "PAIRING_RACE") {
      return NextResponse.json(
        { error: "pairing_failed", message: "Pairing code was claimed by another request. Please try again." },
        { status: 409 }
      );
    }
    console.error("Bot registration failed:", error?.message || error);
    return NextResponse.json(
      { error: "internal_error", message: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
