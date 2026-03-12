import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";

export const GET = withBotApi("/api/v1/bot/rail5/checkout/status", async (request, { bot }) => {
  const checkoutId = request.nextUrl.searchParams.get("checkout_id");
  if (!checkoutId) {
    return NextResponse.json(
      { error: "missing_param", message: "checkout_id query parameter is required." },
      { status: 400 }
    );
  }

  const checkout = await storage.getRail5CheckoutById(checkoutId);
  if (!checkout) {
    return NextResponse.json(
      { error: "not_found", message: "Checkout not found." },
      { status: 404 }
    );
  }

  if (checkout.botId !== bot.botId) {
    return NextResponse.json(
      { error: "forbidden", message: "This checkout does not belong to your bot." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    checkout_id: checkout.checkoutId,
    status: checkout.status,
    merchant_name: checkout.merchantName,
    item_name: checkout.itemName,
    amount_cents: checkout.amountCents,
    key_delivered: checkout.keyDelivered,
    confirmed_at: checkout.confirmedAt?.toISOString() || null,
    created_at: checkout.createdAt.toISOString(),
  });
});
