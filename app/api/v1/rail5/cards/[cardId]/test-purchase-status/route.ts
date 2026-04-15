import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { RAIL5_TEST_CHECKOUT_PAGE_ID } from "@/features/payment-rails/rail5";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { cardId } = await params;
  if (!cardId) {
    return NextResponse.json({ error: "missing_card_id" }, { status: 400 });
  }

  const card = await storage.getRail5CardByCardId(cardId);
  if (!card) {
    return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  }

  if (card.ownerUid !== user.uid) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sales = await storage.getSalesByCheckoutPageId(RAIL5_TEST_CHECKOUT_PAGE_ID);

  let testSale = null;
  if (card.testToken) {
    testSale = sales.find(
      (s) =>
        s.status === "test" &&
        s.paymentMethod === "testing" &&
        (s.metadata as Record<string, string>)?.testToken === card.testToken
    ) || null;
  }

  if (testSale) {
    const meta = (testSale.metadata || {}) as Record<string, string>;
    return NextResponse.json({
      status: "completed",
      sale_id: testSale.saleId,
      completed_at: testSale.confirmedAt?.toISOString() || testSale.createdAt.toISOString(),
      submitted_details: {
        cardNumber: meta.cardNumber || "",
        cardExpiry: meta.cardExpiry || "",
        cardCvv: meta.cardCvv || "",
        cardholderName: meta.cardholderName || "",
        billingAddress: meta.billingAddress || "",
        billingCity: meta.billingCity || "",
        billingState: meta.billingState || "",
        billingZip: meta.billingZip || "",
      },
    });
  }

  if (card.testStartedAt) {
    return NextResponse.json({
      status: "in_progress",
      started_at: card.testStartedAt.toISOString(),
    });
  }

  const approvals = await storage.getUnifiedApprovalsByOwnerUid(user.uid);
  const cardApproval = approvals.find(
    (a) =>
      a.rail === "rail5" &&
      a.merchantName === "CreditClaw Test Checkout" &&
      (a.metadata as Record<string, any>)?.cardId === cardId &&
      (a.metadata as Record<string, any>)?.category === "test"
  );

  if (cardApproval) {
    if (cardApproval.status === "approved") {
      return NextResponse.json({
        status: "approved",
        approved_at: cardApproval.decidedAt?.toISOString() || null,
      });
    }
    if (cardApproval.status === "pending") {
      return NextResponse.json({
        status: "approval_requested",
        requested_at: cardApproval.createdAt.toISOString(),
        expires_at: cardApproval.expiresAt.toISOString(),
      });
    }
  }

  return NextResponse.json({ status: "pending" });
}
