import { registerRailCallbacks } from "@/lib/approvals/service";
import { storage } from "@/server/storage";
import { getWindowStart } from "@/lib/rail4/allowance";
import type { UnifiedApproval } from "@/shared/schema";

async function fulfillRail4Approval(approval: UnifiedApproval) {
  const confirmationId = approval.railRef;
  const conf = await storage.getCheckoutConfirmation(confirmationId);
  if (!conf) {
    console.error(`[Approvals] Rail 4 approve: confirmation ${confirmationId} not found`);
    return;
  }

  const bot = await storage.getBotByBotId(conf.botId);
  if (!bot) return;

  const wallet = await storage.getWalletByBotId(conf.botId);
  if (!wallet || wallet.isFrozen || wallet.balanceCents < conf.amountCents) {
    await storage.updateCheckoutConfirmationStatus(confirmationId, "denied");
    console.error(`[Approvals] Rail 4 approve failed: wallet issue for ${confirmationId}`);
    return;
  }

  const updated = await storage.debitWallet(wallet.id, conf.amountCents);
  if (!updated) return;

  await storage.createTransaction({
    walletId: wallet.id,
    type: "purchase",
    amountCents: conf.amountCents,
    description: `${conf.merchantName}: ${conf.itemName} (approved)`,
    balanceAfter: updated.balanceCents,
  });

  await storage.updateCheckoutConfirmationStatus(confirmationId, "approved");

  const card = await storage.getRail4CardByCardId(conf.cardId);
  if (card) {
    const permissions = card.profilePermissions ? JSON.parse(card.profilePermissions) : [];
    const profilePerm = permissions.find((p: { profile_index: number }) => p.profile_index === conf.profileIndex);
    if (profilePerm) {
      const windowStart = getWindowStart(profilePerm.allowance_duration);
      await storage.upsertProfileAllowanceUsage(conf.cardId, conf.profileIndex, windowStart, conf.amountCents, false);
    }
  }

  const { fireWebhook } = await import("@/lib/webhooks");
  fireWebhook(bot, "rail4.checkout.approved" as any, {
    confirmation_id: confirmationId,
    amount_usd: conf.amountCents / 100,
    merchant: conf.merchantName,
    item: conf.itemName,
    missing_digits: card?.missingDigitsValue || null,
    expiry_month: card?.expiryMonth || null,
    expiry_year: card?.expiryYear || null,
    new_balance_usd: updated.balanceCents / 100,
  }).catch(() => {});

  const { recordOrganicEvent } = await import("@/lib/obfuscation-engine/state-machine");
  if (card) {
    recordOrganicEvent(card.cardId).catch(() => {});
  }

  const { recordOrder } = await import("@/lib/orders/create");
  recordOrder({
    ownerUid: approval.ownerUid,
    rail: "rail4",
    botId: conf.botId,
    botName: bot.botName,
    cardId: conf.cardId,
    status: "completed",
    vendor: conf.merchantName,
    vendorDetails: { url: conf.merchantUrl, category: conf.category || undefined },
    productName: conf.itemName,
    priceCents: conf.amountCents,
    priceCurrency: "USD",
    metadata: { confirmationId, profileIndex: conf.profileIndex, approvalId: approval.id },
  }).catch((err) => {
    console.error("[Rail4] Failed to record order after approval:", err);
  });

  console.log(`[Approvals] Rail 4 approved: confirmation ${confirmationId}`);
}

async function fulfillRail4Denial(approval: UnifiedApproval) {
  const confirmationId = approval.railRef;
  await storage.updateCheckoutConfirmationStatus(confirmationId, "denied");

  const conf = await storage.getCheckoutConfirmation(confirmationId);
  if (conf) {
    const bot = await storage.getBotByBotId(conf.botId);
    if (bot) {
      const { fireWebhook } = await import("@/lib/webhooks");
      fireWebhook(bot, "rail4.checkout.denied" as any, {
        confirmation_id: confirmationId,
        amount_usd: conf.amountCents / 100,
        merchant: conf.merchantName,
        item: conf.itemName,
      }).catch(() => {});
    }
  }

  console.log(`[Approvals] Rail 4 denied: confirmation ${confirmationId}`);
}

registerRailCallbacks("rail4", {
  onApprove: fulfillRail4Approval,
  onDeny: fulfillRail4Denial,
});
