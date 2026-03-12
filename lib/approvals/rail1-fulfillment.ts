import { registerRailCallbacks } from "@/lib/approvals/service";
import { storage } from "@/server/storage";
import type { UnifiedApproval } from "@/shared/schema";
import { recordOrder } from "@/lib/orders/create";

async function fulfillRail1Approval(approval: UnifiedApproval): Promise<void> {
  const transactionId = Number(approval.railRef);
  if (isNaN(transactionId)) return;

  const metadata = (approval.metadata as Record<string, any>) || {};
  const resourceUrl = metadata.resource_url || "";
  let vendorDomain: string | null = null;
  try {
    vendorDomain = new URL(resourceUrl).hostname;
  } catch {
    vendorDomain = resourceUrl || null;
  }

  await storage.privyUpdateTransactionStatus(transactionId, "pending");

  recordOrder({
    ownerUid: approval.ownerUid,
    rail: "rail1",
    botId: null,
    botName: approval.botName ?? null,
    walletId: null,
    transactionId,
    status: "completed",
    vendor: vendorDomain,
    vendorDetails: { url: resourceUrl },
    productName: vendorDomain,
    productUrl: resourceUrl,
    priceCents: Math.round((approval.amountRaw / 1_000_000) * 100),
    priceCurrency: "USD",
    metadata: {
      recipient_address: metadata.recipient_address,
      resource_url: resourceUrl,
      amount_usdc: approval.amountRaw,
      unified_approval_id: approval.approvalId,
    },
  }).catch((err) => console.error("[Rail1] Order creation after approval failed:", err));

  console.log(`[Approvals] Rail 1 approved: unified_approval ${approval.approvalId}, tx ${transactionId}`);
}

async function fulfillRail1Denial(approval: UnifiedApproval): Promise<void> {
  const transactionId = Number(approval.railRef);
  if (isNaN(transactionId)) return;

  await storage.privyUpdateTransactionStatus(transactionId, "failed");

  console.log(`[Approvals] Rail 1 denied: unified_approval ${approval.approvalId}, tx ${transactionId}`);
}

registerRailCallbacks("rail1", {
  onApprove: fulfillRail1Approval,
  onDeny: fulfillRail1Denial,
});
