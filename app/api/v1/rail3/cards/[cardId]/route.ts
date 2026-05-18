import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { fireRailsUpdated } from "@/features/agent-interaction/webhooks";
import { revokeOrderIntent, ownerUidToUserLocator } from "@/features/payment-rails/rail3";
import { z } from "zod";

// bot_id intentionally NOT patchable: Crossmint OrderIntent.agentId is immutable
// after creation and the Crossmint agent is bound 1:1 to a bot. Re-linking would
// strand the card on the wrong agent. Move a card to another bot by deleting and
// recreating it.
const patchSchema = z.object({
  card_name: z.string().min(1).max(200).optional(),
  card_color: z.enum(["purple", "dark", "blue", "primary"]).optional(),
  category: z.string().max(100).nullable().optional(),
  status: z.enum(["active", "frozen"]).optional(),
});

async function serializeCard(c: NonNullable<Awaited<ReturnType<typeof storage.getRail3CardByCardId>>>) {
  const pm = await storage.getRail3PaymentMethodById(c.paymentMethodId);
  return {
    card_id: c.cardId,
    card_name: c.cardName,
    card_color: c.cardColor || null,
    category: c.category || null,
    status: c.status,
    bot_id: c.botId || null,
    payment_method_id: c.paymentMethodId,
    card_brand: pm?.cardBrand || null,
    card_last4: pm?.cardLast4 || null,
    cardholder_name: pm?.cardholderName || null,
    exp_month: pm?.expMonth || null,
    exp_year: pm?.expYear || null,
    intent_mode: c.intentMode,
    permission_phase: c.permissionPhase,
    order_intent_id: c.orderIntentId,
    mandates: c.mandates,
    limit_amount_cents: c.limitAmountCents,
    limit_period: c.limitPeriod,
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
    ...(await serializeCard(card)),
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
  if (parsed.data.card_color !== undefined) updates.cardColor = parsed.data.card_color;
  if (parsed.data.category !== undefined) updates.category = parsed.data.category;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no_updates" }, { status: 400 });
  }

  const updated = await storage.updateRail3Card(cardId, updates);

  if (parsed.data.status !== undefined && updated?.botId) {
    const bot = await storage.getBotByBotId(updated.botId);
    if (bot) {
      const action = parsed.data.status === "frozen" ? "card_frozen" as const : "card_unfrozen" as const;
      fireRailsUpdated(bot, action, "rail3", { card_id: cardId }).catch(() => {});
    }
  }

  return NextResponse.json(updated ? await serializeCard(updated) : null);
}

// Delete one virtual card: revoke its orderIntent. Does NOT delete the underlying
// payment method (other virtual cards may share it).
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

  await revokeOrderIntent({
    userLocator: ownerUidToUserLocator(user.uid),
    orderIntentId: card.orderIntentId,
  }).catch(() => {});
  await storage.deleteRail3Card(cardId);

  if (card.botId) {
    const bot = await storage.getBotByBotId(card.botId);
    if (bot) fireRailsUpdated(bot, "card_removed", "rail3", { card_id: cardId }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
