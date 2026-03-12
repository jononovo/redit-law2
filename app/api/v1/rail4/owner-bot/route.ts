import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ownerBots = await storage.getBotsByOwnerUid(user.uid);

  if (ownerBots.length === 0) {
    return NextResponse.json({ has_bot: false, bot: null, card_count: 0, max_cards: 3 });
  }

  const bot = ownerBots[0];
  const cardCount = await storage.countCardsByBotId(bot.botId);

  return NextResponse.json({
    has_bot: true,
    bot: {
      bot_id: bot.botId,
      bot_name: bot.botName,
      description: bot.description,
      wallet_status: bot.walletStatus,
      created_at: bot.createdAt,
    },
    card_count: cardCount,
    max_cards: 3,
  });
}
