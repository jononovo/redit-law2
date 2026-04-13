import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { testId } = await params;

  const session = await storage.getAgentTestByTestId(testId);
  if (!session) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  return NextResponse.json({
    test_id: session.testId,
    checkout_page_id: session.checkoutPageId,
    card_test_token: session.cardTestToken,
    checkout_type: session.checkoutType,
    status: session.status,
  });
}
