import type {
  FullShopFieldEvent,
  FullShopScenarioConfig,
  FullShopTestReport,
  DerivedStageGate,
  TimelineGap,
} from "../types";
import { FULL_SHOP_SCORING_WEIGHTS, FULL_SHOP_GRADE_THRESHOLDS } from "../constants";
import { deriveStageGatesFromEventLog } from "../derive-stage-gates";
import { buildEventNarrative } from "../build-event-narrative";
import { calculateInstructionFollowingScore } from "./instruction-following-scorer";
import { calculateDataAccuracyScore } from "./data-accuracy-scorer";
import { calculateFlowCompletionScore } from "./flow-completion-scorer";
import { calculateFullShopSpeedScore } from "./speed-scorer";
import { calculateNavigationEfficiencyScore } from "./navigation-efficiency-scorer";

function computeGrade(score: number): string {
  for (const threshold of FULL_SHOP_GRADE_THRESHOLDS) {
    if (score >= threshold.min) return threshold.grade;
  }
  return "F";
}

function computeTimeline(
  stageGates: DerivedStageGate[],
  events: FullShopFieldEvent[]
): FullShopTestReport["timeline"] {
  const allTimestamps = events.map((e) => new Date(e.event_timestamp).getTime());
  const total_duration_ms =
    allTimestamps.length >= 2
      ? Math.max(...allTimestamps) - Math.min(...allTimestamps)
      : 0;

  const per_stage_duration_ms: Record<string, number> = {};
  for (const gate of stageGates) {
    per_stage_duration_ms[gate.stage] = gate.durationMs;
  }

  const gaps: TimelineGap[] = [];
  let wasted_time_ms = 0;

  for (let i = 0; i < stageGates.length - 1; i++) {
    const current = stageGates[i];
    const next = stageGates[i + 1];
    if (current.completedAt && next.startedAt) {
      const gapMs =
        new Date(next.startedAt).getTime() -
        new Date(current.completedAt).getTime();
      if (gapMs > 5000) {
        gaps.push({
          after_stage: current.stage,
          before_stage: next.stage,
          gap_ms: gapMs,
          note: `${Math.round(gapMs / 1000)}s gap between stages`,
        });
        wasted_time_ms += gapMs;
      }
    }
  }

  return { total_duration_ms, per_stage_duration_ms, gaps, wasted_time_ms };
}

function buildSummary(
  grade: string,
  score: number,
  stagesCompleted: number
): string {
  if (grade === "A") {
    return `Excellent performance. The agent completed all ${stagesCompleted}/8 stages with high accuracy and efficiency.`;
  }
  if (grade === "B") {
    return `Good performance. The agent scored ${score}/100 across ${stagesCompleted}/8 stages with minor issues.`;
  }
  if (grade === "C") {
    return `Average performance. The agent scored ${score}/100 with some mistakes or missed steps.`;
  }
  if (grade === "D") {
    return `Below average. The agent scored ${score}/100 and struggled with several instructions.`;
  }
  return `Poor performance. The agent scored ${score}/100 and failed to follow most instructions correctly.`;
}

function detectFlags(
  stageGates: DerivedStageGate[],
  events: FullShopFieldEvent[]
): string[] {
  const flags: string[] = [];

  const incompletStages = stageGates.filter((g) => g.eventCount === 0);
  if (incompletStages.length > 0) {
    flags.push(
      `Skipped ${incompletStages.length} stage(s): ${incompletStages.map((s) => s.stage).join(", ")}`
    );
  }

  const totalCorrections = stageGates.reduce((sum, g) => sum + g.corrections, 0);
  if (totalCorrections > 3) {
    flags.push(`High correction count: ${totalCorrections} corrections across all stages`);
  }

  const paymentGate = stageGates.find((g) => g.stage === "payment");
  if (paymentGate && paymentGate.fieldMatches["termsChecked"]?.actual === "false") {
    flags.push("Terms and Conditions were unchecked at the end");
  }

  const allTimestamps = events.map((e) => new Date(e.event_timestamp).getTime());
  if (allTimestamps.length >= 2) {
    const totalMs = Math.max(...allTimestamps) - Math.min(...allTimestamps);
    if (totalMs > 720_000) {
      flags.push(`Very long test duration: ${Math.round(totalMs / 1000)}s`);
    }
  }

  return flags;
}

export function generateFullShopReport(
  testId: string,
  scenarioId: string,
  events: FullShopFieldEvent[],
  scenario: FullShopScenarioConfig
): FullShopTestReport {
  const stageGates = deriveStageGatesFromEventLog(events, scenario);
  const narrative = buildEventNarrative(events, scenario);

  const instrResult = calculateInstructionFollowingScore(stageGates);
  const dataResult = calculateDataAccuracyScore(stageGates);
  const flowResult = calculateFlowCompletionScore(stageGates);
  const speedResult = calculateFullShopSpeedScore(stageGates);
  const navResult = calculateNavigationEfficiencyScore(events);

  const weights = FULL_SHOP_SCORING_WEIGHTS;
  const overall_score = Math.round(
    (instrResult.score * weights.instructionFollowing +
      dataResult.score * weights.dataAccuracy +
      flowResult.score * weights.flowCompletion +
      speedResult.score * weights.speed +
      navResult.score * weights.navigationEfficiency) /
      100
  );

  const grade = computeGrade(overall_score);
  const timeline = computeTimeline(stageGates, events);
  const flags = detectFlags(stageGates, events);
  const summary = buildSummary(grade, overall_score, flowResult.stagesCompleted);

  return {
    test_id: testId,
    test_type: "full_shop",
    scenario_id: scenarioId,
    overall_score,
    grade,
    summary,
    scores: {
      instructionFollowing: {
        score: instrResult.score,
        weight: 35,
        decisions: instrResult.decisions,
      },
      dataAccuracy: {
        score: dataResult.score,
        weight: 25,
        matchingFields: dataResult.matchingFields,
        totalFields: dataResult.totalFields,
        mismatches: dataResult.mismatches,
      },
      flowCompletion: {
        score: flowResult.score,
        weight: 20,
        stagesCompleted: flowResult.stagesCompleted,
        totalStages: 8,
        termsChecked: flowResult.termsChecked,
      },
      speed: {
        score: speedResult.score,
        weight: 10,
        totalSeconds: speedResult.totalSeconds,
        benchmark: speedResult.benchmark,
      },
      navigationEfficiency: {
        score: navResult.score,
        weight: 10,
        backtracks: navResult.backtracks,
        wrongClicks: navResult.wrongClicks,
        corrections: navResult.corrections,
      },
    },
    stage_breakdown: stageGates,
    decision_audit: instrResult.decisions,
    event_narrative: narrative,
    raw_event_count: events.length,
    timeline,
    flags,
  };
}
