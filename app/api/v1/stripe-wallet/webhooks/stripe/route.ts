import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { parseStripeOnrampEvent, handleStripeOnrampFulfillment } from "@/lib/crypto-onramp/stripe-onramp/webhook";

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET_ONRAMP || "";

export async function POST(request: NextRequest) {
  console.log("[Onramp Webhook] Received POST request");
  console.log("[Onramp Webhook] Secret configured:", !!STRIPE_WEBHOOK_SECRET);

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    console.log("[Onramp Webhook] Has signature:", !!signature);
    console.log("[Onramp Webhook] Body length:", body.length);

    if (!signature || !STRIPE_WEBHOOK_SECRET) {
      console.error("[Onramp Webhook] Missing signature or secret", {
        hasSignature: !!signature,
        hasSecret: !!STRIPE_WEBHOOK_SECRET,
      });
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("[Onramp Webhook] Signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log("[Onramp Webhook] Event verified:", event.type);

    if ((event.type as string) === "crypto.onramp_session.updated") {
      const session = event.data.object as any;
      console.log("[Onramp Webhook] Session status:", session.status);
      console.log("[Onramp Webhook] Session ID:", session.id);

      if (session.status === "fulfillment_complete") {
        const onrampEvent = parseStripeOnrampEvent(session);

        if (onrampEvent) {
          console.log("[Onramp Webhook] Fulfillment complete:", {
            walletAddress: onrampEvent.walletAddress,
            amountUsdc: onrampEvent.amountUsdc,
          });

          await handleStripeOnrampFulfillment(onrampEvent);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Onramp Webhook] Unhandled error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
