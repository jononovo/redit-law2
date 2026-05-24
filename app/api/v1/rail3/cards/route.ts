import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { extractBearerJwt } from "@/features/platform-management/auth/extract-bearer-jwt";
import { storage } from "@/server/storage";
import {
  generateRail3CardId, buildMandates, createOrderIntent,
  CrossmintApiError, type PermissionInput,
} from "@/features/payment-rails/rail3";
import { provisionAgentForOwner } from "@/features/payment-rails/rail3/per-user-agent";
import { rail3CreateCardSchema, type Rail3Agent } from "@/shared/schema";

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
      is_frozen: c.isFrozen,
      limit_amount_cents: c.limitAmountCents,
      limit_period: c.limitPeriod,
      order_intent_id: c.orderIntentId,
      created_at: c.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ cards: result });
}

// Get-or-create the one Crossmint agent for this owner. Lazy-creates on first
// virtual card. Concurrency-safe via ON CONFLICT DO NOTHING — on race, the
// loser's Crossmint agent is orphaned (warn-logged, acceptable cost).
async function getOrProvisionAgent(
  ownerUid: string,
  ownerEmail: string | null,
  jwt: string,
): Promise<Rail3Agent> {
  const existing = await storage.getRail3AgentByOwnerUid(ownerUid);
  if (existing) return existing;

  const { agentId } = await provisionAgentForOwner({
    jwt,
    ownerEmail,
  });
  const inserted = await storage.insertRail3AgentIfAbsent({ ownerUid, agentId });
  if (inserted) return inserted;

  const winner = await storage.getRail3AgentByOwnerUid(ownerUid);
  if (!winner) throw new Error("rail3_agent_race_unresolved");
  console.warn("[Rail3] orphaned Crossmint agent", agentId, "lost race for owner", ownerUid);
  return winner;
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

  // Optional bot link — validate ownership if supplied.
  let botId: string | null = null;
  if (parsed.data.bot_id) {
    const bot = await storage.getBotByBotId(parsed.data.bot_id);
    if (!bot) return NextResponse.json({ error: "bot_not_found" }, { status: 404 });
    if (bot.ownerUid !== user.uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    botId = bot.botId;
  }

  // Crossmint requires a user JWT (Bearer) for both /agents and /order-intents.
  // authFetch on the client always sends it; reject early if absent.
  const jwt = extractBearerJwt(request);
  if (!jwt) {
    return NextResponse.json(
      { error: "bearer_required", message: "Firebase ID token required in Authorization header for Crossmint card operations." },
      { status: 401 }
    );
  }

  let agent: Rail3Agent;
  try {
    agent = await getOrProvisionAgent(user.uid, user.email, jwt);
  } catch (err) {
    const status = err instanceof CrossmintApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "create_agent_failed";
    console.error("[Rail3] getOrProvisionAgent failed:", message);
    return NextResponse.json({ error: "create_agent_failed", message }, { status });
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
      jwt,
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

  const limitLabel = parsed.data.mode === "limited"
    ? `$${parsed.data.max_amount_usd}/${parsed.data.period}`
    : "no limit";
  const defaultName = parsed.data.category
    ? parsed.data.category
    : `${(pm.cardBrand || "Card").toUpperCase()} — ${limitLabel}`;

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
    limitAmountCents,
    limitPeriod,
    status: intent.phase,    // lifecycle = Crossmint orderIntent.phase
    isFrozen: false,
    botId,
  });

  await storage.updateRail3PaymentMethod(pm.paymentMethodId, { lastUsedAt: new Date() });

  return NextResponse.json({
    card_id: card.cardId,
    order_intent_id: intent.orderIntentId,
    status: card.status,
    is_frozen: card.isFrozen,
    intent_mode: card.intentMode,
    limit_amount_cents: card.limitAmountCents,
    limit_period: card.limitPeriod,
    verification_config: intent.verificationConfig ?? null,
  });
}
