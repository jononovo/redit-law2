import { storage } from "@/server/storage";
import type { Order } from "@/shared/schema";
import type { OrderInput } from "./types";

export async function recordOrder(input: OrderInput): Promise<Order> {
  const order = await storage.createOrder({
    ownerUid: input.ownerUid,
    rail: input.rail,
    botId: input.botId ?? null,
    botName: input.botName ?? null,
    walletId: input.walletId ?? null,
    cardId: input.cardId ?? null,
    transactionId: input.transactionId ?? null,
    externalOrderId: input.externalOrderId ?? null,
    status: input.status ?? "pending",
    vendor: input.vendor ?? null,
    vendorId: input.vendorId ?? null,
    vendorDetails: input.vendorDetails ?? null,
    productName: input.productName ?? null,
    productImageUrl: input.productImageUrl ?? null,
    productUrl: input.productUrl ?? null,
    productShortDescription: input.productShortDescription ?? null,
    sku: input.sku ?? null,
    quantity: input.quantity ?? 1,
    priceCents: input.priceCents ?? null,
    priceCurrency: input.priceCurrency ?? "USD",
    taxesCents: input.taxesCents ?? null,
    shippingPriceCents: input.shippingPriceCents ?? null,
    shippingType: input.shippingType ?? null,
    shippingNote: input.shippingNote ?? null,
    shippingAddress: input.shippingAddress ?? null,
    trackingInfo: input.trackingInfo ?? null,
    metadata: input.metadata ?? null,
  });

  console.log(`[orders] Created order #${order.id} for ${input.rail} owner=${input.ownerUid} vendor=${input.vendor ?? "unknown"}`);
  return order;
}
