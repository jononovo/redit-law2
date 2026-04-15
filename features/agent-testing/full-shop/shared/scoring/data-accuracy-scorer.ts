import type { DerivedStageGate, FieldMismatch } from "../types";

const DATA_FIELDS: { stage: string; field: string; label: string }[] = [
  { stage: "checkout_options", field: "fullName", label: "Full Name" },
  { stage: "checkout_options", field: "street", label: "Street" },
  { stage: "checkout_options", field: "city", label: "City" },
  { stage: "checkout_options", field: "state", label: "State" },
  { stage: "checkout_options", field: "zip", label: "ZIP" },
  { stage: "payment", field: "cardholderName", label: "Cardholder Name" },
  { stage: "payment", field: "cardNumber", label: "Card Number" },
  { stage: "payment", field: "expiryMonth", label: "Expiry Month" },
  { stage: "payment", field: "expiryYear", label: "Expiry Year" },
  { stage: "payment", field: "billingZip", label: "Billing ZIP" },
];

export function calculateDataAccuracyScore(
  stageGates: DerivedStageGate[]
): { score: number; matchingFields: number; totalFields: number; mismatches: FieldMismatch[] } {
  let matchingFields = 0;
  const mismatches: FieldMismatch[] = [];
  const totalFields = DATA_FIELDS.length;

  for (const df of DATA_FIELDS) {
    const gate = stageGates.find((g) => g.stage === df.stage);
    const fieldMatch = gate?.fieldMatches[df.field];

    if (fieldMatch?.match) {
      matchingFields++;
    } else {
      mismatches.push({
        field: df.label,
        expected: fieldMatch?.expected ?? "",
        actual: fieldMatch?.actual ?? "",
      });
    }
  }

  const score = Math.round((matchingFields / totalFields) * 100);
  return { score, matchingFields, totalFields, mismatches };
}
