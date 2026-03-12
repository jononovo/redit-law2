import { createHmac, randomBytes } from "crypto";
import { storage } from "@/server/storage";
import { sendApprovalEmail } from "@/lib/approvals/email";
import { getApprovalExpiresAt, APPROVAL_TTL_BY_RAIL } from "@/lib/approvals/lifecycle";
import type { UnifiedApproval } from "@/shared/schema";

const HMAC_SECRET = process.env.UNIFIED_APPROVAL_HMAC_SECRET || process.env.HMAC_SECRET || process.env.CONFIRMATION_HMAC_SECRET || process.env.CRON_SECRET;

function getHmacSecret(): string {
  if (!HMAC_SECRET) {
    throw new Error("[Approvals] HMAC secret not configured. Set UNIFIED_APPROVAL_HMAC_SECRET, HMAC_SECRET, or CONFIRMATION_HMAC_SECRET.");
  }
  return HMAC_SECRET;
}

function generateApprovalId(): string {
  return `ua_${randomBytes(16).toString("hex")}`;
}

function generateHmac(approvalId: string): string {
  return createHmac("sha256", getHmacSecret()).update(approvalId).digest("hex");
}

export function verifyHmac(approvalId: string, token: string): boolean {
  const expected = generateHmac(approvalId);
  if (expected.length !== token.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return mismatch === 0;
}

export type RailCallbacks = {
  onApprove: (approval: UnifiedApproval) => Promise<void>;
  onDeny: (approval: UnifiedApproval) => Promise<void>;
};

const railCallbackRegistry = new Map<string, RailCallbacks>();

export function registerRailCallbacks(rail: string, callbacks: RailCallbacks) {
  railCallbackRegistry.set(rail, callbacks);
}

export async function createApproval({
  rail,
  ownerUid,
  ownerEmail,
  botName,
  amountDisplay,
  amountRaw,
  merchantName,
  itemName,
  railRef,
  metadata,
  ttlMinutes,
}: {
  rail: string;
  ownerUid: string;
  ownerEmail: string;
  botName: string;
  amountDisplay: string;
  amountRaw: number;
  merchantName: string;
  itemName?: string | null;
  railRef: string;
  metadata?: Record<string, any>;
  ttlMinutes?: number;
}): Promise<UnifiedApproval> {
  const ttl = ttlMinutes ?? APPROVAL_TTL_BY_RAIL[rail] ?? 15;
  const approvalId = generateApprovalId();
  const hmacToken = generateHmac(approvalId);

  const approval = await storage.createUnifiedApproval({
    approvalId,
    rail,
    ownerUid,
    ownerEmail,
    botName,
    amountDisplay,
    amountRaw,
    merchantName,
    itemName: itemName || null,
    hmacToken,
    status: "pending",
    expiresAt: getApprovalExpiresAt(ttl),
    railRef,
    metadata: metadata || null,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://creditclaw.com";
  const approvalUrl = `${baseUrl}/api/v1/approvals/confirm/${approvalId}?token=${hmacToken}`;

  const emailResult = await sendApprovalEmail({
    ownerEmail,
    botName,
    amountDisplay,
    merchantName,
    itemName,
    approvalUrl,
    ttlMinutes: ttl,
    rail,
  });

  console.log(`[Approvals] Created ${rail} approval ${approvalId} for ${botName} — ${amountDisplay} at ${merchantName}`, {
    emailSent: emailResult.sent,
    ttlMinutes: ttl,
    railRef,
  });

  return approval;
}

export async function resolveApproval(
  approvalId: string,
  action: "approve" | "deny",
  hmacToken: string
): Promise<{ success: boolean; approval?: UnifiedApproval; error?: string; callbackError?: string }> {
  if (!verifyHmac(approvalId, hmacToken)) {
    return { success: false, error: "invalid_token" };
  }

  const approval = await storage.getUnifiedApprovalById(approvalId);
  if (!approval) {
    return { success: false, error: "not_found" };
  }

  if (approval.status !== "pending") {
    return { success: false, error: `already_${approval.status}` };
  }

  if (new Date() > approval.expiresAt) {
    await storage.decideUnifiedApproval(approvalId, "expired");
    return { success: false, error: "expired" };
  }

  const decision = action === "approve" ? "approved" : "denied";
  const updated = await storage.decideUnifiedApproval(approvalId, decision);

  if (!updated) {
    const current = await storage.getUnifiedApprovalById(approvalId);
    return { success: false, error: current ? `already_${current.status}` : "update_failed" };
  }

  const callbacks = railCallbackRegistry.get(updated.rail);
  let callbackError: string | undefined;
  if (callbacks) {
    try {
      if (action === "approve") {
        await callbacks.onApprove(updated);
      } else {
        await callbacks.onDeny(updated);
      }
    } catch (err: any) {
      callbackError = err?.message || "callback_failed";
      console.error(`[Approvals] ${updated.rail} ${action} callback failed for ${approvalId}:`, err);
    }
  } else {
    console.warn(`[Approvals] No callbacks registered for rail: ${updated.rail}`);
  }

  console.log(`[Approvals] Resolved ${updated.rail} approval ${approvalId} → ${decision}`);

  return { success: true, approval: updated, callbackError };
}
