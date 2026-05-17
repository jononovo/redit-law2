import { registerRailCallbacks } from "@/features/agent-interaction/approvals/service";
import { storage } from "@/server/storage";
import type { UnifiedApproval } from "@/shared/schema";
import { fetchOneTimeCredentials } from "@/features/payment-rails/rail3";

async function fulfillRail3Approval(approval: UnifiedApproval): Promise<void> {
  const transactionId = approval.railRef;
  const tx = await storage.getRail3TransactionById(transactionId);
  if (!tx) {
    console.error(`[Rail3] Approval fulfilled but transaction not found: ${transactionId}`);
    return;
  }

  const card = await storage.getRail3CardByCardId(tx.cardId);
  if (!card?.defaultOrderIntentId) {
    await storage.updateRail3Transaction(transactionId, { status: "failed", metadata: { ...(tx.metadata as object || {}), failureReason: "no_active_permission" } });
    return;
  }

  try {
    const credentials = await fetchOneTimeCredentials({
      orderIntentId: card.defaultOrderIntentId,
      merchant: {
        name: tx.merchantName,
        url: tx.merchantUrl || undefined,
        countryCode: tx.merchantCountry || undefined,
      },
    });

    await storage.updateRail3Transaction(transactionId, {
      status: "credentials_issued",
      credentialIssuedAt: new Date(),
      metadata: {
        ...(tx.metadata as object || {}),
        credentialsExpiresAt: credentials.expiresAt,
      },
    });

    if (tx.botId) {
      const bot = await storage.getBotByBotId(tx.botId);
      if (bot) {
        const { fireWebhook } = await import("@/features/agent-interaction/webhooks");
        fireWebhook(bot, "rail3.checkout.approved" as any, {
          transaction_id: transactionId,
          card_id: tx.cardId,
          merchant: tx.merchantName,
          message: "Owner approved. Call POST /api/v1/bot/rail3/checkout again with the same payload to retrieve one-time credentials.",
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error(`[Rail3] Failed to fetch credentials after approval:`, err);
    await storage.updateRail3Transaction(transactionId, { status: "failed", metadata: { ...(tx.metadata as object || {}), failureReason: String(err) } });
  }

  console.log(`[Approvals] Rail 3 approved: transaction ${transactionId}`);
}

async function fulfillRail3Denial(approval: UnifiedApproval): Promise<void> {
  const transactionId = approval.railRef;
  await storage.updateRail3Transaction(transactionId, { status: "failed", metadata: { failureReason: "owner_denied" } });

  const tx = await storage.getRail3TransactionById(transactionId);
  if (tx?.botId) {
    const bot = await storage.getBotByBotId(tx.botId);
    if (bot) {
      const { fireWebhook } = await import("@/features/agent-interaction/webhooks");
      fireWebhook(bot, "rail3.checkout.failed" as any, {
        transaction_id: transactionId,
        card_id: tx.cardId,
        merchant: tx.merchantName,
        reason: "Owner denied the purchase",
      }).catch(() => {});
    }
  }

  console.log(`[Approvals] Rail 3 denied: transaction ${transactionId}`);
}

registerRailCallbacks("rail3", {
  onApprove: fulfillRail3Approval,
  onDeny: fulfillRail3Denial,
});
