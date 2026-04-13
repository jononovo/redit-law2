import type { AccuracyScore, ExpectedValues, SubmittedValues } from "../types";
import { SCORING_WEIGHTS } from "../constants";

function normalize(val: string): string {
  return val.trim().toLowerCase().replace(/[\s-]/g, "");
}

const EXPECTED_KEYS: (keyof ExpectedValues)[] = [
  "cardholderName",
  "cardNumber",
  "cardExpiry",
  "cardCvv",
  "billingZip",
];

export function scoreAccuracy(
  expected: ExpectedValues,
  submitted: SubmittedValues,
): AccuracyScore {
  let correct = 0;
  const mismatches: string[] = [];

  for (const key of EXPECTED_KEYS) {
    const exp = normalize(expected[key] ?? "");
    const sub = normalize(submitted[key] ?? "");
    if (exp === sub) {
      correct++;
    } else {
      mismatches.push(key);
    }
  }

  const total = EXPECTED_KEYS.length;
  const score = Math.round((correct / total) * 100);

  return {
    score,
    weight: SCORING_WEIGHTS.accuracy,
    correct,
    total,
    mismatches,
  };
}
