import { NextResponse } from "next/server";
import { withBotApi } from "@/features/platform-management/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { rail5ConfirmSchema } from "@/shared/schema";
import { fireWebhook } from "@/features/agent-interaction/webhooks";
import { notifyOwner } from "@/features/platform-management/notifications";

export const POST = withBotApi("/api/v1/bot/rail5/confirm", async (request, { bot }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = rail5ConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { checkout_id, status, merchant_name } = parsed.data;

  const checkout = await storage.getRail5TransactionById(checkout_id);
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

  if (!checkout.keyDelivered) {
    return NextResponse.json(
      { error: "key_not_delivered", message: "Cannot confirm before key delivery." },
      { status: 400 }
    );
  }

  if (checkout.confirmedAt) {
    return NextResponse.json(
      { error: "already_confirmed", message: "This checkout has already been confirmed." },
      { status: 409 }
    );
  }

  if (status === "failed") {
    await storage.updateRail5Transaction(checkout_id, {
      status: "failed",
      confirmedAt: new Date(),
    });

    fireWebhook(bot, "rail5.checkout.failed", {
      checkout_id,
      merchant: checkout.merchantName,
      item: checkout.itemName,
      amount_cents: checkout.amountCents,
      reason: "Sub-agent reported checkout failure",
    }).catch(() => {});

    return NextResponse.json({
      status: "failed",
      checkout_id,
      message: "Checkout marked as failed. No charges applied.",
    });
  }

  await storage.updateRail5Transaction(checkout_id, {
    status: "completed",
    confirmedAt: new Date(),
  });

  const rail5Card = await storage.getRail5CardByBotId(bot.botId);
  if (rail5Card && rail5Card.status === "confirmed") {
    await storage.updateRail5Card(rail5Card.cardId, { status: "active" });
  }

  fireWebhook(bot, "rail5.checkout.completed", {
    checkout_id,
    merchant: checkout.merchantName,
    item: checkout.itemName,
    amount_cents: checkout.amountCents,
  }).catch(() => {});

  if (bot.ownerUid) {
    notifyOwner({
      ownerUid: bot.ownerUid,
      ownerEmail: bot.ownerEmail,
      type: "purchase",
      title: `${bot.botName} spent $${(checkout.amountCents / 100).toFixed(2)}`,
      body: `${bot.botName} made a $${(checkout.amountCents / 100).toFixed(2)} purchase at ${checkout.merchantName} for "${checkout.itemName}".`,
      botId: bot.botId,
    }).catch(() => {});
  }

  return NextResponse.json({
    status: "completed",
    checkout_id,
    message: `Checkout completed. $${(checkout.amountCents / 100).toFixed(2)} charged.`,
  });
});
