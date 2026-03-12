const EXPIRY_HOURS: Record<string, number> = {
  "rail5.card.delivered": 24,
  "purchase.approved": 24,
  "purchase.rejected": 24,
  "purchase.expired": 24,
  "wallet.activated": 168,
  "wallet.topup.completed": 168,
  "wallet.spend.authorized": 168,
  "wallet.spend.declined": 168,
  "wallet.balance.low": 168,
  "wallet.payment.received": 168,
  "wallet.sale.completed": 168,
  "rail5.checkout.completed": 168,
  "rail5.checkout.failed": 168,
  "rails.updated": 168,
  "order.shipped": 168,
  "order.delivered": 168,
  "order.failed": 168,
};

const DEFAULT_EXPIRY_HOURS = 168;

export function getExpiryForEvent(eventType: string, overrideHours?: number): Date {
  const hours = overrideHours ?? EXPIRY_HOURS[eventType] ?? DEFAULT_EXPIRY_HOURS;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
