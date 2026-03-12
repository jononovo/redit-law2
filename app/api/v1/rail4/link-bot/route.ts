import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { linkBotToEntity } from "@/lib/agent-management/bot-linking";
import { storage } from "@/server/storage";

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

  const { card_id } = body;
  if (!card_id || typeof card_id !== "string") {
    return NextResponse.json({ error: "missing_card_id", message: "card_id is required." }, { status: 400 });
  }

  const card = await storage.getRail4CardByCardId(card_id);
  if (!card || card.ownerUid !== user.uid) {
    return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  }

  if (card.status !== "awaiting_bot") {
    return NextResponse.json({ error: "invalid_status", message: "Card must be in 'awaiting_bot' status to link a bot." }, { status: 400 });
  }

  const ownerBots = await storage.getBotsByOwnerUid(user.uid);
  if (ownerBots.length === 0) {
    return NextResponse.json({ error: "no_bot", message: "You don't have a bot on this account." }, { status: 400 });
  }

  const bot = ownerBots[0];
  const result = await linkBotToEntity("rail4", card_id, bot.botId, user.uid);

  if (!result.success) {
    return NextResponse.json({ error: result.error, ...result.data }, { status: result.status || 500 });
  }

  return NextResponse.json({
    status: "active",
    ...result.data,
  });
}
