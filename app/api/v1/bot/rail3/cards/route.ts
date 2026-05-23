import { NextResponse } from "next/server";
import { withBotApi } from "@/features/platform-management/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";

export const GET = withBotApi("/api/v1/bot/rail3/cards", async (_request, { bot }) => {
  const cards = await storage.getRail3CardsByBotId(bot.botId);
  if (cards.length === 0) return NextResponse.json({ cards: [] });

  const pmIds = [...new Set(cards.map((c) => c.paymentMethodId))];
  const pmLookup = new Map<string, Awaited<ReturnType<typeof storage.getRail3PaymentMethodById>>>();
  await Promise.all(
    pmIds.map(async (id) => {
      const pm = await storage.getRail3PaymentMethodById(id);
      pmLookup.set(id, pm);
    })
  );

  return NextResponse.json({
    cards: cards.map((c) => {
      const pm = pmLookup.get(c.paymentMethodId);
      return {
        card_id: c.cardId,
        card_name: c.cardName,
        category: c.category,
        card_brand: pm?.cardBrand || null,
        card_last4: pm?.cardLast4 || null,
        status: c.status,
        is_frozen: c.isFrozen,
        intent_mode: c.intentMode,
        limit_amount_cents: c.limitAmountCents,
        limit_period: c.limitPeriod,
      };
    }),
  });
});
