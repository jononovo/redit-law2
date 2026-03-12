import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cardId = request.nextUrl.searchParams.get("card_id");
  if (!cardId) {
    return NextResponse.json({ error: "missing_card_id" }, { status: 400 });
  }

  const card = await storage.getRail4CardByCardId(cardId);
  if (!card || card.ownerUid !== user.uid) {
    return NextResponse.json({
      configured: false,
      status: null,
    });
  }

  return NextResponse.json({
    configured: true,
    card_id: card.cardId,
    status: card.status,
    card_name: card.cardName,
    decoy_filename: card.decoyFilename,
    real_profile_index: card.realProfileIndex,
    missing_digit_positions: card.missingDigitPositions,
    created_at: card.createdAt.toISOString(),
  });
}
