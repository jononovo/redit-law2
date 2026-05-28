export interface GuardrailRules {
  maxPerTxUsdc: number;
  dailyBudgetUsdc: number;
  monthlyBudgetUsdc: number;
  requireApprovalAbove: number | null;
}

export interface CardGuardrailRules {
  maxPerTxCents: number;
  dailyBudgetCents: number;
  monthlyBudgetCents: number;
  requireApprovalAbove: number | null;
}

export interface TransactionRequest {
  amountUsdc: number;
}

export interface CardTransactionRequest {
  amountCents: number;
}

export interface CumulativeSpend {
  dailyUsdc: number;
  monthlyUsdc: number;
}

export interface CardCumulativeSpend {
  dailyCents: number;
  monthlyCents: number;
}

export type GuardrailDecision =
  | { action: "allow" }
  | { action: "block"; reason: string }
  | { action: "require_approval"; reason: string };
