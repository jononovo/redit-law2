import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { getVerificationStatus } from "@/features/payment-rails/rail3";

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

  const liveStatus = await getVerificationStatus(card.paymentMethodId);

  if (liveStatus !== card.verificationStatus) {
    await storage.updateRail3Card(cardId, { verificationStatus: liveStatus });
  }

  return NextResponse.json({
    card_id: cardId,
    verification_status: liveStatus,
  });
}
