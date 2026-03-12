import { NextRequest, NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";

export const GET = withBotApi("/api/v1/bot/merchant/checkout/status", async (request, { bot }) => {
  const confirmationId = request.nextUrl.searchParams.get("confirmation_id");
  if (!confirmationId) {
    return NextResponse.json({ error: "missing_confirmation_id" }, { status: 400 });
  }

  const conf = await storage.getCheckoutConfirmation(confirmationId);
  if (!conf || conf.botId !== bot.botId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (conf.status === "pending" && conf.expiresAt && new Date() > conf.expiresAt) {
    await storage.updateCheckoutConfirmationStatus(confirmationId, "expired");
    return NextResponse.json({
      confirmation_id: confirmationId,
      status: "expired",
      message: "This approval request has expired.",
    });
  }

  const response: Record<string, unknown> = {
    confirmation_id: confirmationId,
    status: conf.status,
    amount_usd: conf.amountCents / 100,
    merchant_name: conf.merchantName,
    item_name: conf.itemName,
  };

  if (conf.status === "approved") {
    const card = await storage.getRail4CardByCardId(conf.cardId);
    if (card) {
      response.missing_digits = card.missingDigitsValue;
      response.expiry_month = card.expiryMonth;
      response.expiry_year = card.expiryYear;
    }
    response.message = "Purchase approved. Use the provided card details to complete checkout.";
  } else if (conf.status === "denied") {
    response.message = "Purchase was denied by the owner.";
  } else if (conf.status === "pending") {
    response.message = "Waiting for owner approval.";
  }

  return NextResponse.json(response);
});
