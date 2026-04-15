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
    status: session.status,
    fields_filled: session.fieldsFilled,
    total_fields: session.totalFields,
    page_loaded_at: session.pageLoadedAt?.toISOString() ?? null,
    first_interaction_at: session.firstInteractionAt?.toISOString() ?? null,
    submitted_at: session.submittedAt?.toISOString() ?? null,
    score: session.score,
    grade: session.grade,
  });
}
