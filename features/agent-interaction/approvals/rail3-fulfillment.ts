import { registerRailCallbacks } from "@/features/agent-interaction/approvals/service";
import { storage } from "@/server/storage";
import type { UnifiedApproval } from "@/shared/schema";
import { fetchOneTimeCredentials } from "@/features/payment-rails/rail3";
import { getFreshIdToken, ReauthRequiredError } from "@/features/platform-management/auth/firebase-token-exchange";

async function fulfillRail3Approval(approval: UnifiedApproval): Promise<void> {
  const transactionId = approval.railRef;
  const tx = await storage.getRail3TransactionById(transactionId);
  if (!tx) {
    console.error(`[Rail3] Approval fulfilled but transaction not found: ${transactionId}`);
    return;
  }

  const card = await storage.getRail3CardByCardId(tx.cardId);
  if (!card || card.status !== "active" || card.isFrozen) {
    await storage.updateRail3Transaction(transactionId, {
      status: "failed",
      metadata: { ...(tx.metadata as object || {}), failureReason: card?.isFrozen ? "card_frozen" : "card_not_authorized" },
    });
    return;
  }

  // Crossmint requires both url and countryCode at credential-fetch time.
  // Bot checkout schema enforces them on creation; explicit failure if somehow missing.
  if (!tx.merchantUrl || !tx.merchantCountry) {
    await storage.updateRail3Transaction(transactionId, {
      status: "failed",
      metadata: { ...(tx.metadata as object || {}), failureReason: "missing_merchant_fields" },
    });
    console.error(`[Rail3] Transaction ${transactionId} missing merchant url/country, cannot fetch credentials`);
    return;
  }

  let ownerIdToken: string;
  try {
    ownerIdToken = await getFreshIdToken(tx.ownerUid);
  } catch (err) {
    const reason = err instanceof ReauthRequiredError ? `reauth_required:${err.reason}` : String(err);
    await storage.updateRail3Transaction(transactionId, {
      status: "failed",
      metadata: { ...(tx.metadata as object || {}), failureReason: reason },
    });
    console.error(`[Rail3] Cannot fetch credentials for ${transactionId}: ${reason}`);
    return;
  }

  try {
    const { expiresAt } = await fetchOneTimeCredentials({
      jwt: ownerIdToken,
      orderIntentId: card.orderIntentId,
      merchant: {
        name: tx.merchantName,
        url: tx.merchantUrl,
        countryCode: tx.merchantCountry,
      },
    });

    await storage.updateRail3Transaction(transactionId, {
      status: "credentials_issued",
      credentialIssuedAt: new Date(),
      metadata: {
        ...(tx.metadata as object || {}),
        credentialsExpiresAt: expiresAt,
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
    await storage.updateRail3Transaction(transactionId, {
      status: "failed",
      metadata: { ...(tx.metadata as object || {}), failureReason: String(err) },
    });
  }

  console.log(`[Approvals] Rail 3 approved: transaction ${transactionId}`);
}

async function fulfillRail3Denial(approval: UnifiedApproval): Promise<void> {
  const transactionId = approval.railRef;
  await storage.updateRail3Transaction(transactionId, {
    status: "failed",
    metadata: { failureReason: "owner_denied" },
  });

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
