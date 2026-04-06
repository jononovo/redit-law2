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
    rail5Card,
    pendingMessageCount,
  ] = await Promise.all([
    storage.getWalletByBotId(bot.botId),
    storage.privyGetWalletByBotId(bot.botId),
    storage.crossmintGetWalletByBotId(bot.botId),
    storage.getRail5CardByBotId(bot.botId),
    storage.getPendingMessageCount(bot.botId),
  ]);

  const rails: Record<string, any> = {};

  if (wallet) {
    rails.card_wallet = {
      status: wallet.balanceCents > 0 ? "active" : "empty",
      balance_usd: wallet.balanceCents / 100,
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
    bot_type: bot.botType || "openclaw",
    tunnel_status: bot.tunnelStatus || "none",
    tunnel_local_port: bot.tunnelLocalPort || null,
  });
});
