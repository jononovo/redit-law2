import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { fireRailsUpdated } from "@/features/agent-interaction/webhooks";
import { revokeOrderIntent } from "@/features/payment-rails/rail3";
import { extractBearerJwt } from "@/features/platform-management/auth/extract-bearer-jwt";
import { z } from "zod";
import { lookupIssuer } from "@/features/payment-rails/card/bin-lookup";

// bot_id is the only mutable link to a bot. Crossmint OrderIntent.agentId is
// immutable after creation, but the agent is owner-scoped (one per owner), so
// re-pointing a card to a different bot of the same owner is just a DB relabel
// and is safe. Not exposed here yet — separate PATCH endpoint planned.
const patchSchema = z.object({
  card_name: z.string().min(1).max(200).optional(),
  card_color: z.enum(["purple", "dark", "blue", "primary", "emerald"]).optional(),
  category: z.string().max(100).nullable().optional(),
  is_frozen: z.boolean().optional(),
});

async function serializeCard(c: NonNullable<Awaited<ReturnType<typeof storage.getRail3CardByCardId>>>) {
  const pm = await storage.getRail3PaymentMethodById(c.paymentMethodId);
  return {
    card_id: c.cardId,
    card_name: c.cardName,
    card_color: c.cardColor || null,
    category: c.category || null,
    status: c.status,
    is_frozen: c.isFrozen,
    bot_id: c.botId || null,
    payment_method_id: c.paymentMethodId,
    card_brand: pm?.cardBrand || null,
    card_last4: pm?.cardLast4 || null,
    issuer_name: pm?.cardFirst6 ? (lookupIssuer(pm.cardFirst6) || null) : null,
    cardholder_name: pm?.cardholderName || null,
    exp_month: pm?.expMonth || null,
    exp_year: pm?.expYear || null,
    intent_mode: c.intentMode,
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
  if (parsed.data.is_frozen !== undefined) updates.isFrozen = parsed.data.is_frozen;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no_updates" }, { status: 400 });
  }

  const updated = await storage.updateRail3Card(cardId, updates);

  if (parsed.data.is_frozen !== undefined && updated?.botId) {
    const bot = await storage.getBotByBotId(updated.botId);
    if (bot) {
      const action = parsed.data.is_frozen ? "card_frozen" as const : "card_unfrozen" as const;
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

  const jwt = extractBearerJwt(request);
  if (!jwt) {
    return NextResponse.json(
      { error: "bearer_required", message: "Firebase ID token required in Authorization header to revoke a Crossmint card." },
      { status: 401 }
    );
  }
  await revokeOrderIntent({
    jwt,
    orderIntentId: card.orderIntentId,
  }).catch(() => {});
  await storage.deleteRail3Card(cardId);

  if (card.botId) {
    const bot = await storage.getBotByBotId(card.botId);
    if (bot) fireRailsUpdated(bot, "card_removed", "rail3", { card_id: cardId }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
