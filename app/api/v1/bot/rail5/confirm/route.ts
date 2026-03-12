import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { rail5ConfirmSchema } from "@/shared/schema";
import { fireWebhook } from "@/lib/webhooks";
import { notifyPurchase, notifyBalanceLow } from "@/lib/notifications";

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

  const checkout = await storage.getRail5CheckoutById(checkout_id);
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
    await storage.updateRail5Checkout(checkout_id, {
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

  const wallet = await storage.getWalletByBotId(bot.botId);
  if (!wallet) {
    return NextResponse.json(
      { error: "wallet_not_found", message: "No wallet found for this bot." },
      { status: 404 }
    );
  }

  const updated = await storage.debitWallet(wallet.id, checkout.amountCents);
  if (!updated) {
    await storage.updateRail5Checkout(checkout_id, {
      status: "failed",
      confirmedAt: new Date(),
    });
    return NextResponse.json(
      { error: "insufficient_balance", message: "Wallet balance too low to complete this checkout." },
      { status: 409 }
    );
  }

  await storage.updateRail5Checkout(checkout_id, {
    status: "completed",
    confirmedAt: new Date(),
  });

  await storage.createTransaction({
    walletId: wallet.id,
    type: "purchase",
    amountCents: checkout.amountCents,
    description: `Rail 5: ${checkout.itemName} at ${checkout.merchantName}`,
    balanceAfter: updated.balanceCents,
  });

  const rail5Card = await storage.getRail5CardByBotId(bot.botId);
  if (rail5Card && rail5Card.status === "confirmed") {
    await storage.updateRail5Card(rail5Card.cardId, { status: "active" });
  }

  const newBalance = updated.balanceCents;

  fireWebhook(bot, "rail5.checkout.completed", {
    checkout_id,
    merchant: checkout.merchantName,
    item: checkout.itemName,
    amount_cents: checkout.amountCents,
    new_balance_cents: newBalance,
  }).catch(() => {});

  if (bot.ownerUid) {
    notifyPurchase(
      bot.ownerUid,
      bot.ownerEmail,
      bot.botName,
      bot.botId,
      checkout.amountCents,
      checkout.merchantName,
      newBalance,
    ).catch(() => {});

    const LOW_BALANCE_THRESHOLD_CENTS = 500;
    if (newBalance < LOW_BALANCE_THRESHOLD_CENTS && newBalance + checkout.amountCents >= LOW_BALANCE_THRESHOLD_CENTS) {
      fireWebhook(bot, "wallet.balance.low", {
        balance_usd: newBalance / 100,
        threshold_usd: LOW_BALANCE_THRESHOLD_CENTS / 100,
      }).catch(() => {});
      notifyBalanceLow(bot.ownerUid, bot.ownerEmail, bot.botName, bot.botId, newBalance).catch(() => {});
    }
  }

  return NextResponse.json({
    status: "completed",
    checkout_id,
    message: `Checkout completed. $${(checkout.amountCents / 100).toFixed(2)} debited.`,
  });
});
