import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { GUARDRAIL_DEFAULTS } from "@/lib/guardrails/defaults";

export const GET = withBotApi("/api/v1/bot/status", async (_request, { bot }) => {
  if (bot.walletStatus === "pending") {
    return NextResponse.json({
      bot_id: bot.botId,
      bot_name: bot.botName,
      status: "pending",
      default_rail: null,
      message: "Owner has not claimed this bot yet. Share your claim token with your human.",
      rails: {},
      master_guardrails: null,
    });
  }

  const [
    wallet,
    privyWallet,
    crossmintWallet,
    rail4Cards,
    rail5Card,
    pendingMessageCount,
  ] = await Promise.all([
    storage.getWalletByBotId(bot.botId),
    storage.privyGetWalletByBotId(bot.botId),
    storage.crossmintGetWalletByBotId(bot.botId),
    storage.getRail4CardsByBotId(bot.botId),
    storage.getRail5CardByBotId(bot.botId),
    storage.getPendingMessageCount(bot.botId),
  ]);

  const rails: Record<string, any> = {};

  if (wallet) {
    const monthlySpent = await storage.getMonthlySpend(wallet.id);
    const activeRail4Card = rail4Cards.find(c => c.status === "active");
    let spendingLimits;

    if (activeRail4Card) {
      const guard = await storage.getRail4Guardrails(activeRail4Card.cardId);
      const perTxCents = guard?.maxPerTxCents ?? GUARDRAIL_DEFAULTS.rail4.maxPerTxCents;
      const monthlyCents = guard?.monthlyBudgetCents ?? GUARDRAIL_DEFAULTS.rail4.monthlyBudgetCents;
      spendingLimits = {
        per_transaction_usd: perTxCents / 100,
        monthly_usd: monthlyCents / 100,
        monthly_spent_usd: monthlySpent / 100,
        monthly_remaining_usd: Math.max(0, (monthlyCents - monthlySpent) / 100),
      };
    } else {
      spendingLimits = {
        per_transaction_usd: GUARDRAIL_DEFAULTS.rail4.maxPerTxCents / 100,
        monthly_usd: GUARDRAIL_DEFAULTS.rail4.monthlyBudgetCents / 100,
        monthly_spent_usd: monthlySpent / 100,
        monthly_remaining_usd: Math.max(0, (GUARDRAIL_DEFAULTS.rail4.monthlyBudgetCents - monthlySpent) / 100),
      };
    }

    rails.card_wallet = {
      status: wallet.balanceCents > 0 ? "active" : "empty",
      balance_usd: wallet.balanceCents / 100,
      spending_limits: spendingLimits,
    };
  }

  if (privyWallet) {
    rails.stripe_wallet = {
      status: privyWallet.status === "active" ? "active" : "inactive",
      balance_usd: privyWallet.balanceUsdc / 1_000_000,
      address: privyWallet.address,
    };
  }

  if (crossmintWallet) {
    rails.shopping_wallet = {
      status: crossmintWallet.status === "active" ? "active" : "inactive",
      balance_usd: crossmintWallet.balanceUsdc / 1_000_000,
      address: crossmintWallet.address,
    };
  }

  if (rail4Cards.length > 0) {
    const activeCards = rail4Cards.filter(c => c.botId === bot.botId);
    rails.self_hosted_cards = {
      status: activeCards.length > 0 ? "active" : "inactive",
      card_count: activeCards.length,
      cards: activeCards.map(c => ({
        card_id: c.cardId,
        card_name: c.cardName,
        use_case: c.useCase,
      })),
    };
  }

  if (rail5Card) {
    rails.sub_agent_cards = {
      status: "active",
      card_id: rail5Card.cardId,
    };
  }

  let masterGuardrails = null;
  if (bot.ownerUid) {
    const guardrailConfig = await storage.getMasterGuardrails(bot.ownerUid);
    if (guardrailConfig && guardrailConfig.enabled) {
      masterGuardrails = {
        per_transaction_usd: guardrailConfig.maxPerTxUsdc,
        daily_budget_usd: guardrailConfig.dailyBudgetUsdc,
        monthly_budget_usd: guardrailConfig.monthlyBudgetUsdc,
      };
    }
  }

  const activeRailCount = Object.keys(rails).length;

  return NextResponse.json({
    bot_id: bot.botId,
    bot_name: bot.botName,
    status: bot.walletStatus === "frozen" ? "frozen" : (activeRailCount > 0 ? "active" : "inactive"),
    default_rail: bot.defaultRail || null,
    active_rails: Object.keys(rails),
    rails,
    master_guardrails: masterGuardrails,
    pending_messages: pendingMessageCount,
    webhook_status: bot.webhookStatus || "none",
    webhook_fail_count: bot.webhookFailCount || 0,
  });
});
