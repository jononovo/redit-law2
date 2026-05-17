import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { generateRail3CardId } from "@/features/payment-rails/rail3";
import { rail3SaveCallbackSchema } from "@/shared/schema";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cards = await storage.getRail3CardsByOwnerUid(user.uid);

  const botIds = [...new Set(cards.map((c) => c.botId).filter(Boolean))] as string[];
  const botLookup: Record<string, string> = {};
  await Promise.all(
    botIds.map(async (botId) => {
      const bot = await storage.getBotByBotId(botId);
      if (bot) botLookup[botId] = bot.botName;
    })
  );

  const result = cards.map((c) => ({
    card_id: c.cardId,
    card_name: c.cardName,
    card_brand: c.cardBrand,
    card_last4: c.cardLast4,
    status: c.status,
    verification_status: c.verificationStatus,
    bot_id: c.botId || null,
    bot_name: c.botId ? (botLookup[c.botId] || null) : null,
    card_color: c.cardColor || null,
    default_intent_mode: c.defaultIntentMode,
    default_permission_phase: c.defaultPermissionPhase,
    limit_amount_cents: c.limitAmountCents,
    limit_period: c.limitPeriod,
    created_at: c.createdAt.toISOString(),
  }));

  return NextResponse.json({ cards: result });
}

// Called from the setup wizard after Crossmint's CrossmintPaymentMethodManagement iframe
// emits onPaymentMethodSelected. Persists the payment method + agentId; verification follows.
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = rail3SaveCallbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await storage.getRail3CardByPaymentMethodId(parsed.data.payment_method_id);
  if (existing) {
    return NextResponse.json({
      card_id: existing.cardId,
      already_saved: true,
    });
  }

  const cardId = generateRail3CardId();
  const card = await storage.createRail3Card({
    cardId,
    ownerUid: user.uid,
    paymentMethodId: parsed.data.payment_method_id,
    agentId: parsed.data.agent_id,
    cardName: parsed.data.card_name || `${(parsed.data.card_brand || "card").toUpperCase()} ${parsed.data.card_last4 ? "•••• " + parsed.data.card_last4 : ""}`.trim(),
    cardholderName: parsed.data.cardholder_name,
    cardLast4: parsed.data.card_last4,
    cardBrand: parsed.data.card_brand,
    expMonth: parsed.data.exp_month,
    expYear: parsed.data.exp_year,
    verificationStatus: "pending",
    status: "active",
  });

  return NextResponse.json({
    card_id: card.cardId,
    verification_status: card.verificationStatus,
  });
}
