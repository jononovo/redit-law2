import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { GUARDRAIL_DEFAULTS } from "@/lib/guardrails/defaults";

export const GET = withBotApi("/api/v1/bot/wallet/check", async (_request, { bot }) => {
  if (bot.walletStatus === "pending") {
    return NextResponse.json({
      wallet_status: "pending",
      balance_usd: 0,
      card_status: "inactive",
      message: "Owner has not claimed this bot yet. Share your claim token with your human.",
    });
  }

  const wallet = await storage.getWalletByBotId(bot.botId);
  if (!wallet) {
    return NextResponse.json({
      wallet_status: "inactive",
      balance_usd: 0,
      card_status: "inactive",
    });
  }

  const monthlySpent = await storage.getMonthlySpend(wallet.id);

  const rail4Cards = await storage.getRail4CardsByBotId(bot.botId);
  const activeCard = rail4Cards.find(c => c.status === "active");

  let spendingLimits;
  if (activeCard) {
    const guard = await storage.getRail4Guardrails(activeCard.cardId);
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

  return NextResponse.json({
    wallet_status: wallet.balanceCents > 0 ? "active" : "empty",
    balance_usd: wallet.balanceCents / 100,
    card_status: wallet.balanceCents > 0 ? "active" : "empty",
    spending_limits: spendingLimits,
    pending_topups: 0,
  });
});
