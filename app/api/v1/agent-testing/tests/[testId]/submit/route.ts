import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { generateReport } from "@/features/agent-testing/scoring/report-generator";
import type { SubmittedValues, ApprovalInfo } from "@/features/agent-testing/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { testId } = await params;

  const session = await storage.getAgentTestByTestId(testId);
  if (!session) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  if (session.status === "scored") {
    return NextResponse.json({
      test_id: session.testId,
      status: "scored",
      score: session.score,
      grade: session.grade,
    });
  }

  if (session.expiresAt && new Date() > session.expiresAt) {
    return NextResponse.json({ error: "Test has expired" }, { status: 410 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const submitted: SubmittedValues = body.submitted_values;

  if (!submitted) {
    return NextResponse.json({ error: "submitted_values required" }, { status: 400 });
  }

  const now = new Date();
  await storage.updateAgentTest(testId, {
    submittedValues: submitted,
    submittedAt: now,
    status: "submitted",
  });

  const updatedSession = await storage.getAgentTestByTestId(testId);
  if (!updatedSession) {
    return NextResponse.json({ error: "Session lost" }, { status: 500 });
  }

  const events = await storage.getFieldEventsByTestId(testId);

  let approvalInfo: ApprovalInfo = { required: false };
  if (updatedSession.approvalRequired && updatedSession.cardId) {
    try {
      const approvals = updatedSession.ownerUid
        ? await storage.getUnifiedApprovalsByOwnerUid(updatedSession.ownerUid)
        : [];
      const matchingApproval = approvals.find(
        (a) =>
          a.rail === "rail5" &&
          (a.metadata as Record<string, any>)?.cardId === updatedSession.cardId &&
          (a.metadata as Record<string, any>)?.category === "test",
      );
      if (matchingApproval) {
        approvalInfo = {
          required: true,
          requested_at: matchingApproval.createdAt.toISOString(),
          approved_at: matchingApproval.decidedAt?.toISOString(),
          wait_seconds: matchingApproval.decidedAt
            ? Math.round((matchingApproval.decidedAt.getTime() - matchingApproval.createdAt.getTime()) / 1000)
            : undefined,
          auto_approved: matchingApproval.status === "approved" && !matchingApproval.decidedAt,
        };
      }
    } catch {
      approvalInfo = { required: true };
    }
  }

  const report = generateReport(updatedSession, events, approvalInfo);

  await storage.updateAgentTest(testId, {
    score: report.overall_score,
    grade: report.grade,
    report,
    status: "scored",
  });

  return NextResponse.json({
    test_id: testId,
    status: "scored",
    score: report.overall_score,
    grade: report.grade,
  });
}
