import type {
  GuardrailRules, TransactionRequest, CumulativeSpend,
  CardGuardrailRules, CardTransactionRequest, CardCumulativeSpend,
  GuardrailDecision,
} from "./types";

function usdToMicroUsdc(usd: number): number {
  return Math.round(usd * 1_000_000);
}

export function evaluateGuardrails(
  rules: GuardrailRules,
  tx: TransactionRequest,
  spend: CumulativeSpend
): GuardrailDecision {
  const maxPerTxMicro = usdToMicroUsdc(rules.maxPerTxUsdc);
  if (tx.amountUsdc > maxPerTxMicro) {
    return { action: "block", reason: `Amount exceeds per-transaction limit of $${rules.maxPerTxUsdc}` };
  }

  const dailyLimitMicro = usdToMicroUsdc(rules.dailyBudgetUsdc);
  if (spend.dailyUsdc + tx.amountUsdc > dailyLimitMicro) {
    return { action: "block", reason: "Would exceed daily budget" };
  }

  const monthlyLimitMicro = usdToMicroUsdc(rules.monthlyBudgetUsdc);
  if (spend.monthlyUsdc + tx.amountUsdc > monthlyLimitMicro) {
    return { action: "block", reason: "Would exceed monthly budget" };
  }

  if (rules.requireApprovalAbove !== null && rules.requireApprovalAbove !== undefined) {
    const approvalThresholdMicro = usdToMicroUsdc(rules.requireApprovalAbove);
    if (tx.amountUsdc >= approvalThresholdMicro) {
      return { action: "require_approval", reason: `Amount exceeds approval threshold of $${rules.requireApprovalAbove}` };
    }
  }

  return { action: "allow" };
}

export function evaluateCardGuardrails(
  rules: CardGuardrailRules,
  tx: CardTransactionRequest,
  spend: CardCumulativeSpend
): GuardrailDecision {
  if (tx.amountCents > rules.maxPerTxCents) {
    return {
      action: "block",
      reason: `Amount $${(tx.amountCents / 100).toFixed(2)} exceeds per-transaction limit of $${(rules.maxPerTxCents / 100).toFixed(2)}`,
    };
  }

  if (spend.dailyCents + tx.amountCents > rules.dailyBudgetCents) {
    return {
      action: "block",
      reason: `Would exceed daily budget of $${(rules.dailyBudgetCents / 100).toFixed(2)}`,
    };
  }

  if (spend.monthlyCents + tx.amountCents > rules.monthlyBudgetCents) {
    return {
      action: "block",
      reason: `Would exceed monthly budget of $${(rules.monthlyBudgetCents / 100).toFixed(2)}`,
    };
  }

  if (rules.requireApprovalAbove !== null && rules.requireApprovalAbove !== undefined) {
    if (tx.amountCents >= rules.requireApprovalAbove) {
      return {
        action: "require_approval",
        reason: `Amount $${(tx.amountCents / 100).toFixed(2)} exceeds approval threshold of $${(rules.requireApprovalAbove / 100).toFixed(2)}`,
      };
    }
  }

  return { action: "allow" };
}
