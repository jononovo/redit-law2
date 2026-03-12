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
    return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  }

  const state = await storage.getObfuscationState(cardId);
  if (!state) {
    return NextResponse.json({
      initialized: false,
      phase: null,
      active: false,
    });
  }

  return NextResponse.json({
    initialized: true,
    phase: state.phase,
    active: state.active,
    activated_at: state.activatedAt.toISOString(),
    last_organic_at: state.lastOrganicAt?.toISOString() || null,
    last_obfuscation_at: state.lastObfuscationAt?.toISOString() || null,
    organic_count: state.organicCount,
    obfuscation_count: state.obfuscationCount,
  });
}
