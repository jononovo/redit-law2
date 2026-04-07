import { NextResponse } from "next/server";
import { withBotApi } from "@/features/platform-management/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { GUARDRAIL_DEFAULTS } from "@/features/agent-interaction/guardrails/defaults";
import { PROCUREMENT_DEFAULTS } from "@/features/agent-interaction/guardrails/defaults";

export const GET = withBotApi("/api/v1/bot/wallet/spending", async (_request, { bot }) => {
  if (bot.walletStatus === "pending") {
    return NextResponse.json(
      { error: "wallet_not_active", message: "Wallet not yet activated. Owner must claim this bot first." },
      { status: 403 }
    );
  }

  const masterGuardrails = bot.ownerUid ? await storage.getMasterGuardrails(bot.ownerUid) : null;

  const rail5Card = await storage.getRail5CardByBotId(bot.botId);
  const activeCard = rail5Card?.status === "active" ? rail5Card : null;

  let guardrailData;
  if (activeCard) {
    const guard = await storage.getRail5Guardrails(activeCard.cardId);
    guardrailData = {
      approval_mode: masterGuardrails?.approvalMode ?? GUARDRAIL_DEFAULTS.master.approvalMode,
      limits: {
        per_transaction_usd: (guard?.maxPerTxCents ?? GUARDRAIL_DEFAULTS.rail5.maxPerTxCents) / 100,
        daily_usd: (guard?.dailyBudgetCents ?? GUARDRAIL_DEFAULTS.rail5.dailyBudgetCents) / 100,
        monthly_usd: (guard?.monthlyBudgetCents ?? GUARDRAIL_DEFAULTS.rail5.monthlyBudgetCents) / 100,
        ask_approval_above_usd: masterGuardrails?.requireApprovalAbove != null ? masterGuardrails.requireApprovalAbove / 100 : null,
      },
      recurring_allowed: guard?.recurringAllowed ?? GUARDRAIL_DEFAULTS.rail5.recurringAllowed,
      notes: guard?.notes ?? null,
      updated_at: guard?.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  } else {
    guardrailData = {
      approval_mode: masterGuardrails?.approvalMode ?? GUARDRAIL_DEFAULTS.master.approvalMode,
      limits: {
        per_transaction_usd: GUARDRAIL_DEFAULTS.rail5.maxPerTxCents / 100,
        daily_usd: GUARDRAIL_DEFAULTS.rail5.dailyBudgetCents / 100,
        monthly_usd: GUARDRAIL_DEFAULTS.rail5.monthlyBudgetCents / 100,
        ask_approval_above_usd: masterGuardrails?.requireApprovalAbove != null ? masterGuardrails.requireApprovalAbove / 100 : null,
      },
      recurring_allowed: GUARDRAIL_DEFAULTS.rail5.recurringAllowed,
      notes: null,
      updated_at: new Date().toISOString(),
    };
  }

  let procurement;
  if (bot.ownerUid) {
    const procRules = await storage.getProcurementControlsByScope(bot.ownerUid, "rail5", null);
    procurement = {
      approved_categories: (procRules?.allowlistedCategories as string[]) || [],
      blocked_categories: (procRules?.blocklistedCategories as string[]) || PROCUREMENT_DEFAULTS.blockedCategories,
    };
  } else {
    procurement = {
      approved_categories: [],
      blocked_categories: PROCUREMENT_DEFAULTS.blockedCategories,
    };
  }

  return NextResponse.json({
    ...guardrailData,
    ...procurement,
  });
});
