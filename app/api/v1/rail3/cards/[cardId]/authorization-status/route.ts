import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { getOrderIntent } from "@/features/payment-rails/rail3";

// Polled by the UI after a card is created to detect when the owner has finished
// the Crossmint OrderIntentVerification passkey ceremony. Updates the cached phase.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { cardId } = await params;
  const card = await storage.getRail3CardByCardId(cardId);
  if (!card) return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  if (card.ownerUid !== user.uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const intent = await getOrderIntent(card.orderIntentId);
  if (intent.phase !== card.permissionPhase) {
    await storage.updateRail3Card(cardId, { permissionPhase: intent.phase });
  }

  return NextResponse.json({
    card_id: cardId,
    order_intent_id: intent.orderIntentId,
    phase: intent.phase,
  });
}
