import { NextResponse } from "next/server";
import { withBotApi } from "@/features/platform-management/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";

export const GET = withBotApi("/api/v1/bot/rail3/cards", async (_request, { bot }) => {
  const card = await storage.getRail3CardByBotId(bot.botId);
  if (!card) return NextResponse.json({ cards: [] });

  return NextResponse.json({
    cards: [{
      card_id: card.cardId,
      card_name: card.cardName,
      card_brand: card.cardBrand,
      card_last4: card.cardLast4,
      status: card.status,
      verification_status: card.verificationStatus,
      default_intent_mode: card.defaultIntentMode,
      default_permission_phase: card.defaultPermissionPhase,
      limit_amount_cents: card.limitAmountCents,
      limit_period: card.limitPeriod,
    }],
  });
});
