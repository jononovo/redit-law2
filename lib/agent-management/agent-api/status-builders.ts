import { storage } from "@/server/storage";
import { GUARDRAIL_DEFAULTS } from "@/lib/guardrails/defaults";

export async function buildRail1Detail(botId: string) {
  const wallet = await storage.privyGetWalletByBotId(botId);
  if (!wallet) return { status: "inactive" as const };

  const [guardrails, dailySpend, monthlySpend, allPendingApprovals] = await Promise.all([
    storage.privyGetGuardrails(wallet.id),
    storage.privyGetDailySpend(wallet.id),
    storage.privyGetMonthlySpend(wallet.id),
    storage.getUnifiedApprovalsByOwnerUid(wallet.ownerUid, "pending"),
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
      require_approval_above_usd: guardrails?.requireApprovalAbove ?? null,
      approval_mode: guardrails?.approvalMode ?? GUARDRAIL_DEFAULTS.rail1.approvalMode,
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

  const [guardrails, dailySpend, monthlySpend] = await Promise.all([
    storage.crossmintGetGuardrails(wallet.id),
    storage.crossmintGetDailySpend(wallet.id),
    storage.crossmintGetMonthlySpend(wallet.id),
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
      require_approval_above_usd: guardrails?.requireApprovalAbove ?? 0,
      approval_mode: guardrails?.approvalMode ?? GUARDRAIL_DEFAULTS.rail2.approvalMode,
      recurring_allowed: guardrails?.recurringAllowed ?? GUARDRAIL_DEFAULTS.rail2.recurringAllowed,
      notes: guardrails?.notes ?? null,
    },
    merchant_rules: {
      allowlisted: (procRules?.allowlistedMerchants as string[]) ?? [],
      blocklisted: (procRules?.blocklistedMerchants as string[]) ?? [],
    },
  };
}

function getAllowanceWindowStart(duration: "day" | "week" | "month"): Date {
  const now = new Date();
  if (duration === "day") {
    now.setHours(0, 0, 0, 0);
    return now;
  }
  if (duration === "week") {
    const day = now.getDay();
    now.setDate(now.getDate() - day);
    now.setHours(0, 0, 0, 0);
    return now;
  }
  now.setDate(1);
  now.setHours(0, 0, 0, 0);
  return now;
}

function getAllowanceWindowEnd(duration: "day" | "week" | "month"): string {
  const now = new Date();
  if (duration === "day") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }
  if (duration === "week") {
    const day = now.getDay();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + (7 - day));
    nextWeek.setHours(0, 0, 0, 0);
    return nextWeek.toISOString();
  }
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

export async function buildRail4Detail(botId: string) {
  const cards = await storage.getRail4CardsByBotId(botId);
  if (cards.length === 0) return { status: "inactive" as const };

  const cardDetails = await Promise.all(
    cards.map(async (card) => {
      let profiles: any[] = [];
      let permissionsList: any[] = [];
      if (card.profilePermissions) {
        try {
          permissionsList = JSON.parse(card.profilePermissions);
          if (!Array.isArray(permissionsList)) permissionsList = [permissionsList];
        } catch {}
      }

      for (const perm of permissionsList) {
        const duration = perm.allowance_duration || "month";
        const windowStart = getAllowanceWindowStart(duration);
        const resetsAt = getAllowanceWindowEnd(duration);
        const profileIndex = perm.profile_index ?? card.realProfileIndex;

        const usage = await storage.getProfileAllowanceUsage(
          card.cardId,
          profileIndex,
          windowStart,
        );

        const allowanceValueUsd = perm.allowance_value ?? 0;
        const spentUsd = (usage?.spentCents ?? 0) / 100;

        profiles.push({
          profile_index: profileIndex,
          allowance_usd: allowanceValueUsd,
          spent_usd: spentUsd,
          remaining_usd: Math.max(0, allowanceValueUsd - spentUsd),
          resets_at: resetsAt,
        });
      }

      const realProfilePerm = permissionsList.find(p => p.profile_index === card.realProfileIndex);

      const guard = await storage.getRail4Guardrails(card.cardId);

      return {
        card_id: card.cardId,
        card_name: card.cardName,
        use_case: card.useCase,
        status: card.status,
        profiles,
        approval_mode: realProfilePerm?.human_permission_required ?? "all",
        approval_threshold_usd: realProfilePerm?.confirmation_exempt_limit ?? 0,
        guardrails: guard ? {
          max_per_tx_usd: guard.maxPerTxCents / 100,
          daily_budget_usd: guard.dailyBudgetCents / 100,
          monthly_budget_usd: guard.monthlyBudgetCents / 100,
          require_approval_above_usd: guard.requireApprovalAbove != null ? guard.requireApprovalAbove / 100 : null,
          approval_mode: guard.approvalMode ?? GUARDRAIL_DEFAULTS.rail4.approvalMode,
          recurring_allowed: guard.recurringAllowed,
          notes: guard.notes ?? null,
        } : null,
      };
    }),
  );

  return {
    status: "active" as const,
    card_count: cards.length,
    cards: cardDetails,
  };
}

export async function buildRail5Detail(botId: string) {
  const card = await storage.getRail5CardByBotId(botId);
  if (!card) return { status: "inactive" as const };

  const guard = await storage.getRail5Guardrails(card.cardId);

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
      require_approval_above_usd: (guard?.requireApprovalAbove ?? GUARDRAIL_DEFAULTS.rail5.requireApprovalAbove ?? 2500) / 100,
      approval_mode: guard?.approvalMode ?? GUARDRAIL_DEFAULTS.rail5.approvalMode,
      recurring_allowed: guard?.recurringAllowed ?? GUARDRAIL_DEFAULTS.rail5.recurringAllowed,
      notes: guard?.notes ?? null,
    },
    limits: {
      per_transaction_usd: (guard?.maxPerTxCents ?? GUARDRAIL_DEFAULTS.rail5.maxPerTxCents) / 100,
      daily_usd: (guard?.dailyBudgetCents ?? GUARDRAIL_DEFAULTS.rail5.dailyBudgetCents) / 100,
      monthly_usd: (guard?.monthlyBudgetCents ?? GUARDRAIL_DEFAULTS.rail5.monthlyBudgetCents) / 100,
      human_approval_above_usd: (guard?.requireApprovalAbove ?? GUARDRAIL_DEFAULTS.rail5.requireApprovalAbove ?? 2500) / 100,
    },
  };
}
