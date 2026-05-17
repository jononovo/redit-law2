import { NextResponse } from "next/server";
import { withBotApi } from "@/features/platform-management/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { recordOrder } from "@/features/agent-interaction/orders/create";
import { fireRailsUpdated } from "@/features/agent-interaction/webhooks";
import { z } from "zod";

const confirmSchema = z.object({
  transaction_id: z.string().min(1),
  amount_cents: z.number().int().min(1),
  currency: z.string().length(3).default("usd"),
  item_name: z.string().min(1).max(500).optional(),
});

export const POST = withBotApi("/api/v1/bot/rail3/confirm", async (request, { bot }) => {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const tx = await storage.getRail3TransactionById(parsed.data.transaction_id);
  if (!tx) return NextResponse.json({ error: "transaction_not_found" }, { status: 404 });
  if (tx.botId !== bot.botId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const updated = await storage.updateRail3Transaction(tx.transactionId, {
    status: "charged",
    amountCents: parsed.data.amount_cents,
    currency: parsed.data.currency,
    settledAt: new Date(),
  });

  recordOrder({
    ownerUid: tx.ownerUid,
    rail: "rail3",
    botId: bot.botId,
    botName: bot.botName,
    cardId: tx.cardId,
    status: "completed",
    vendor: tx.merchantName,
    vendorDetails: { url: tx.merchantUrl || undefined },
    productName: parsed.data.item_name || tx.merchantName,
    priceCents: parsed.data.amount_cents,
    priceCurrency: parsed.data.currency.toUpperCase(),
    metadata: { transactionId: tx.transactionId },
  }).catch((err) => console.error("[Rail3] recordOrder failed:", err));

  fireRailsUpdated(bot, "card_charged" as any, "rail3", {
    card_id: tx.cardId,
    transaction_id: tx.transactionId,
    amount_cents: parsed.data.amount_cents,
  }).catch(() => {});

  return NextResponse.json({
    transaction_id: tx.transactionId,
    status: updated?.status,
    amount_cents: updated?.amountCents,
    settled_at: updated?.settledAt?.toISOString(),
  });
});
