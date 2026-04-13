import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { MAX_EVENTS_PER_TEST } from "@/features/agent-testing/constants";
import type { FieldEventInput } from "@/features/agent-testing/types";

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
  const events: FieldEventInput[] = body.events;

  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "No events provided" }, { status: 400 });
  }

  const existingCount = await storage.getFieldEventCountByTestId(testId);
  if (existingCount + events.length > MAX_EVENTS_PER_TEST) {
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
      eventTimestamp: ts,
    };
  });

  const inserted = await storage.insertFieldEvents(rows);

  const updates: Record<string, any> = {};
  const hasPageLoad = events.some((e) => e.event_type === "page_load");
  const hasInteraction = events.some((e) =>
    e.event_type === "focus" || e.event_type === "input" || e.event_type === "select",
  );

  if (hasPageLoad && !session.pageLoadedAt) {
    const pageLoadEvent = events.find((e) => e.event_type === "page_load");
    updates.pageLoadedAt = new Date(pageLoadEvent!.event_timestamp);
    if (session.status === "created" || session.status === "approved") {
      updates.status = "page_loaded";
    }
  }

  if (hasInteraction && !session.firstInteractionAt) {
    const firstInteraction = events.find((e) =>
      e.event_type === "focus" || e.event_type === "input" || e.event_type === "select",
    );
    updates.firstInteractionAt = new Date(firstInteraction!.event_timestamp);
    if (!updates.status || updates.status === "page_loaded") {
      updates.status = "in_progress";
    }
  }

  const inputFields = new Set(
    events.filter((e) => e.event_type === "input" && e.field_name).map((e) => e.field_name),
  );
  const selectFields = new Set(
    events.filter((e) => e.event_type === "select" && e.field_name).map((e) => e.field_name),
  );
  const allFieldEvents = await storage.getFieldEventsByTestId(testId);
  const filledFields = new Set<string>();
  for (const e of allFieldEvents) {
    if (e.fieldName && (e.eventType === "input" || e.eventType === "select") && e.valueLength > 0) {
      filledFields.add(e.fieldName);
    }
  }
  updates.fieldsFilled = filledFields.size;

  if (hasInteraction && session.status !== "in_progress" && session.status !== "submitted" && session.status !== "scored") {
    updates.status = "in_progress";
  }

  if (Object.keys(updates).length > 0) {
    await storage.updateAgentTest(testId, updates);
  }

  return NextResponse.json({ received: inserted });
}
