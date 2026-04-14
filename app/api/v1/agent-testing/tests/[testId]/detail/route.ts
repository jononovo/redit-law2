import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { testId } = await params;

  const session = await storage.getAgentTestByTestId(testId);
  if (!session) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const base: Record<string, any> = {
    test_id: session.testId,
    test_type: session.testType,
    checkout_type: session.checkoutType,
    status: session.status,
    agent_type: session.agentType,
    browser_tool: session.browserTool,
    created_at: session.createdAt.toISOString(),
  };

  if (session.testType === "full_shop") {
    const observe = request.nextUrl.searchParams.get("observe");
    const isOwner = observe && observe === session.ownerToken;
    if (isOwner) {
      base.scenario = session.scenario;
      base.instruction_text = session.instructionText;
    }
    base.current_stage = session.currentStage;
    base.stages_completed = session.stagesCompleted;
    base.score = session.score;
    base.grade = session.grade;
  } else {
    base.checkout_page_id = session.checkoutPageId;
    base.card_test_token = session.cardTestToken;
  }

  return NextResponse.json(base);
}
