import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { rail5InitializeSchema } from "@/shared/schema";
import { generateRail5CardId } from "@/lib/rail5";

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

  const parsed = rail5InitializeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { card_name, card_brand, card_last4 } = parsed.data;
  const cardId = generateRail5CardId();

  const card = await storage.createRail5Card({
    cardId,
    ownerUid: user.uid,
    cardName: card_name,
    cardBrand: card_brand,
    cardLast4: card_last4,
    status: "pending_setup",
  });

  return NextResponse.json({
    card_id: card.cardId,
    card_name: card.cardName,
    card_brand: card.cardBrand,
    card_last4: card.cardLast4,
    status: card.status,
  });
}
