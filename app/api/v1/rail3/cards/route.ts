import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import {
  generateRail3CardId, buildMandates, createOrderIntent, ownerUidToUserLocator,
  CrossmintApiError, type PermissionInput,
} from "@/features/payment-rails/rail3";
import { rail3CreateCardSchema } from "@/shared/schema";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [cards, paymentMethods] = await Promise.all([
    storage.getRail3CardsByOwnerUid(user.uid),
    storage.getRail3PaymentMethodsByOwnerUid(user.uid),
  ]);

  const pmLookup = new Map(paymentMethods.map((p) => [p.paymentMethodId, p]));
  const botIds = [...new Set(cards.map((c) => c.botId).filter(Boolean))] as string[];
  const botLookup: Record<string, string> = {};
  await Promise.all(
    botIds.map(async (botId) => {
      const bot = await storage.getBotByBotId(botId);
      if (bot) botLookup[botId] = bot.botName;
    })
  );

  const result = cards.map((c) => {
    const pm = pmLookup.get(c.paymentMethodId);
    return {
      card_id: c.cardId,
      card_name: c.cardName,
      card_color: c.cardColor || null,
      category: c.category || null,
      status: c.status,
      bot_id: c.botId || null,
      bot_name: c.botId ? (botLookup[c.botId] || null) : null,
      payment_method_id: c.paymentMethodId,
      card_brand: pm?.cardBrand || null,
      card_last4: pm?.cardLast4 || null,
      intent_mode: c.intentMode,
      permission_phase: c.permissionPhase,
      limit_amount_cents: c.limitAmountCents,
      limit_period: c.limitPeriod,
      order_intent_id: c.orderIntentId,
      created_at: c.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ cards: result });
}

// Create a new virtual card on top of an existing payment method.
// A "virtual card" here = one Crossmint orderIntent with mandates.
// Returns the FULL intent (including `verification_config`) so the AddCardDialog
// can immediately run the OrderIntentVerification passkey ceremony when needed.
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const parsed = rail3CreateCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const pm = await storage.getRail3PaymentMethodById(parsed.data.payment_method_id);
  if (!pm) return NextResponse.json({ error: "payment_method_not_found" }, { status: 404 });
  if (pm.ownerUid !== user.uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const agent = await storage.getRail3AgentByOwnerUid(user.uid);
  if (!agent) {
    return NextResponse.json(
      { error: "agent_not_created", message: "Create your Crossmint agent first via /setup/rail3." },
      { status: 400 }
    );
  }

  const input: PermissionInput = parsed.data.mode === "open"
    ? { mode: "open" }
    : {
        mode: "limited",
        maxAmountUsd: parsed.data.max_amount_usd!,
        period: parsed.data.period!,
        description: parsed.data.description,
        prompt: parsed.data.prompt,
      };

  const mandates = buildMandates(input);

  let intent;
  try {
    intent = await createOrderIntent({
      userLocator: ownerUidToUserLocator(user.uid),
      agentId: agent.agentId,
      paymentMethodId: pm.paymentMethodId,
      mandates,
    });
  } catch (err) {
    const status = err instanceof CrossmintApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "create_order_intent_failed";
    console.error("[Rail3] createOrderIntent failed:", message);
    return NextResponse.json({ error: "create_order_intent_failed", message }, { status });
  }

  const limitAmountCents = parsed.data.mode === "limited" && parsed.data.max_amount_usd !== undefined
    ? Math.round(parsed.data.max_amount_usd * 100)
    : null;
  const limitPeriod = parsed.data.mode === "limited" ? (parsed.data.period ?? null) : null;

  const last4 = pm.cardLast4 ? ` •••• ${pm.cardLast4}` : "";
  const limitLabel = parsed.data.mode === "limited"
    ? `$${parsed.data.max_amount_usd}/${parsed.data.period}`
    : "no limit";
  const defaultName = parsed.data.category
    ? `${parsed.data.category}${last4}`
    : `${(pm.cardBrand || "Card").toUpperCase()}${last4} — ${limitLabel}`;

  const cardId = generateRail3CardId();
  const card = await storage.createRail3Card({
    cardId,
    ownerUid: user.uid,
    paymentMethodId: pm.paymentMethodId,
    cardName: parsed.data.card_name || defaultName,
    cardColor: parsed.data.card_color || null,
    category: parsed.data.category || null,
    orderIntentId: intent.orderIntentId,
    intentMode: parsed.data.mode,
    mandates,
    permissionPhase: intent.phase,
    limitAmountCents,
    limitPeriod,
    status: "active",
    botId: parsed.data.bot_id || null,
  });

  await storage.updateRail3PaymentMethod(pm.paymentMethodId, { lastUsedAt: new Date() });

  return NextResponse.json({
    card_id: card.cardId,
    order_intent_id: intent.orderIntentId,
    permission_phase: intent.phase,
    intent_mode: card.intentMode,
    limit_amount_cents: card.limitAmountCents,
    limit_period: card.limitPeriod,
    verification_config: intent.verificationConfig ?? null,
  });
}
