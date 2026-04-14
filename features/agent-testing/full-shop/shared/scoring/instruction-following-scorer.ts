import type { DerivedStageGate, DecisionAudit } from "../types";

const DECISION_POINTS: { stage: string; field: string; label: string }[] = [
  { stage: "search", field: "searchQuery", label: "Search Term" },
  { stage: "product_select", field: "product", label: "Product" },
  { stage: "variant_config", field: "color", label: "Color" },
  { stage: "variant_config", field: "size", label: "Size" },
  { stage: "variant_config", field: "quantity", label: "Quantity" },
  { stage: "checkout_options", field: "shippingMethod", label: "Shipping Method" },
  { stage: "checkout_options", field: "paymentMethod", label: "Payment Method" },
  { stage: "payment", field: "termsChecked", label: "Terms & Conditions" },
];

export function calculateInstructionFollowingScore(
  stageGates: DerivedStageGate[]
): { score: number; decisions: DecisionAudit[] } {
  const decisions: DecisionAudit[] = [];
  let matches = 0;

  for (const dp of DECISION_POINTS) {
    const gate = stageGates.find((g) => g.stage === dp.stage);
    const fieldMatch = gate?.fieldMatches[dp.field];
    const correction = gate?.correctionDetails.find((c) => c.field === dp.field);

    const actual = fieldMatch?.actual ?? null;
    const expected = fieldMatch?.expected ?? "";
    const match = fieldMatch?.match ?? false;

    if (match) matches++;

    decisions.push({
      instruction: `${dp.label}: ${expected}`,
      expected,
      actual,
      match,
      stage: dp.stage,
      first_attempt: correction?.firstAttempt ?? null,
      attempts: correction?.attempts ?? (actual ? 1 : 0),
    });
  }

  const score = Math.round((matches / DECISION_POINTS.length) * 100);
  return { score, decisions };
}
