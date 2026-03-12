import { registerRailCallbacks } from "@/lib/approvals/service";
import { storage } from "@/server/storage";
import type { UnifiedApproval } from "@/shared/schema";

async function fulfillRail5Approval(approval: UnifiedApproval): Promise<void> {
  const checkoutId = approval.railRef;
  await storage.updateRail5Checkout(checkoutId, { status: "approved", confirmedAt: new Date() });

  const checkout = await storage.getRail5CheckoutById(checkoutId);
  if (checkout) {
    const bot = await storage.getBotByBotId(checkout.botId);
    if (bot) {
      const { fireWebhook } = await import("@/lib/webhooks");
      fireWebhook(bot, "rail5.checkout.completed" as any, {
        checkout_id: checkoutId,
        status: "approved",
        merchant: checkout.merchantName,
        item: checkout.itemName,
        amount_cents: checkout.amountCents,
        message: "Owner approved. Proceed with key retrieval.",
      }).catch(() => {});
    }
  }

  const { recordOrder } = await import("@/lib/orders/create");
  if (checkout) {
    recordOrder({
      ownerUid: approval.ownerUid,
      rail: "rail5",
      botId: checkout.botId,
      cardId: checkout.cardId,
      status: "completed",
      vendor: checkout.merchantName,
      vendorDetails: { url: checkout.merchantUrl, category: checkout.category || undefined },
      productName: checkout.itemName,
      priceCents: checkout.amountCents,
      priceCurrency: "USD",
      metadata: { checkoutId, approvalId: approval.id },
    }).catch((err) => {
      console.error("[Rail5] Failed to record order after approval:", err);
    });
  }

  console.log(`[Approvals] Rail 5 approved: checkout ${checkoutId}`);
}

async function fulfillRail5Denial(approval: UnifiedApproval): Promise<void> {
  const checkoutId = approval.railRef;
  await storage.updateRail5Checkout(checkoutId, { status: "denied", confirmedAt: new Date() });

  const checkout = await storage.getRail5CheckoutById(checkoutId);
  if (checkout) {
    const bot = await storage.getBotByBotId(checkout.botId);
    if (bot) {
      const { fireWebhook } = await import("@/lib/webhooks");
      fireWebhook(bot, "rail5.checkout.failed" as any, {
        checkout_id: checkoutId,
        status: "denied",
        merchant: checkout.merchantName,
        item: checkout.itemName,
        amount_cents: checkout.amountCents,
        reason: "Owner denied the purchase",
      }).catch(() => {});
    }
  }

  console.log(`[Approvals] Rail 5 denied: checkout ${checkoutId}`);
}

registerRailCallbacks("rail5", {
  onApprove: fulfillRail5Approval,
  onDeny: fulfillRail5Denial,
});
