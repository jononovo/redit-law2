import type { DerivedStageGate } from "../types";

const TOTAL_STAGES = 8;
const TERMS_BONUS = 5;

export function calculateFlowCompletionScore(
  stageGates: DerivedStageGate[]
): { score: number; stagesCompleted: number; totalStages: 8; termsChecked: boolean } {
  let stagesCompleted = 0;

  for (const gate of stageGates) {
    if (gate.eventCount > 0) {
      stagesCompleted++;
    }
  }

  const paymentGate = stageGates.find((g) => g.stage === "payment");
  const termsChecked = paymentGate?.fieldMatches["termsChecked"]?.match === true;

  let score = Math.round((stagesCompleted / TOTAL_STAGES) * 100);
  if (termsChecked) {
    score = Math.min(100, score + TERMS_BONUS);
  }

  return { score, stagesCompleted, totalStages: 8, termsChecked };
}
