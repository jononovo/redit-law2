import type { DerivedStageGate } from "../types";
import { FULL_SHOP_SPEED_BENCHMARKS } from "../constants";

export function calculateFullShopSpeedScore(
  stageGates: DerivedStageGate[]
): { score: number; totalSeconds: number; benchmark: string } {
  const allTimestamps: number[] = [];

  for (const gate of stageGates) {
    if (gate.startedAt) allTimestamps.push(new Date(gate.startedAt).getTime());
    if (gate.completedAt) allTimestamps.push(new Date(gate.completedAt).getTime());
  }

  if (allTimestamps.length < 2) {
    return { score: 0, totalSeconds: 0, benchmark: "No data" };
  }

  const totalMs = Math.max(...allTimestamps) - Math.min(...allTimestamps);
  const totalSeconds = Math.round(totalMs / 1000);

  for (const bench of FULL_SHOP_SPEED_BENCHMARKS) {
    if (totalSeconds <= bench.maxSeconds) {
      return { score: bench.score, totalSeconds, benchmark: bench.label };
    }
  }

  return { score: 25, totalSeconds, benchmark: "Very Slow" };
}
