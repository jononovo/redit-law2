import { NextResponse } from "next/server";
import { z } from "zod";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";

const preflightSchema = z.object({
  merchant_name: z.string().min(1).max(200),
  amount_cents: z.number().int().min(1).max(10000000),
  profile_index: z.number().int().min(1).max(6),
  card_id: z.string().optional(),
});

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

export const POST = withBotApi("/api/v1/bot/check/rail4/test", async (request, { bot }) => {
  let body;
  try {
    body = preflightSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_request", message: err instanceof z.ZodError ? err.errors : "Invalid request body" },
      { status: 400 },
    );
  }

  const cards = await storage.getRail4CardsByBotId(bot.botId);
  if (cards.length === 0) {
    return NextResponse.json({ allowed: false, reason: "no_rail4_cards", requires_approval: false });
  }

  const card = body.card_id ? cards.find(c => c.cardId === body.card_id) : cards[0];
  if (!card) {
    return NextResponse.json({ allowed: false, reason: "card_not_found", requires_approval: false });
  }

  if (card.status !== "active") {
    return NextResponse.json({ allowed: false, reason: "card_not_active", requires_approval: false });
  }

  let permissionsList: any[] = [];
  if (card.profilePermissions) {
    try {
      const parsed = JSON.parse(card.profilePermissions);
      permissionsList = Array.isArray(parsed) ? parsed : [parsed];
    } catch {}
  }

  const profilePerm = permissionsList.find(p => p.profile_index === body.profile_index);

  const amountUsd = body.amount_cents / 100;
  let allowanceRemainingUsd: number | null = null;
  let requiresApproval = false;
  const reasons: string[] = [];

  if (profilePerm) {
    const duration = profilePerm.allowance_duration || "month";
    const windowStart = getAllowanceWindowStart(duration);

    const usage = await storage.getProfileAllowanceUsage(
      card.cardId,
      body.profile_index,
      windowStart,
    );

    const allowanceValueUsd = profilePerm.allowance_value ?? 0;
    const spentUsd = (usage?.spentCents ?? 0) / 100;
    allowanceRemainingUsd = Math.max(0, allowanceValueUsd - spentUsd);

    if (amountUsd > allowanceRemainingUsd) {
      reasons.push("exceeds_profile_allowance");
    }

    const approvalMode = profilePerm.human_permission_required || "all";
    const exemptLimit = profilePerm.confirmation_exempt_limit ?? 0;

    if (approvalMode === "all") {
      requiresApproval = true;
    } else if (approvalMode === "above_exempt" && amountUsd > exemptLimit) {
      requiresApproval = true;
    }
  } else if (permissionsList.length === 0) {
    requiresApproval = true;
  } else {
    reasons.push("no_permissions_for_profile");
    requiresApproval = true;
  }

  let masterDailyRemainingUsd: number | null = null;
  let masterMonthlyRemainingUsd: number | null = null;

  if (bot.ownerUid) {
    const [guardrailConfig, dailySpend, monthlySpend] = await Promise.all([
      storage.getMasterGuardrails(bot.ownerUid),
      storage.getMasterDailySpend(bot.ownerUid),
      storage.getMasterMonthlySpend(bot.ownerUid),
    ]);

    if (guardrailConfig && guardrailConfig.enabled) {
      if (guardrailConfig.maxPerTxUsdc && amountUsd > guardrailConfig.maxPerTxUsdc) {
        reasons.push("exceeds_master_per_tx_limit");
      }

      masterDailyRemainingUsd = Math.max(0, guardrailConfig.dailyBudgetUsdc - (dailySpend.total / 1_000_000));
      if (amountUsd > masterDailyRemainingUsd) {
        reasons.push("exceeds_master_daily_budget");
      }

      masterMonthlyRemainingUsd = Math.max(0, guardrailConfig.monthlyBudgetUsdc - (monthlySpend.total / 1_000_000));
      if (amountUsd > masterMonthlyRemainingUsd) {
        reasons.push("exceeds_master_monthly_budget");
      }
    }
  }

  const allowed = reasons.length === 0;

  return NextResponse.json({
    allowed,
    requires_approval: requiresApproval,
    reason: allowed ? null : reasons,
    limits_snapshot: {
      allowance_remaining_usd: allowanceRemainingUsd,
      master_daily_remaining_usd: masterDailyRemainingUsd,
      master_monthly_remaining_usd: masterMonthlyRemainingUsd,
    },
  });
});
