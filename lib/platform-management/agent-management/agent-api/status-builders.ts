import { storage } from "@/server/storage";
import { GUARDRAIL_DEFAULTS } from "@/lib/agent-interaction/guardrails/defaults";

export async function buildRail1Detail(botId: string) {
  const wallet = await storage.privyGetWalletByBotId(botId);
  if (!wallet) return { status: "inactive" as const };

  const [guardrails, dailySpend, monthlySpend, allPendingApprovals, masterGuardrails] = await Promise.all([
    storage.privyGetGuardrails(wallet.id),
    storage.privyGetDailySpend(wallet.id),
    storage.privyGetMonthlySpend(wallet.id),
    storage.getUnifiedApprovalsByOwnerUid(wallet.ownerUid, "pending"),
    storage.getMasterGuardrails(wallet.ownerUid),
  ]);
  const pendingApprovals = allPendingApprovals.filter(a => a.rail === "rail1");

  const maxPerTx = guardrails?.maxPerTxUsdc ?? GUARDRAIL_DEFAULTS.rail1.maxPerTxUsdc;
  const dailyBudget = guardrails?.dailyBudgetUsdc ?? GUARDRAIL_DEFAULTS.rail1.dailyBudgetUsdc;
  const monthlyBudget = guardrails?.monthlyBudgetUsdc ?? GUARDRAIL_DEFAULTS.rail1.monthlyBudgetUsdc;
  const dailySpendUsd = dailySpend / 1_000_000;
  const monthlySpendUsd = monthlySpend / 1_000_000;

  const procRules = await storage.getProcurementControlsByScope(wallet.ownerUid, "rail1", null);

  return {
    status: wallet.status === "active" ? "active" as const : "inactive" as const,
    balance_usd: wallet.balanceUsdc / 1_000_000,
    address: wallet.address,
    guardrails: {
      max_per_tx_usd: maxPerTx,
      daily_budget_usd: dailyBudget,
      monthly_budget_usd: monthlyBudget,
      daily_spent_usd: dailySpendUsd,
      daily_remaining_usd: Math.max(0, dailyBudget - dailySpendUsd),
      monthly_spent_usd: monthlySpendUsd,
      monthly_remaining_usd: Math.max(0, monthlyBudget - monthlySpendUsd),
      require_approval_above_usd: masterGuardrails?.requireApprovalAbove != null ? masterGuardrails.requireApprovalAbove / 100 : null,
      approval_mode: masterGuardrails?.approvalMode ?? GUARDRAIL_DEFAULTS.master.approvalMode,
      recurring_allowed: guardrails?.recurringAllowed ?? GUARDRAIL_DEFAULTS.rail1.recurringAllowed,
      notes: guardrails?.notes ?? null,
    },
    domain_rules: {
      allowlisted: (procRules?.allowlistedDomains as string[]) ?? [],
      blocklisted: (procRules?.blocklistedDomains as string[]) ?? [],
    },
    pending_approvals: pendingApprovals.length,
  };
}

export async function buildRail2Detail(botId: string) {
  const wallet = await storage.crossmintGetWalletByBotId(botId);
  if (!wallet) return { status: "inactive" as const };

  const [guardrails, dailySpend, monthlySpend, masterGuardrails] = await Promise.all([
    storage.crossmintGetGuardrails(wallet.id),
    storage.crossmintGetDailySpend(wallet.id),
    storage.crossmintGetMonthlySpend(wallet.id),
    storage.getMasterGuardrails(wallet.ownerUid),
  ]);

  const maxPerTx = guardrails?.maxPerTxUsdc ?? GUARDRAIL_DEFAULTS.rail2.maxPerTxUsdc;
  const dailyBudget = guardrails?.dailyBudgetUsdc ?? GUARDRAIL_DEFAULTS.rail2.dailyBudgetUsdc;
  const monthlyBudget = guardrails?.monthlyBudgetUsdc ?? GUARDRAIL_DEFAULTS.rail2.monthlyBudgetUsdc;
  const dailySpendUsd = dailySpend / 1_000_000;
  const monthlySpendUsd = monthlySpend / 1_000_000;

  const procRules = await storage.getProcurementControlsByScope(wallet.ownerUid, "rail2", null);

  return {
    status: wallet.status === "active" ? "active" as const : "inactive" as const,
    balance_usd: wallet.balanceUsdc / 1_000_000,
    address: wallet.address,
    guardrails: {
      max_per_tx_usd: maxPerTx,
      daily_budget_usd: dailyBudget,
      monthly_budget_usd: monthlyBudget,
      daily_spent_usd: dailySpendUsd,
      daily_remaining_usd: Math.max(0, dailyBudget - dailySpendUsd),
      monthly_spent_usd: monthlySpendUsd,
      monthly_remaining_usd: Math.max(0, monthlyBudget - monthlySpendUsd),
      require_approval_above_usd: masterGuardrails?.requireApprovalAbove != null ? masterGuardrails.requireApprovalAbove / 100 : null,
      approval_mode: masterGuardrails?.approvalMode ?? GUARDRAIL_DEFAULTS.master.approvalMode,
      recurring_allowed: guardrails?.recurringAllowed ?? GUARDRAIL_DEFAULTS.rail2.recurringAllowed,
      notes: guardrails?.notes ?? null,
    },
    merchant_rules: {
      allowlisted: (procRules?.allowlistedMerchants as string[]) ?? [],
      blocklisted: (procRules?.blocklistedMerchants as string[]) ?? [],
    },
  };
}

export async function buildRail5Detail(botId: string) {
  const card = await storage.getRail5CardByBotId(botId);
  if (!card) return { status: "inactive" as const };

  const [guard, masterGuardrails] = await Promise.all([
    storage.getRail5Guardrails(card.cardId),
    storage.getMasterGuardrails(card.ownerUid),
  ]);

  return {
    status: card.status === "active" ? "active" as const : card.status,
    card_id: card.cardId,
    card_name: card.cardName,
    card_brand: card.cardBrand,
    last4: card.cardLast4,
    guardrails: {
      max_per_tx_usd: (guard?.maxPerTxCents ?? GUARDRAIL_DEFAULTS.rail5.maxPerTxCents) / 100,
      daily_budget_usd: (guard?.dailyBudgetCents ?? GUARDRAIL_DEFAULTS.rail5.dailyBudgetCents) / 100,
      monthly_budget_usd: (guard?.monthlyBudgetCents ?? GUARDRAIL_DEFAULTS.rail5.monthlyBudgetCents) / 100,
      require_approval_above_usd: masterGuardrails?.requireApprovalAbove != null ? masterGuardrails.requireApprovalAbove / 100 : null,
      approval_mode: masterGuardrails?.approvalMode ?? GUARDRAIL_DEFAULTS.master.approvalMode,
      recurring_allowed: guard?.recurringAllowed ?? GUARDRAIL_DEFAULTS.rail5.recurringAllowed,
      notes: guard?.notes ?? null,
    },
    limits: {
      per_transaction_usd: (guard?.maxPerTxCents ?? GUARDRAIL_DEFAULTS.rail5.maxPerTxCents) / 100,
      daily_usd: (guard?.dailyBudgetCents ?? GUARDRAIL_DEFAULTS.rail5.dailyBudgetCents) / 100,
      monthly_usd: (guard?.monthlyBudgetCents ?? GUARDRAIL_DEFAULTS.rail5.monthlyBudgetCents) / 100,
      human_approval_above_usd: masterGuardrails?.requireApprovalAbove != null ? masterGuardrails.requireApprovalAbove / 100 : null,
    },
  };
}
