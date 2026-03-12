import { NextRequest, NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { stripe } from "@/lib/stripe";
import { createPaymentLinkSchema } from "@/shared/schema";
import { randomBytes } from "crypto";

function generatePaymentLinkId(): string {
  return `pl_${randomBytes(4).toString("hex")}`;
}

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get("host") || "localhost:5000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

export const POST = withBotApi("/api/v1/bot/payments/create-link", async (request, { bot }) => {
  const wallet = await storage.getWalletByBotId(bot.botId);
  if (!wallet || bot.walletStatus !== "active") {
    return NextResponse.json(
      { error: "wallet_not_active", message: "Bot wallet is not active." },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = createPaymentLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", message: parsed.error.issues[0]?.message || "Invalid request body." },
      { status: 400 }
    );
  }

  const { amount_usd, description, payer_email } = parsed.data;
  const amountCents = Math.round(amount_usd * 100);
  const paymentLinkId = generatePaymentLinkId();
  const baseUrl = getBaseUrl(request);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const session = await stripe.checkout.sessions.create({
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: `Payment to ${bot.botName}`,
          description,
        },
        unit_amount: amountCents,
      },
      quantity: 1,
    }],
    mode: "payment",
    customer_email: payer_email || undefined,
    metadata: {
      payment_link_id: paymentLinkId,
      bot_id: bot.botId,
      purpose: "bot_payment_link",
    },
    success_url: `${baseUrl}/payment/success?pl=${paymentLinkId}`,
    cancel_url: `${baseUrl}/payment/cancelled?pl=${paymentLinkId}`,
    expires_at: Math.floor(expiresAt.getTime() / 1000),
  });

  await storage.createPaymentLink({
    paymentLinkId,
    botId: bot.botId,
    amountCents,
    description,
    payerEmail: payer_email || null,
    stripeCheckoutSessionId: session.id,
    checkoutUrl: session.url || "",
    status: "pending",
    expiresAt,
  });

  return NextResponse.json({
    payment_link_id: paymentLinkId,
    checkout_url: session.url,
    amount_usd,
    status: "pending",
    expires_at: expiresAt.toISOString(),
  }, { status: 201 });
});
