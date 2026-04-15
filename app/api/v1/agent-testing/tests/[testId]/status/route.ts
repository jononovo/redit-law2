import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import type { StageSnapshot } from "@/features/agent-testing/full-shop/shared/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { testId } = await params;

  const session = await storage.getAgentTestByTestId(testId);
  if (!session) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  if (session.testType === "full_shop") {
    const observe = request.nextUrl.searchParams.get("observe");
    if (!observe || observe !== session.ownerToken) {
      return NextResponse.json({ error: "Invalid observer token" }, { status: 403 });
    }
  }

  const events = await storage.getEventLogByTestId(testId);
  const lastSeqNum = events.length > 0 ? events[events.length - 1].sequenceNum : -1;

  const stageSnapshot: StageSnapshot = {};
  for (const e of events) {
    if (!e.valueSnapshot || !e.fieldName) continue;
    switch (e.fieldName) {
      case "searchQuery": stageSnapshot.search = e.valueSnapshot; break;
      case "product": stageSnapshot.product = e.valueSnapshot; break;
      case "color": stageSnapshot.color = e.valueSnapshot; break;
      case "size": stageSnapshot.size = e.valueSnapshot; break;
      case "quantity": stageSnapshot.quantity = parseInt(e.valueSnapshot, 10) || 1; break;
      case "shippingMethod": stageSnapshot.shippingMethod = e.valueSnapshot; break;
      case "paymentMethod": stageSnapshot.paymentMethod = e.valueSnapshot; break;
      case "fullName": stageSnapshot.address = { ...stageSnapshot.address, fullName: e.valueSnapshot }; break;
      case "street": stageSnapshot.address = { ...stageSnapshot.address, street: e.valueSnapshot }; break;
      case "city": stageSnapshot.address = { ...stageSnapshot.address, city: e.valueSnapshot }; break;
      case "state": stageSnapshot.address = { ...stageSnapshot.address, state: e.valueSnapshot }; break;
      case "zip": stageSnapshot.address = { ...stageSnapshot.address, zip: e.valueSnapshot }; break;
      case "cardholderName": stageSnapshot.card = { ...stageSnapshot.card, cardholderName: e.valueSnapshot }; break;
      case "cardNumber": stageSnapshot.card = { ...stageSnapshot.card, cardNumber: e.valueSnapshot }; break;
      case "expiryMonth": stageSnapshot.card = { ...stageSnapshot.card, cardExpiry: e.valueSnapshot }; break;
      case "expiryYear": stageSnapshot.card = { ...stageSnapshot.card, cardExpiry: e.valueSnapshot }; break;
      case "cvv": stageSnapshot.card = { ...stageSnapshot.card, cardCvv: e.valueSnapshot }; break;
      case "billingZip": stageSnapshot.card = { ...stageSnapshot.card, billingZip: e.valueSnapshot }; break;
      case "termsChecked": stageSnapshot.termsChecked = e.valueSnapshot === "true"; break;
    }
  }

  return NextResponse.json({
    test_id: testId,
    test_type: session.testType,
    status: session.status,
    current_stage: session.currentStage,
    current_page: session.currentPage,
    stages_completed: session.stagesCompleted,
    event_count: events.length,
    last_seq_num: lastSeqNum,
    stage_snapshot: stageSnapshot,
    score: session.score,
    grade: session.grade,
  });
}
