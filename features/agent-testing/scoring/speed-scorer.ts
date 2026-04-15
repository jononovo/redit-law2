import type { SpeedScore } from "../types";
import { SCORING_WEIGHTS, SPEED_BENCHMARKS, HESITATION_GAP_MS } from "../constants";
import type { AgentTestSession, AgentTestFieldEvent } from "@/shared/schema";
import type { TimelineGap } from "../types";

function getBenchmarkLabel(seconds: number): string {
  if (seconds <= 30) return "excellent";
  if (seconds <= 60) return "good";
  if (seconds <= 120) return "fair";
  if (seconds <= 180) return "slow";
  return "very_slow";
}

export function scoreSpeed(session: AgentTestSession): SpeedScore {
  const pageLoaded = session.pageLoadedAt;
  const submitted = session.submittedAt;

  if (!pageLoaded || !submitted) {
    return {
      score: 0,
      weight: SCORING_WEIGHTS.speed,
      total_seconds: 0,
      benchmark: "incomplete",
    };
  }

  const totalMs = submitted.getTime() - pageLoaded.getTime();
  const totalSeconds = Math.round(totalMs / 1000);

  let score = 20;
  for (const b of SPEED_BENCHMARKS) {
    if (totalSeconds <= b.maxSeconds) {
      score = b.score;
      break;
    }
  }

  return {
    score,
    weight: SCORING_WEIGHTS.speed,
    total_seconds: totalSeconds,
    benchmark: getBenchmarkLabel(totalSeconds),
  };
}

export function detectTimelineGaps(events: AgentTestFieldEvent[]): TimelineGap[] {
  const gaps: TimelineGap[] = [];
  const fieldOrder: string[] = [];
  const lastBlur = new Map<string, Date>();
  const firstFocus = new Map<string, Date>();

  for (const e of events) {
    if (!e.fieldName) continue;

    if (!fieldOrder.includes(e.fieldName)) {
      fieldOrder.push(e.fieldName);
    }

    if (e.eventType === "blur") {
      lastBlur.set(e.fieldName, e.eventTimestamp);
    }

    if ((e.eventType === "focus" || e.eventType === "select") && !firstFocus.has(e.fieldName)) {
      firstFocus.set(e.fieldName, e.eventTimestamp);
    }
  }

  for (let i = 0; i < fieldOrder.length - 1; i++) {
    const afterField = fieldOrder[i];
    const beforeField = fieldOrder[i + 1];
    const blurTime = lastBlur.get(afterField);
    const focusTime = firstFocus.get(beforeField);

    if (blurTime && focusTime) {
      const gapMs = focusTime.getTime() - blurTime.getTime();
      if (gapMs > HESITATION_GAP_MS) {
        gaps.push({
          after_field: afterField,
          before_field: beforeField,
          gap_ms: gapMs,
          note: `${Math.round(gapMs / 1000)}s gap — possible difficulty with ${beforeField}`,
        });
      }
    }
  }

  return gaps;
}
