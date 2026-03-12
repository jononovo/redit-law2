import { crossmintFetch } from "@/lib/rail2/client";
import type { ShippingAddress, PurchaseResult } from "../types";

export type { ShippingAddress, PurchaseResult };

export async function createPurchaseOrder(params: {
  merchant: string;
  productId: string;
  walletAddress: string;
  ownerEmail: string;
  shippingAddress: ShippingAddress;
  quantity?: number;
}): Promise<PurchaseResult> {
  const productLocator = `${params.merchant}:${params.productId}`;

  const lineItems = [];
  const qty = params.quantity || 1;
  for (let i = 0; i < qty; i++) {
    lineItems.push({ productLocator });
  }

  const body = {
    lineItems,
    payment: {
      method: "crypto",
      currency: "usdc",
      payerAddress: params.walletAddress,
    },
    recipient: {
      email: params.ownerEmail,
      physicalAddress: {
        name: params.shippingAddress.name,
        line1: params.shippingAddress.line1,
        ...(params.shippingAddress.line2 ? { line2: params.shippingAddress.line2 } : {}),
        city: params.shippingAddress.city,
        state: params.shippingAddress.state,
        postalCode: params.shippingAddress.postalCode,
        country: params.shippingAddress.country,
      },
    },
  };

  console.log("[Procurement] Creating order:", {
    provider: "crossmint-worldstore",
    productLocator,
    walletAddress: params.walletAddress,
    quantity: qty,
  });

  const response = await crossmintFetch("/orders", {
    method: "POST",
    body: JSON.stringify(body),
  }, "orders");

  const data = await response.json();

  if (!response.ok) {
    console.error("[Procurement] Order creation failed:", data);
    throw new Error(data.message || data.error || "Failed to create purchase order");
  }

  console.log("[Procurement] Order created:", {
    orderId: data.order?.orderId || data.orderId,
  });

  const orderData = data.order || data;
  let pricing: PurchaseResult["pricing"];
  try {
    const quote = orderData?.quote || orderData?.payment;
    if (quote) {
      const totalUsd = quote.totalPrice?.amount ? parseFloat(quote.totalPrice.amount) : undefined;
      const shippingUsd = quote.shipping?.amount ? parseFloat(quote.shipping.amount) : undefined;
      const taxUsd = quote.tax?.amount ? parseFloat(quote.tax.amount) : undefined;
      const subtotalUsd = quote.subtotal?.amount ? parseFloat(quote.subtotal.amount) : undefined;
      pricing = {
        subtotalCents: subtotalUsd != null ? Math.round(subtotalUsd * 100) : undefined,
        shippingCents: shippingUsd != null ? Math.round(shippingUsd * 100) : undefined,
        taxCents: taxUsd != null ? Math.round(taxUsd * 100) : undefined,
        totalCents: totalUsd != null ? Math.round(totalUsd * 100) : undefined,
      };
    }
  } catch {
  }

  return {
    orderId: data.order?.orderId || data.orderId,
    order: orderData,
    pricing,
  };
}

export async function getOrderStatus(orderId: string): Promise<Record<string, unknown>> {
  const response = await crossmintFetch(`/orders/${orderId}`, {}, "orders");

  const data = await response.json();

  if (!response.ok) {
    console.error("[Procurement] Order status query failed:", data);
    throw new Error(data.message || "Failed to query order status");
  }

  return data;
}
