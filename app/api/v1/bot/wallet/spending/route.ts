import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { GUARDRAIL_DEFAULTS } from "@/lib/guardrails/defaults";
import { PROCUREMENT_DEFAULTS } from "@/lib/guardrails/defaults";

export const GET = withBotApi("/api/v1/bot/wallet/spending", async (_request, { bot }) => {
  if (bot.walletStatus === "pending") {
    return NextResponse.json(
      { error: "wallet_not_active", message: "Wallet not yet activated. Owner must claim this bot first." },
      { status: 403 }
    );
  }

  const rail4Cards = await storage.getRail4CardsByBotId(bot.botId);
  const activeCard = rail4Cards.find(c => c.status === "active");

  let guardrailData;
  if (activeCard) {
    const guard = await storage.getRail4Guardrails(activeCard.cardId);
    guardrailData = {
      approval_mode: guard?.approvalMode ?? GUARDRAIL_DEFAULTS.rail4.approvalMode,
      limits: {
        per_transaction_usd: (guard?.maxPerTxCents ?? GUARDRAIL_DEFAULTS.rail4.maxPerTxCents) / 100,
        daily_usd: (guard?.dailyBudgetCents ?? GUARDRAIL_DEFAULTS.rail4.dailyBudgetCents) / 100,
        monthly_usd: (guard?.monthlyBudgetCents ?? GUARDRAIL_DEFAULTS.rail4.monthlyBudgetCents) / 100,
        ask_approval_above_usd: (guard?.requireApprovalAbove ?? GUARDRAIL_DEFAULTS.rail4.requireApprovalAbove ?? 500) / 100,
      },
      recurring_allowed: guard?.recurringAllowed ?? GUARDRAIL_DEFAULTS.rail4.recurringAllowed,
      notes: guard?.notes ?? null,
      updated_at: guard?.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  } else {
    guardrailData = {
      approval_mode: GUARDRAIL_DEFAULTS.rail4.approvalMode,
      limits: {
        per_transaction_usd: GUARDRAIL_DEFAULTS.rail4.maxPerTxCents / 100,
        daily_usd: GUARDRAIL_DEFAULTS.rail4.dailyBudgetCents / 100,
        monthly_usd: GUARDRAIL_DEFAULTS.rail4.monthlyBudgetCents / 100,
        ask_approval_above_usd: (GUARDRAIL_DEFAULTS.rail4.requireApprovalAbove ?? 500) / 100,
      },
      recurring_allowed: GUARDRAIL_DEFAULTS.rail4.recurringAllowed,
      notes: null,
      updated_at: new Date().toISOString(),
    };
  }

  let procurement;
  if (bot.ownerUid) {
    const procRules = await storage.getProcurementControlsByScope(bot.ownerUid, "rail4", null);
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
