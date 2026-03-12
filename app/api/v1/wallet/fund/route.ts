import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { chargeCustomer } from "@/lib/stripe";
import { fundWalletRequestSchema } from "@/shared/schema";
import { storage } from "@/server/storage";
import { fireWebhook } from "@/lib/webhooks";
import { notifyTopupCompleted } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = fundWalletRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid amount. Must be between $1.00 and $1,000.00.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { amount_cents, payment_method_id } = parsed.data;

    const wallet = await storage.getWalletByOwnerUid(user.uid);
    if (!wallet) {
      return NextResponse.json(
        { error: "No wallet found. Please claim a bot first." },
        { status: 404 }
      );
    }

    let pm;
    if (payment_method_id) {
      pm = await storage.getPaymentMethodById(payment_method_id, user.uid);
      if (!pm) {
        return NextResponse.json(
          { error: "Selected payment method not found." },
          { status: 404 }
        );
      }
    } else {
      pm = await storage.getPaymentMethod(user.uid);
    }
    if (!pm) {
      return NextResponse.json(
        { error: "No payment method on file. Please add a card first." },
        { status: 400 }
      );
    }

    const amountDollars = (amount_cents / 100).toFixed(2);
    const paymentIntent = await chargeCustomer(
      pm.stripeCustomerId,
      pm.stripePmId,
      amount_cents,
      `CreditClaw wallet top-up: $${amountDollars}`,
    );

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment failed. Please check your card and try again." },
        { status: 402 }
      );
    }

    const updatedWallet = await storage.creditWallet(wallet.id, amount_cents);

    await storage.createTransaction({
      walletId: wallet.id,
      type: "topup",
      amountCents: amount_cents,
      stripePaymentIntentId: paymentIntent.id,
      description: `Manual top-up: $${amountDollars}`,
      balanceAfter: updatedWallet.balanceCents,
    });

    const bot = await storage.getBotByBotId(wallet.botId);
    if (bot) {
      fireWebhook(bot, "wallet.topup.completed", {
        amount_usd: Number(amountDollars),
        new_balance_usd: updatedWallet.balanceCents / 100,
        funded_by: "owner",
      }).catch((err) => console.error("Webhook fire failed:", err));

      notifyTopupCompleted(user.uid, user.email || bot.ownerEmail, bot.botName, bot.botId, amount_cents, updatedWallet.balanceCents).catch(() => {});
    }

    return NextResponse.json({
      balance_cents: updatedWallet.balanceCents,
      balance: `$${(updatedWallet.balanceCents / 100).toFixed(2)}`,
      charged: `$${amountDollars}`,
      message: "Wallet funded successfully!",
    });
  } catch (error: any) {
    console.error("Fund wallet error:", error);

    if (error?.type === "StripeCardError") {
      return NextResponse.json(
        { error: error.message || "Your card was declined." },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
