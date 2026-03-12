import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { storage } from "@/server/storage";
import { fireWebhook } from "@/lib/webhooks";
import { notifyPaymentReceived } from "@/lib/notifications";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err?.message);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const purpose = session.metadata?.purpose;

    if (purpose === "bot_payment_link") {
      try {
        await handlePaymentLinkCompleted(session);
      } catch (err: any) {
        console.error("Error handling payment link completion:", err?.message || err);
        return NextResponse.json({ error: "processing_error" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentLinkCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const paymentLinkId = session.metadata?.payment_link_id;
  if (!paymentLinkId) return;

  const paymentLink = await storage.getPaymentLinkByStripeSession(session.id);
  if (!paymentLink || paymentLink.status === "completed") return;

  const completed = await storage.completePaymentLink(paymentLink.id);
  if (!completed) return;

  const bot = await storage.getBotByBotId(paymentLink.botId);
  if (!bot) return;

  const wallet = await storage.getWalletByBotId(bot.botId);
  if (!wallet) return;

  const updatedWallet = await storage.creditWallet(wallet.id, paymentLink.amountCents);

  await storage.createTransaction({
    walletId: wallet.id,
    type: "payment_received",
    amountCents: paymentLink.amountCents,
    description: paymentLink.description,
    stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
    balanceAfter: updatedWallet.balanceCents,
  });

  await fireWebhook(bot, "wallet.payment.received", {
    payment_link_id: paymentLink.paymentLinkId,
    amount_usd: paymentLink.amountCents / 100,
    description: paymentLink.description,
    payer_email: paymentLink.payerEmail,
    new_balance_usd: updatedWallet.balanceCents / 100,
  });

  if (bot.ownerUid) {
    await notifyPaymentReceived(
      bot.ownerUid,
      bot.ownerEmail,
      bot.botName,
      bot.botId,
      paymentLink.amountCents,
      paymentLink.description,
    );
  }
}
