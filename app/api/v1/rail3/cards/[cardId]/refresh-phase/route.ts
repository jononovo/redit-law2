import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { extractBearerJwt } from "@/features/platform-management/auth/extract-bearer-jwt";
import { storage } from "@/server/storage";
import { getOrderIntent, CrossmintApiError } from "@/features/payment-rails/rail3";

// Reconcile rail3_cards.permission_phase against Crossmint's source of truth.
// Called by the AddCardDialog right after OrderIntentVerification's onComplete
// fires — the SDK callback tells us the ceremony finished, but only Crossmint
// knows the resulting phase. Trusting the SDK alone causes the writeback gap
// where DB stays "requires-verification" forever.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { cardId } = await params;
  const card = await storage.getRail3CardByCardId(cardId);
  if (!card) return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  if (card.ownerUid !== user.uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const jwt = extractBearerJwt(request);
  if (!jwt) {
    return NextResponse.json(
      { error: "bearer_required", message: "Firebase ID token required in Authorization header for Crossmint card operations." },
      { status: 401 }
    );
  }

  let fresh;
  try {
    fresh = await getOrderIntent({ jwt, orderIntentId: card.orderIntentId });
  } catch (err) {
    const status = err instanceof CrossmintApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "get_order_intent_failed";
    console.error("[Rail3] getOrderIntent failed:", message);
    return NextResponse.json({ error: "get_order_intent_failed", message }, { status });
  }

  if (fresh.phase !== card.permissionPhase) {
    await storage.updateRail3Card(cardId, { permissionPhase: fresh.phase });
  }

  return NextResponse.json({
    card_id: cardId,
    order_intent_id: card.orderIntentId,
    permission_phase: fresh.phase,
  });
}
