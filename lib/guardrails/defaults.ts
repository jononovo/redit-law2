export const GUARDRAIL_DEFAULTS = {
  master: {
    maxPerTxUsdc: 5,
    dailyBudgetUsdc: 20,
    monthlyBudgetUsdc: 100,
    enabled: true,
  },

  rail1: {
    maxPerTxUsdc: 5,
    dailyBudgetUsdc: 10,
    monthlyBudgetUsdc: 50,
    requireApprovalAbove: null as number | null,
    approvalMode: "ask_for_everything",
    recurringAllowed: false,
    autoPauseOnZero: true,
  },

  rail2: {
    maxPerTxUsdc: 5,
    dailyBudgetUsdc: 10,
    monthlyBudgetUsdc: 50,
    requireApprovalAbove: 0,
    approvalMode: "ask_for_everything",
    recurringAllowed: false,
    autoPauseOnZero: true,
  },

  rail4: {
    maxPerTxCents: 500,
    dailyBudgetCents: 1000,
    monthlyBudgetCents: 5000,
    requireApprovalAbove: 500 as number | null,
    approvalMode: "ask_for_everything",
    recurringAllowed: false,
    autoPauseOnZero: false,
  },

  rail5: {
    maxPerTxCents: 5000,
    dailyBudgetCents: 10000,
    monthlyBudgetCents: 50000,
    requireApprovalAbove: 2500 as number | null,
    approvalMode: "auto_approve_under_threshold",
    recurringAllowed: false,
    autoPauseOnZero: false,
  },
} as const;

export const PROCUREMENT_DEFAULTS = {
  blockedCategories: ["gambling", "adult_content", "cryptocurrency", "cash_advances"] as string[],
} as const;
