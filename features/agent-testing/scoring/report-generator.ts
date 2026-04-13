import type { AgentTestSession, AgentTestFieldEvent } from "@/shared/schema";
import type { TestReport, ExpectedValues, SubmittedValues, FieldBreakdown, ApprovalInfo } from "../types";
import { SCORING_WEIGHTS, GRADE_THRESHOLDS, AGENT_TEST_FIELDS } from "../constants";
import { scoreAccuracy } from "./accuracy-scorer";
import { scoreCompletion } from "./completion-scorer";
import { scoreSpeed, detectTimelineGaps } from "./speed-scorer";
import { scoreEfficiency } from "./efficiency-scorer";

function getGrade(score: number): string {
  for (const t of GRADE_THRESHOLDS) {
    if (score >= t.min) return t.grade;
  }
  return "F";
}

function buildFieldBreakdown(
  expected: ExpectedValues,
  submitted: SubmittedValues | null,
  events: AgentTestFieldEvent[],
): FieldBreakdown[] {
  return AGENT_TEST_FIELDS.map((fieldName) => {
    const fieldEvents = events.filter((e) => e.fieldName === fieldName);
    const inputEvents = fieldEvents.filter((e) => e.eventType === "input");
    const focusEvents = fieldEvents.filter((e) => e.eventType === "focus");

    let expectedLen = 0;
    if (fieldName === "cardholderName") expectedLen = expected.cardholderName.length;
    else if (fieldName === "cardNumber") expectedLen = expected.cardNumber.length;
    else if (fieldName === "expiryMonth") expectedLen = 2;
    else if (fieldName === "expiryYear") expectedLen = 2;
    else if (fieldName === "cvv") expectedLen = expected.cardCvv.length;
    else if (fieldName === "billingZip") expectedLen = expected.billingZip.length;

    let submittedLen = 0;
    let accurate = false;
    let filled = false;

    if (submitted) {
      const norm = (s: string) => s.trim().toLowerCase().replace(/[\s-]/g, "");
      if (fieldName === "cardholderName") {
        submittedLen = submitted.cardholderName?.length ?? 0;
        accurate = norm(submitted.cardholderName ?? "") === norm(expected.cardholderName);
        filled = !!submitted.cardholderName?.trim();
      } else if (fieldName === "cardNumber") {
        submittedLen = submitted.cardNumber?.length ?? 0;
        accurate = norm(submitted.cardNumber ?? "") === norm(expected.cardNumber);
        filled = !!submitted.cardNumber?.trim();
      } else if (fieldName === "expiryMonth") {
        const expParts = expected.cardExpiry.split("/");
        const subParts = (submitted.cardExpiry ?? "").split("/");
        submittedLen = (subParts[0] ?? "").length;
        accurate = (subParts[0] ?? "") === (expParts[0] ?? "");
        filled = !!(subParts[0] ?? "").trim();
      } else if (fieldName === "expiryYear") {
        const expParts = expected.cardExpiry.split("/");
        const subParts = (submitted.cardExpiry ?? "").split("/");
        submittedLen = (subParts[1] ?? "").length;
        accurate = (subParts[1] ?? "") === (expParts[1] ?? "");
        filled = !!(subParts[1] ?? "").trim();
      } else if (fieldName === "cvv") {
        submittedLen = submitted.cardCvv?.length ?? 0;
        accurate = norm(submitted.cardCvv ?? "") === norm(expected.cardCvv);
        filled = !!submitted.cardCvv?.trim();
      } else if (fieldName === "billingZip") {
        submittedLen = submitted.billingZip?.length ?? 0;
        accurate = norm(submitted.billingZip ?? "") === norm(expected.billingZip);
        filled = !!submitted.billingZip?.trim();
      }
    }

    let timeToFillMs = 0;
    if (fieldEvents.length > 0) {
      const firstEvent = fieldEvents[0];
      const lastEvent = fieldEvents[fieldEvents.length - 1];
      timeToFillMs = lastEvent.eventTimestamp.getTime() - firstEvent.eventTimestamp.getTime();
    }

    let retypes = 0;
    const valueLengths = inputEvents.map((e) => e.valueLength);
    for (let i = 1; i < valueLengths.length; i++) {
      if (valueLengths[i] < valueLengths[i - 1] && i + 1 < valueLengths.length && valueLengths[i + 1] > valueLengths[i]) {
        retypes++;
      }
    }

    const refocuses = Math.max(0, focusEvents.length - 1);

    const notes: string[] = [];
    if (timeToFillMs > 8000 && (fieldName === "expiryMonth" || fieldName === "expiryYear")) {
      notes.push(`Took ${(timeToFillMs / 1000).toFixed(1)}s — dropdown may have caused hesitation`);
    }
    if (retypes > 0) notes.push(`${retypes} retype(s) detected`);
    if (refocuses > 1) notes.push(`Re-focused ${refocuses} times`);

    return {
      field_name: fieldName,
      expected_length: expectedLen,
      submitted_length: submittedLen,
      accurate,
      filled,
      time_to_fill_ms: timeToFillMs,
      interaction_count: fieldEvents.length,
      retypes,
      refocuses,
      notes,
    };
  });
}

