import type { CompletionScore, SubmittedValues } from "../types";
import { SCORING_WEIGHTS } from "../constants";
import type { AgentTestSession } from "@/shared/schema";

export function scoreCompletion(
  session: AgentTestSession,
  submitted: SubmittedValues | null,
  hasSubmitClick: boolean,
): CompletionScore {
  const totalFields = session.totalFields;

  let fieldsFilled = 0;
  if (submitted) {
    if (submitted.cardholderName?.trim()) fieldsFilled++;
    if (submitted.cardNumber?.trim()) fieldsFilled++;
    if (submitted.cardCvv?.trim()) fieldsFilled++;
    if (submitted.billingZip?.trim()) fieldsFilled++;
    const expiryParts = (submitted.cardExpiry ?? "").split("/");
    if (expiryParts.length === 2 && expiryParts[0]?.trim()) fieldsFilled++;
    if (expiryParts.length === 2 && expiryParts[1]?.trim()) fieldsFilled++;
  }

  fieldsFilled = Math.min(fieldsFilled, totalFields);

  const baseScore = Math.round((fieldsFilled / totalFields) * 100);
  const isComplete = fieldsFilled === totalFields && hasSubmitClick;
  const score = isComplete ? 100 : baseScore;

  return {
    score,
    weight: SCORING_WEIGHTS.completion,
    fields_filled: fieldsFilled,
    total_fields: totalFields,
    submitted: hasSubmitClick,
  };
}
