import { crossmintFetch, USDC_CONTRACT_ADDRESS } from "@/lib/rail2/client";

export async function createOnrampOrder(params: {
  walletAddress: string;
  ownerEmail: string;
  amountUsd?: number;
}): Promise<{
  orderId: string;
  clientSecret: string;
  order: Record<string, unknown>;
}> {
  const lineItems = [{
    tokenLocator: `base:${USDC_CONTRACT_ADDRESS}`,
    executionParameters: {
      mode: "exact-in" as const,
      ...(params.amountUsd ? { amount: String(params.amountUsd) } : {}),
    },
  }];

  const body = {
    lineItems,
    payment: {
      method: "checkoutcom-flow",
      receiptEmail: params.ownerEmail,
    },
    recipient: {
      walletAddress: params.walletAddress,
    },
  };

  console.log("[CrossMint Onramp] Creating order:", {
    walletAddress: params.walletAddress,
    hasEmail: !!params.ownerEmail,
    amountUsd: params.amountUsd,
  });

  const response = await crossmintFetch("/orders", {
    method: "POST",
    body: JSON.stringify(body),
  }, "orders");

  const data = await response.json();

  if (!response.ok) {
    console.error("[CrossMint Onramp] Order creation failed:", data);
    throw new Error(data.message || data.error || "Failed to create onramp order");
  }

  console.log("[CrossMint Onramp] Order created:", {
    orderId: data.order?.orderId,
    hasClientSecret: !!data.clientSecret,
  });

  return {
    orderId: data.order?.orderId || data.orderId,
    clientSecret: data.clientSecret,
    order: data.order || data,
  };
}
