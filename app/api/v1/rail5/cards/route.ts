import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/platform-management/auth/session";
import { storage } from "@/server/storage";
import { GUARDRAIL_DEFAULTS } from "@/lib/agent-interaction/guardrails/defaults";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cards = await storage.getRail5CardsByOwnerUid(user.uid);

  const botIds = [...new Set(cards.map((c) => c.botId).filter(Boolean))] as string[];
  const botLookup: Record<string, string> = {};
  await Promise.all(
    botIds.map(async (botId) => {
      const bot = await storage.getBotByBotId(botId);
      if (bot) botLookup[botId] = bot.botName;
    })
  );

  const result = await Promise.all(cards.map(async (c) => {
    const guard = await storage.getRail5Guardrails(c.cardId);
    return {
      card_id: c.cardId,
      card_name: c.cardName,
      card_brand: c.cardBrand,
      card_last4: c.cardLast4,
      status: c.status,
      bot_id: c.botId || null,
      bot_name: c.botId ? (botLookup[c.botId] || null) : null,
      card_color: c.cardColor || null,
      card_first4: c.cardFirst4 || null,
      exp_month: c.expMonth || null,
      exp_year: c.expYear || null,
      cardholder_name: c.cardholderName || null,
      billing_address: c.billingAddress || null,
      billing_city: c.billingCity || null,
      billing_state: c.billingState || null,
      billing_zip: c.billingZip || null,
      billing_country: c.billingCountry || "US",
      spending_limit_cents: guard?.maxPerTxCents ?? GUARDRAIL_DEFAULTS.rail5.maxPerTxCents,
      daily_limit_cents: guard?.dailyBudgetCents ?? GUARDRAIL_DEFAULTS.rail5.dailyBudgetCents,
      monthly_limit_cents: guard?.monthlyBudgetCents ?? GUARDRAIL_DEFAULTS.rail5.monthlyBudgetCents,
      created_at: c.createdAt.toISOString(),
    };
  }));

  return NextResponse.json({ cards: result });
}
