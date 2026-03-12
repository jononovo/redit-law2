import { describe, it, expect } from "vitest";
import { evaluateGuardrails, evaluateCardGuardrails } from "@/lib/guardrails/evaluate";
import type {
  GuardrailRules,
  TransactionRequest,
  CumulativeSpend,
  CardGuardrailRules,
  CardTransactionRequest,
  CardCumulativeSpend,
} from "@/lib/guardrails/types";

const defaultRules: GuardrailRules = {
  maxPerTxUsdc: 25,
  dailyBudgetUsdc: 50,
  monthlyBudgetUsdc: 500,
  requireApprovalAbove: 10,
  autoPauseOnZero: false,
};

const zeroSpend: CumulativeSpend = {
  dailyUsdc: 0,
  monthlyUsdc: 0,
};

describe("evaluateGuardrails", () => {
  it("allows a transaction within all limits", () => {
    const tx: TransactionRequest = { amountUsdc: 5_000_000 };
    const result = evaluateGuardrails(defaultRules, tx, zeroSpend);
    expect(result.action).toBe("allow");
  });

  it("blocks transaction exceeding per-tx limit", () => {
    const tx: TransactionRequest = { amountUsdc: 26_000_000 };
    const result = evaluateGuardrails(defaultRules, tx, zeroSpend);
    expect(result.action).toBe("block");
    expect(result).toHaveProperty("reason");
    expect((result as { reason: string }).reason).toContain("per-transaction limit");
  });

  it("blocks transaction at exactly per-tx limit + 1 micro", () => {
    const tx: TransactionRequest = { amountUsdc: 25_000_001 };
    const result = evaluateGuardrails(defaultRules, tx, zeroSpend);
    expect(result.action).toBe("block");
  });

  it("allows transaction at exactly per-tx limit", () => {
    const tx: TransactionRequest = { amountUsdc: 25_000_000 };
    const result = evaluateGuardrails(defaultRules, tx, zeroSpend);
    expect(result.action).not.toBe("block");
  });

  it("blocks when daily budget would be exceeded", () => {
    const spend: CumulativeSpend = { dailyUsdc: 45_000_000, monthlyUsdc: 45_000_000 };
    const tx: TransactionRequest = { amountUsdc: 6_000_000 };
    const result = evaluateGuardrails(defaultRules, tx, spend);
    expect(result.action).toBe("block");
    expect((result as { reason: string }).reason).toContain("daily budget");
  });

  it("allows when daily spend plus tx equals exactly the limit", () => {
    const spend: CumulativeSpend = { dailyUsdc: 45_000_000, monthlyUsdc: 45_000_000 };
    const tx: TransactionRequest = { amountUsdc: 5_000_000 };
    const result = evaluateGuardrails(defaultRules, tx, spend);
    expect(result.action).not.toBe("block");
  });

  it("blocks when monthly budget would be exceeded", () => {
    const spend: CumulativeSpend = { dailyUsdc: 0, monthlyUsdc: 496_000_000 };
    const tx: TransactionRequest = { amountUsdc: 5_000_000 };
    const result = evaluateGuardrails(defaultRules, tx, spend);
    expect(result.action).toBe("block");
    expect((result as { reason: string }).reason).toContain("monthly budget");
  });

  it("requires approval when amount meets the threshold", () => {
    const tx: TransactionRequest = { amountUsdc: 10_000_000 };
    const result = evaluateGuardrails(defaultRules, tx, zeroSpend);
    expect(result.action).toBe("require_approval");
    expect((result as { reason: string }).reason).toContain("approval threshold");
  });

  it("requires approval when amount exceeds the threshold", () => {
    const tx: TransactionRequest = { amountUsdc: 15_000_000 };
    const result = evaluateGuardrails(defaultRules, tx, zeroSpend);
    expect(result.action).toBe("require_approval");
  });

  it("allows when amount is below approval threshold", () => {
    const tx: TransactionRequest = { amountUsdc: 9_999_999 };
    const result = evaluateGuardrails(defaultRules, tx, zeroSpend);
    expect(result.action).toBe("allow");
  });

  it("allows any amount when requireApprovalAbove is null", () => {
    const rules: GuardrailRules = { ...defaultRules, requireApprovalAbove: null };
    const tx: TransactionRequest = { amountUsdc: 24_000_000 };
    const result = evaluateGuardrails(rules, tx, zeroSpend);
    expect(result.action).toBe("allow");
  });

  it("checks per-tx limit before daily/monthly", () => {
    const spend: CumulativeSpend = { dailyUsdc: 49_000_000, monthlyUsdc: 499_000_000 };
    const tx: TransactionRequest = { amountUsdc: 26_000_000 };
    const result = evaluateGuardrails(defaultRules, tx, spend);
    expect(result.action).toBe("block");
    expect((result as { reason: string }).reason).toContain("per-transaction");
  });
});

describe("evaluateCardGuardrails", () => {
  const cardRules: CardGuardrailRules = {
    maxPerTxCents: 2500,
    dailyBudgetCents: 5000,
    monthlyBudgetCents: 50000,
    requireApprovalAbove: 1000,
    autoPauseOnZero: false,
  };

  const zeroCardSpend: CardCumulativeSpend = {
    dailyCents: 0,
    monthlyCents: 0,
  };

  it("allows a transaction within all limits", () => {
    const tx: CardTransactionRequest = { amountCents: 500 };
    const result = evaluateCardGuardrails(cardRules, tx, zeroCardSpend);
    expect(result.action).toBe("allow");
  });

  it("blocks transaction exceeding per-tx limit", () => {
    const tx: CardTransactionRequest = { amountCents: 2501 };
    const result = evaluateCardGuardrails(cardRules, tx, zeroCardSpend);
    expect(result.action).toBe("block");
    expect((result as { reason: string }).reason).toContain("per-transaction limit");
  });

  it("blocks when daily budget would be exceeded", () => {
    const spend: CardCumulativeSpend = { dailyCents: 4500, monthlyCents: 4500 };
    const tx: CardTransactionRequest = { amountCents: 501 };
    const result = evaluateCardGuardrails(cardRules, tx, spend);
    expect(result.action).toBe("block");
    expect((result as { reason: string }).reason).toContain("daily budget");
  });

  it("blocks when monthly budget would be exceeded", () => {
    const spend: CardCumulativeSpend = { dailyCents: 0, monthlyCents: 49501 };
    const tx: CardTransactionRequest = { amountCents: 500 };
    const result = evaluateCardGuardrails(cardRules, tx, spend);
    expect(result.action).toBe("block");
    expect((result as { reason: string }).reason).toContain("monthly budget");
  });

  it("requires approval when amount meets threshold", () => {
    const tx: CardTransactionRequest = { amountCents: 1000 };
    const result = evaluateCardGuardrails(cardRules, tx, zeroCardSpend);
    expect(result.action).toBe("require_approval");
  });

  it("allows when approval threshold is null", () => {
    const rules: CardGuardrailRules = { ...cardRules, requireApprovalAbove: null };
    const tx: CardTransactionRequest = { amountCents: 2400 };
    const result = evaluateCardGuardrails(rules, tx, zeroCardSpend);
    expect(result.action).toBe("allow");
  });
});
