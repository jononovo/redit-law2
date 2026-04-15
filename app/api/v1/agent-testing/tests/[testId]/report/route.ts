import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { generateFullShopReport } from "@/features/agent-testing/full-shop/shared/scoring/full-shop-report-generator";
import type { FullShopScenarioConfig, FullShopFieldEvent } from "@/features/agent-testing/full-shop/shared/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { testId } = await params;

  const session = await storage.getAgentTestByTestId(testId);
  if (!session) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  if (!session.report || session.status !== "scored") {
    return NextResponse.json({ error: "Report not yet available" }, { status: 404 });
  }

  if (session.testType === "full_shop") {
    const observe = request.nextUrl.searchParams.get("observe");
    if (!observe || observe !== session.ownerToken) {
      return NextResponse.json({
        test_id: session.testId,
        status: "scored",
        score: session.score,
        grade: session.grade,
      });
    }
  }

  return NextResponse.json(session.report);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { testId } = await params;

  const session = await storage.getAgentTestByTestId(testId);
  if (!session) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  if (session.testType !== "full_shop") {
    return NextResponse.json({ error: "POST report only for full_shop tests" }, { status: 400 });
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

  const scenario = session.scenario as FullShopScenarioConfig | null;
  if (!scenario) {
    return NextResponse.json({ error: "No scenario found for this test" }, { status: 500 });
  }

  const dbEvents = await storage.getEventLogByTestId(testId);
  const events: FullShopFieldEvent[] = dbEvents.map(e => ({
    stage: e.stage ?? "unknown",
    event_type: e.eventType,
    field_name: e.fieldName,
    value_snapshot: e.valueSnapshot,
    value_length: e.valueLength,
    sequence_num: e.sequenceNum,
    event_timestamp: e.eventTimestamp.toISOString(),
  }));

  const report = generateFullShopReport(testId, scenario.scenarioId, events, scenario);

  await storage.updateAgentTest(testId, {
    score: report.overall_score,
    grade: report.grade,
    report,
    status: "scored",
    submittedAt: new Date(),
  });

  return NextResponse.json({
    test_id: testId,
    status: "scored",
    score: report.overall_score,
    grade: report.grade,
  });
}
