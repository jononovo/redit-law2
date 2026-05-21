// TEMP diagnostic — fetches the live Crossmint orderIntent for a given card
// and returns the raw response alongside our DB row. Lets us compare what
// Crossmint thinks the verification phase is vs. what we have stored.
// Remove once the verification writeback path is verified end-to-end.

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { extractBearerJwt } from "@/features/platform-management/auth/extract-bearer-jwt";
import { storage } from "@/server/storage";
import { crossmintCardsFetch } from "@/features/payment-rails/rail3/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const jwt = extractBearerJwt(request);
  if (!jwt) return NextResponse.json({ error: "bearer_required" }, { status: 401 });

  const { cardId } = await params;
  const card = await storage.getRail3CardByCardId(cardId);
  if (!card) return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  if (card.ownerUid !== user.uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const res = await crossmintCardsFetch(`/order-intents/${card.orderIntentId}`, { jwt });
  const body = await res.json().catch(() => ({}));

  return NextResponse.json({
    db: {
      cardId: card.cardId,
      orderIntentId: card.orderIntentId,
      permissionPhase: card.permissionPhase,
      createdAt: card.createdAt.toISOString(),
    },
    crossmint: {
      status: res.status,
      body,
    },
  });
}
