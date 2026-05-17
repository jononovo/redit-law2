import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { fireRailsUpdated } from "@/features/agent-interaction/webhooks";
import { deletePaymentMethod, revokeOrderIntent } from "@/features/payment-rails/rail3";
import { z } from "zod";

const patchSchema = z.object({
  card_name: z.string().min(1).max(200).optional(),
  bot_id: z.string().min(1).max(200).nullable().optional(),
  card_color: z.enum(["purple", "dark", "blue", "primary"]).optional(),
  status: z.enum(["active", "frozen"]).optional(),
});

function serializeCard(c: Awaited<ReturnType<typeof storage.getRail3CardByCardId>>) {
  if (!c) return null;
  return {
    card_id: c.cardId,
    card_name: c.cardName,
    card_brand: c.cardBrand,
    card_last4: c.cardLast4,
    status: c.status,
    verification_status: c.verificationStatus,
    bot_id: c.botId || null,
    card_color: c.cardColor || null,
    cardholder_name: c.cardholderName,
    exp_month: c.expMonth,
    exp_year: c.expYear,
    default_intent_mode: c.defaultIntentMode,
    default_permission_phase: c.defaultPermissionPhase,
    default_order_intent_id: c.defaultOrderIntentId,
    default_mandates: c.defaultMandates,
    limit_amount_cents: c.limitAmountCents,
    limit_period: c.limitPeriod,
    payment_method_id: c.paymentMethodId,
    agent_id: c.agentId,
    created_at: c.createdAt.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { cardId } = await params;
  const card = await storage.getRail3CardByCardId(cardId);
  if (!card) return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  if (card.ownerUid !== user.uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const transactions = await storage.getRail3TransactionsByCardId(cardId, 50);

  return NextResponse.json({
    ...serializeCard(card),
    transactions: transactions.map((t) => ({
      transaction_id: t.transactionId,
      merchant_name: t.merchantName,
      merchant_url: t.merchantUrl,
      amount_cents: t.amountCents,
      status: t.status,
      credential_issued_at: t.credentialIssuedAt.toISOString(),
      settled_at: t.settledAt?.toISOString() || null,
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { cardId } = await params;
  const card = await storage.getRail3CardByCardId(cardId);
  if (!card) return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  if (card.ownerUid !== user.uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.card_name !== undefined) updates.cardName = parsed.data.card_name;
  if (parsed.data.bot_id !== undefined) updates.botId = parsed.data.bot_id;
  if (parsed.data.card_color !== undefined) updates.cardColor = parsed.data.card_color;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no_updates" }, { status: 400 });
  }

  const updated = await storage.updateRail3Card(cardId, updates);

  if (parsed.data.bot_id !== undefined) {
    const targetBotId = parsed.data.bot_id || card.botId;
    if (targetBotId) {
      const bot = await storage.getBotByBotId(targetBotId);
      if (bot) {
        const action = parsed.data.bot_id ? "card_linked" as const : "card_removed" as const;
        fireRailsUpdated(bot, action, "rail3", { card_id: cardId }).catch(() => {});
      }
    }
  }

  if (parsed.data.status !== undefined && updated?.botId) {
    const bot = await storage.getBotByBotId(updated.botId);
    if (bot) {
      const action = parsed.data.status === "frozen" ? "card_frozen" as const : "card_unfrozen" as const;
      fireRailsUpdated(bot, action, "rail3", { card_id: cardId }).catch(() => {});
    }
  }

  return NextResponse.json(serializeCard(updated));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { cardId } = await params;
  const card = await storage.getRail3CardByCardId(cardId);
  if (!card) return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  if (card.ownerUid !== user.uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (card.defaultOrderIntentId) {
    await revokeOrderIntent(card.defaultOrderIntentId).catch(() => {});
  }
  await deletePaymentMethod(card.paymentMethodId).catch(() => {});

  await storage.deleteRail3Card(cardId);

  if (card.botId) {
    const bot = await storage.getBotByBotId(card.botId);
    if (bot) fireRailsUpdated(bot, "card_removed", "rail3", { card_id: cardId }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
