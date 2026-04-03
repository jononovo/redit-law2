import { NextRequest, NextResponse } from "next/server";
import { registerBotRequestSchema, bots, wallets, pairingCodes } from "@/shared/schema";
import { storage } from "@/server/storage";
import { db } from "@/server/db";
import { eq, and } from "drizzle-orm";
import { generateBotId, generateApiKey, generateClaimToken, hashApiKey, getApiKeyPrefix, generateWebhookSecret } from "@/lib/agent-management/crypto";
import { sendOwnerRegistrationEmail } from "@/lib/email";
import { fireWebhook } from "@/lib/webhooks";
import { notifyWalletActivated } from "@/lib/notifications";
import { provisionTunnelForBot, cleanupTunnel, type TunnelProvisionOutput } from "@/lib/webhook-tunnel";

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

    const { bot_name, owner_email, description, callback_url, pairing_code, bot_type, local_port, webhook_path } = parsed.data;
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

    botId = generateBotId();
    const apiKey = generateApiKey();
    const claimToken = pairing_code ? null : generateClaimToken();
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

    if (pairingCodeRecord && pairing_code) {
      const result = await db.transaction(async (tx) => {
        const [bot] = await tx.insert(bots).values({
          botId,
          botName: bot_name,
          description: description || null,
          ownerEmail: owner_email,
          apiKeyHash,
          apiKeyPrefix,
          claimToken: null,
          walletStatus: "active",
          callbackUrl: effectiveCallbackUrl,
          webhookSecret,
          webhookStatus: tunnel ? "pending" : (effectiveCallbackUrl ? "active" : "none"),
          webhookFailCount: 0,
          ownerUid: pairingCodeRecord.ownerUid,
          claimedAt: new Date(),
          signupTenant: tenantId,
          botType: effectiveBotType,
          tunnelId: tunnel?.dbFields.tunnelId || null,
          tunnelToken: tunnel?.dbFields.tunnelToken || null,
          tunnelStatus: tunnel ? "provisioned" : "none",
          tunnelLocalPort: tunnel?.dbFields.tunnelLocalPort || null,
          openclawHooksToken: tunnel?.dbFields.openclawHooksToken || null,
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

        await tx.insert(wallets).values({
          botId,
          ownerUid: pairingCodeRecord.ownerUid,
          balanceCents: 0,
        }).returning();

        return bot;
      });

      fireWebhook(result, "wallet.activated", {
        owner_uid: pairingCodeRecord.ownerUid,
        wallet_status: "active",
        message: "Owner paired bot via pairing code and wallet is now live.",
      }).catch((err) => console.error("Webhook fire failed:", err));

      notifyWalletActivated(pairingCodeRecord.ownerUid, result.botName, result.botId).catch(() => {});

      const response: Record<string, unknown> = {
        bot_id: botId,
        api_key: apiKey,
        claim_token: null,
        status: "active",
        paired: true,
        owner_uid: pairingCodeRecord.ownerUid,
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

    const bot = await storage.createBot({
      botId,
      botName: bot_name,
      description: description || null,
      ownerEmail: owner_email,
      apiKeyHash,
      apiKeyPrefix,
      claimToken,
      walletStatus: "pending",
      callbackUrl: effectiveCallbackUrl,
      webhookSecret,
      webhookStatus: tunnel ? "pending" : (effectiveCallbackUrl ? "active" : "none"),
      webhookFailCount: 0,
      ownerUid: null,
      claimedAt: null,
      signupTenant: tenantId,
      botType: effectiveBotType,
      tunnelId: tunnel?.dbFields.tunnelId || null,
      tunnelToken: tunnel?.dbFields.tunnelToken || null,
      tunnelStatus: tunnel ? "provisioned" : "none",
      tunnelLocalPort: tunnel?.dbFields.tunnelLocalPort || null,
      openclawHooksToken: tunnel?.dbFields.openclawHooksToken || null,
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