function buildSummary(
  overallScore: number,
  grade: string,
  fieldsFilled: number,
  totalFields: number,
  totalSeconds: number,
  mismatches: string[],
): string {
  const accuracy = mismatches.length === 0 ? "accurately" : `with ${mismatches.length} mismatch(es)`;
  return `Agent completed ${fieldsFilled}/${totalFields} fields ${accuracy} in ${totalSeconds} seconds. Grade: ${grade} (${overallScore}/100).`;
}

export function generateReport(
  session: AgentTestSession,
  events: AgentTestFieldEvent[],
  approvalInfo?: ApprovalInfo,
): TestReport {
  const expected = session.expectedValues as ExpectedValues;
  const submitted = session.submittedValues as SubmittedValues | null;

  const hasSubmitClick = events.some((e) => e.eventType === "submit_click");

  const accuracy = scoreAccuracy(expected, submitted ?? { cardholderName: "", cardNumber: "", cardExpiry: "", cardCvv: "", billingZip: "" });
  const completion = scoreCompletion(session, submitted, hasSubmitClick);
  const speed = scoreSpeed(session);
  const efficiency = scoreEfficiency(events);

  const overallScore = Math.round(
    (accuracy.score * SCORING_WEIGHTS.accuracy +
      completion.score * SCORING_WEIGHTS.completion +
      speed.score * SCORING_WEIGHTS.speed +
      efficiency.score * SCORING_WEIGHTS.efficiency) / 100,
  );

  const grade = getGrade(overallScore);

  const fieldBreakdown = buildFieldBreakdown(expected, submitted, events);
  const gaps = detectTimelineGaps(events);

  let pageLoadToFirstMs = 0;
  let firstToSubmitMs = 0;
  if (session.pageLoadedAt && session.firstInteractionAt) {
    pageLoadToFirstMs = session.firstInteractionAt.getTime() - session.pageLoadedAt.getTime();
  }
  if (session.firstInteractionAt && session.submittedAt) {
    firstToSubmitMs = session.submittedAt.getTime() - session.firstInteractionAt.getTime();
  }

  const flags: string[] = [];
  if (accuracy.mismatches.length > 0) {
    flags.push(`${accuracy.mismatches.join(", ")} value(s) did not match expected`);
  }
  if (gaps.length > 0) {
    flags.push(`${gaps.length} hesitation gap(s) detected between fields`);
  }
  if (efficiency.retypes > 0) {
    flags.push(`${efficiency.retypes} retype(s) — agent deleted and re-entered values`);
  }

  const dropdownFields = fieldBreakdown.filter((f) => f.field_name === "expiryMonth" || f.field_name === "expiryYear");
  const textFields = fieldBreakdown.filter((f) => f.field_name !== "expiryMonth" && f.field_name !== "expiryYear");
  const avgDropdownTime = dropdownFields.reduce((s, f) => s + f.time_to_fill_ms, 0) / (dropdownFields.length || 1);
  const avgTextTime = textFields.reduce((s, f) => s + f.time_to_fill_ms, 0) / (textFields.length || 1);
  if (avgTextTime > 0 && avgDropdownTime > avgTextTime * 3) {
    flags.push("Dropdown fields took 3x longer than text fields");
  }

  return {
    test_id: session.testId,
    checkout_type: session.checkoutType,
    overall_score: overallScore,
    grade,
    summary: buildSummary(overallScore, grade, completion.fields_filled, completion.total_fields, speed.total_seconds, accuracy.mismatches),
    scores: { accuracy, completion, speed, efficiency },
    field_breakdown: fieldBreakdown,
    timeline: {
      page_load_to_first_interaction_ms: pageLoadToFirstMs,
      first_interaction_to_submit_ms: firstToSubmitMs,
      gaps,
    },
    approval: approvalInfo ?? { required: false },
    flags,
  };
}
