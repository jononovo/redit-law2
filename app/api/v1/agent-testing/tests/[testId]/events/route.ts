import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { MAX_EVENTS_PER_TEST } from "@/features/agent-testing/constants";
import { MAX_FULL_SHOP_EVENTS } from "@/features/agent-testing/full-shop/shared/constants";
import { isSessionTimedOut } from "@/features/agent-testing/storage/agent-testing-storage";
import type { FieldEventInput } from "@/features/agent-testing/types";

const TIMED_OUT_RESPONSE = NextResponse.json({ status: "timed_out" }, { status: 410 });

interface FullShopFieldEventInput {
  event_type: string;
  field_name: string | null;
  value_length: number;
  sequence_num: number;
  event_timestamp: string;
  stage?: string;
  value_snapshot?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { testId } = await params;

  const session = await storage.getAgentTestByTestId(testId);
  if (!session) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  if (isSessionTimedOut(session)) {
    await storage.deleteAgentTest(testId);
    return NextResponse.json({ status: "timed_out" }, { status: 410 });
  }

  if (session.testType === "full_shop") {
    const observe = request.nextUrl.searchParams.get("observe");
    if (!observe || observe !== session.ownerToken) {
      return NextResponse.json({ error: "Invalid observer token" }, { status: 403 });
    }
  }

  const sinceParam = request.nextUrl.searchParams.get("since");
  const sinceSeqNum = sinceParam ? parseInt(sinceParam, 10) : -1;

  if (isNaN(sinceSeqNum)) {
    return NextResponse.json({ error: "Invalid since parameter" }, { status: 400 });
  }

  const events = sinceSeqNum >= 0
    ? await storage.getEventsSince(testId, sinceSeqNum)
    : await storage.getEventLogByTestId(testId);

  return NextResponse.json({
    test_id: testId,
    events: events.map(e => ({
      event_type: e.eventType,
      field_name: e.fieldName,
      value_length: e.valueLength,
      sequence_num: e.sequenceNum,
      stage: e.stage,
      value_snapshot: e.valueSnapshot,
      event_timestamp: e.eventTimestamp.toISOString(),
    })),
    count: events.length,
  });
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

  if (isSessionTimedOut(session)) {
    await storage.deleteAgentTest(testId);
    return NextResponse.json({ status: "timed_out" }, { status: 410 });
  }

  if (session.status === "scored") {
    return NextResponse.json({ error: "Test already scored" }, { status: 400 });
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
  const events: FullShopFieldEventInput[] = body.events;

  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "No events provided" }, { status: 400 });
  }

  const maxEvents = session.testType === "full_shop" ? MAX_FULL_SHOP_EVENTS : MAX_EVENTS_PER_TEST;
  const existingCount = await storage.getFieldEventCountByTestId(testId);
  if (existingCount + events.length > maxEvents) {
    return NextResponse.json({ error: "Event limit exceeded" }, { status: 429 });
  }

  const now = new Date();
  const rows = events.map((e) => {
    let ts = new Date(e.event_timestamp);
    if (isNaN(ts.getTime()) || ts > now) ts = now;
    return {
      testId,
      eventType: e.event_type,
      fieldName: e.field_name,
      valueLength: e.value_length ?? 0,
      sequenceNum: e.sequence_num,
      stage: e.stage ?? null,
      valueSnapshot: e.value_snapshot ?? null,
      eventTimestamp: ts,
    };
  });

  const inserted = await storage.insertFieldEvents(rows);

  const updates: Record<string, any> = { lastActivityAt: new Date() };
  const hasPageLoad = events.some((e) => e.event_type === "page_load" || e.event_type === "shop_landing");
  const hasInteraction = events.some((e) =>
    e.event_type === "focus" || e.event_type === "input" || e.event_type === "select" ||
    e.event_type === "search_input" || e.event_type === "color_select" || e.event_type === "size_select" ||
    e.event_type === "address_field_input" || e.event_type === "card_field_input",
  );

  if (hasPageLoad && !session.pageLoadedAt) {
    const pageLoadEvent = events.find((e) => e.event_type === "page_load" || e.event_type === "shop_landing");
    updates.pageLoadedAt = new Date(pageLoadEvent!.event_timestamp);
    if (session.status === "created" || session.status === "approved") {
      updates.status = "page_loaded";
    }
  }

  if (hasInteraction && !session.firstInteractionAt) {
    const firstInteraction = events.find((e) =>
      e.event_type === "focus" || e.event_type === "input" || e.event_type === "select" ||
      e.event_type === "search_input" || e.event_type === "color_select" || e.event_type === "size_select" ||
      e.event_type === "address_field_input" || e.event_type === "card_field_input",
    );
    updates.firstInteractionAt = new Date(firstInteraction!.event_timestamp);
    if (!updates.status || updates.status === "page_loaded") {
      updates.status = "in_progress";
    }
  }

  if (session.testType === "full_shop") {
    const lastEvent = events[events.length - 1];
    if (lastEvent.stage) {
      updates.currentStage = lastEvent.stage;
    }

    if (body.current_stage_number !== undefined) {
      updates.currentStageNumber = body.current_stage_number;
    }
    if (body.stages_completed !== undefined) {
      updates.stagesCompleted = body.stages_completed;
    }
    if (body.current_page !== undefined) {
      updates.currentPage = body.current_page;
    }
  } else {
    const allFieldEvents = await storage.getFieldEventsByTestId(testId);
    const filledFields = new Set<string>();
    for (const e of allFieldEvents) {
      if (e.fieldName && (e.eventType === "input" || e.eventType === "select") && e.valueLength > 0) {
        filledFields.add(e.fieldName);
      }
    }
    updates.fieldsFilled = filledFields.size;
  }

  if (hasInteraction && session.status !== "in_progress" && session.status !== "submitted" && session.status !== "scored") {
    updates.status = "in_progress";
  }

  if (Object.keys(updates).length > 0) {
    await storage.updateAgentTest(testId, updates);
  }

  return NextResponse.json({ received: inserted });
}
