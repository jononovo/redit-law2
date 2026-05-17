import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { fireRailsUpdated } from "@/features/agent-interaction/webhooks";
import { revokeOrderIntent } from "@/features/payment-rails/rail3";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { cardId } = await params;
  const rail = request.nextUrl.searchParams.get("rail");

  if (rail === "rail5") {
    const card = await storage.getRail5CardByCardId(cardId);
    if (!card) {
      return NextResponse.json({ error: "card_not_found" }, { status: 404 });
    }

    if (card.ownerUid !== user.uid) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (card.botId) {
      const bot = await storage.getBotByBotId(card.botId);
      if (bot) {
        fireRailsUpdated(bot, "card_removed" as const, "rail5", { card_id: cardId }).catch(() => {});
      }
    }

    await storage.deleteRail5Card(cardId);
    return NextResponse.json({ deleted: true });
  }

  if (rail === "rail3") {
    const card = await storage.getRail3CardByCardId(cardId);
    if (!card) {
      return NextResponse.json({ error: "card_not_found" }, { status: 404 });
    }
    if (card.ownerUid !== user.uid) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Revoke just this virtual card's orderIntent. The underlying payment method
    // stays — it may back other virtual cards.
    await revokeOrderIntent(card.orderIntentId).catch(() => {});

    if (card.botId) {
      const bot = await storage.getBotByBotId(card.botId);
      if (bot) {
        fireRailsUpdated(bot, "card_removed" as const, "rail3", { card_id: cardId }).catch(() => {});
      }
    }

    await storage.deleteRail3Card(cardId);
    return NextResponse.json({ deleted: true });
  }

  return NextResponse.json({ error: "invalid_rail", message: "Query parameter 'rail' must be 'rail5' or 'rail3'." }, { status: 400 });
}
