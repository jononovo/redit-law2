export const GUARDRAIL_DEFAULTS = {
  master: {
    maxPerTxUsdc: 5,
    dailyBudgetUsdc: 20,
    monthlyBudgetUsdc: 100,
    enabled: true,
    approvalMode: "ask_for_everything" as const,
    requireApprovalAbove: null as number | null,
  },

  rail1: {
    maxPerTxUsdc: 5,
    dailyBudgetUsdc: 10,
    monthlyBudgetUsdc: 50,
    recurringAllowed: false,
    autoPauseOnZero: true,
  },

  rail2: {
    maxPerTxUsdc: 5,
    dailyBudgetUsdc: 10,
    monthlyBudgetUsdc: 50,
    recurringAllowed: false,
    autoPauseOnZero: true,
  },

  rail5: {
    maxPerTxCents: 5000,
    dailyBudgetCents: 10000,
    monthlyBudgetCents: 50000,
    recurringAllowed: false,
    autoPauseOnZero: false,
  },
} as const;

export const PROCUREMENT_DEFAULTS = {
  blockedCategories: ["gambling", "adult_content", "cryptocurrency", "cash_advances"] as string[],
} as const;
