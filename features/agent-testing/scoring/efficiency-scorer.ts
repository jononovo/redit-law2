import type { EfficiencyScore } from "../types";
import { SCORING_WEIGHTS, AGENT_TEST_FIELDS } from "../constants";
import type { AgentTestFieldEvent } from "@/shared/schema";

export function scoreEfficiency(events: AgentTestFieldEvent[]): EfficiencyScore {
  const fieldEvents = events.filter((e) => e.fieldName && e.eventType !== "page_load" && e.eventType !== "submit_click");

  const totalEvents = fieldEvents.length;
  const fieldCount = AGENT_TEST_FIELDS.length;

  let retypes = 0;
  let refocuses = 0;

  const focusCounts = new Map<string, number>();
  const valueLengthHistory = new Map<string, number[]>();

  for (const e of fieldEvents) {
    const fn = e.fieldName!;

    if (e.eventType === "focus") {
      focusCounts.set(fn, (focusCounts.get(fn) ?? 0) + 1);
    }

    if (e.eventType === "input") {
      const hist = valueLengthHistory.get(fn) ?? [];
      hist.push(e.valueLength);
      valueLengthHistory.set(fn, hist);
    }
  }

  for (const [, count] of focusCounts) {
    if (count > 1) refocuses += count - 1;
  }

  for (const [, hist] of valueLengthHistory) {
    for (let i = 1; i < hist.length; i++) {
      if (hist[i] < hist[i - 1] && i + 1 < hist.length && hist[i + 1] > hist[i]) {
        retypes++;
      }
    }
  }

  const penaltyPerRetype = 5;
  const penaltyPerRefocus = 3;
  const excessEventsPenalty = Math.max(0, Math.floor((totalEvents - fieldCount * 3) / 3) * 2);

  const score = Math.max(0, Math.min(100, 100 - retypes * penaltyPerRetype - refocuses * penaltyPerRefocus - excessEventsPenalty));

  return {
    score,
    weight: SCORING_WEIGHTS.efficiency,
    total_events: totalEvents,
    avg_events_per_field: fieldCount > 0 ? Math.round((totalEvents / fieldCount) * 10) / 10 : 0,
    retypes,
    refocuses,
  };
}
