import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { rail5InitializeSchema } from "@/shared/schema";
import { generateRail5CardId } from "@/features/payment-rails/rail5";
import { lookupIssuer } from "@/features/payment-rails/card/bin-lookup";

const CARD_COLORS = ["purple", "dark", "blue", "primary"] as const;

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

  const { card_name, card_brand, card_last4, card_first6 } = parsed.data;
  const cardId = generateRail5CardId();

  let finalName = card_name;
  if (card_first6 && card_last4 !== "0000") {
    const issuer = lookupIssuer(card_first6);
    const brandLabel = card_brand.charAt(0).toUpperCase() + card_brand.slice(1);
    finalName = issuer
      ? `${issuer} ${brandLabel} ••${card_last4}`
      : `${brandLabel} ••${card_last4}`;
  }

  const cardColor = CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];

  const card = await storage.createRail5Card({
    cardId,
    ownerUid: user.uid,
    cardName: finalName,
    cardBrand: card_brand,
    cardLast4: card_last4,
    cardFirst6: card_first6 || "",
    status: "pending_setup",
    cardColor,
  });

  return NextResponse.json({
    card_id: card.cardId,
    card_name: card.cardName,
    card_brand: card.cardBrand,
    card_last4: card.cardLast4,
    status: card.status,
  });
}
