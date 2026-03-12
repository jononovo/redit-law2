import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function DELETE(request: NextRequest) {
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
    return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  }

  await storage.deleteRail4CardByCardId(cardId);

  return NextResponse.json({ deleted: true });
}
