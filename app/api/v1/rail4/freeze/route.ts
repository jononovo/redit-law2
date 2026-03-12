import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { fireRailsUpdated } from "@/lib/webhooks";

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

  const { card_id, frozen } = body;
  if (!card_id || typeof frozen !== "boolean") {
    return NextResponse.json({ error: "missing_fields", message: "card_id and frozen (boolean) are required." }, { status: 400 });
  }

  const card = await storage.getRail4CardByCardId(card_id);
  if (!card || card.ownerUid !== user.uid) {
    return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  }

  if (card.status === "pending_setup" || card.status === "awaiting_bot") {
    return NextResponse.json({ error: "card_not_active", message: "Cannot freeze a card that is not yet set up." }, { status: 400 });
  }

  const newStatus = frozen ? "frozen" : "active";
  await storage.updateRail4CardByCardId(card_id, { status: newStatus } as any);

  if (card.botId) {
    const bot = await storage.getBotByBotId(card.botId);
    if (bot) {
      const action = frozen ? "card_frozen" as const : "card_unfrozen" as const;
      fireRailsUpdated(bot, action, "rail4", { card_id }).catch(() => {});
    }
  }

  return NextResponse.json({
    card_id,
    status: newStatus,
    message: frozen ? "Card has been frozen. All transactions are paused." : "Card has been unfrozen. Transactions are resumed.",
  });
}
