import { stripe } from "@/lib/stripe";
import type { OnrampSessionResult } from "../types";

export async function createStripeOnrampSession(params: {
  walletAddress: string;
  userEmail?: string;
  customerIp?: string;
  amountUsd?: number;
  metadata?: Record<string, string>;
}): Promise<OnrampSessionResult> {
  const requestParams: Record<string, unknown> = {
    "wallet_addresses[ethereum]": params.walletAddress,
    lock_wallet_address: true,
    "destination_currencies[]": "usdc",
    destination_network: "base",
    destination_currency: "usdc",
  };

  if (params.customerIp) {
    requestParams.customer_ip_address = params.customerIp;
  }

  if (params.userEmail) {
    requestParams["customer_information[email]"] = params.userEmail;
  }

  if (params.amountUsd) {
    requestParams.destination_amount = String(params.amountUsd);
  }

  if (params.metadata) {
    for (const [key, value] of Object.entries(params.metadata)) {
      requestParams[`metadata[${key}]`] = value;
    }
  }

  console.log("[Stripe Onramp] Creating session with params:", {
    walletAddress: params.walletAddress,
    destinationNetwork: "base",
    destinationCurrency: "usdc",
    hasEmail: !!params.userEmail,
    hasIp: !!params.customerIp,
    amountUsd: params.amountUsd,
  });

  try {
    const response = await stripe.rawRequest("POST", "/v1/crypto/onramp_sessions", requestParams);

    const session = response as unknown as {
      id: string;
      status: string;
      client_secret: string;
      redirect_url?: string;
    };

    if (!session.id || !session.client_secret) {
      console.error("[Stripe Onramp] Session response missing required fields:", {
        hasId: !!session.id,
        hasClientSecret: !!session.client_secret,
      });
      throw new Error("Stripe onramp session response missing required fields");
    }

    console.log("[Stripe Onramp] Session created successfully:", {
      sessionId: session.id,
      status: session.status,
      hasClientSecret: !!session.client_secret,
      hasRedirectUrl: !!session.redirect_url,
    });

    return {
      provider: "stripe" as const,
      clientSecret: session.client_secret,
      sessionId: session.id,
      redirectUrl: session.redirect_url || null,
    };
  } catch (err: unknown) {
    const stripeError = err as { type?: string; code?: string; message?: string; statusCode?: number; param?: string };
    console.error("[Stripe Onramp] Session creation FAILED:", {
      statusCode: stripeError.statusCode,
      errorCode: stripeError.code,
      errorType: stripeError.type,
      errorMessage: stripeError.message,
      errorParam: stripeError.param,
    });
    throw new Error(stripeError.message || "Failed to create onramp session");
  }
}
