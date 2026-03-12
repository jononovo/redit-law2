import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { microUsdcToUsd } from "@/lib/rail1/x402";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const wallets = await storage.privyGetWalletsByOwnerUid(user.uid);

    const walletsWithBots = await Promise.all(
      wallets.map(async (w) => {
        const bot = await storage.getBotByBotId(w.botId);
        const guardrails = await storage.privyGetGuardrails(w.id);
        return {
          id: w.id,
          bot_id: w.botId,
          bot_name: bot?.botName || "Unknown Bot",
          address: w.address,
          balance_usdc: w.balanceUsdc,
          balance_display: `$${microUsdcToUsd(w.balanceUsdc).toFixed(2)}`,
          status: w.status,
          guardrails: guardrails ? {
            max_per_tx_usdc: guardrails.maxPerTxUsdc,
            daily_budget_usdc: guardrails.dailyBudgetUsdc,
            monthly_budget_usdc: guardrails.monthlyBudgetUsdc,
            require_approval_above: guardrails.requireApprovalAbove,
          } : null,
          created_at: w.createdAt,
        };
      })
    );

    return NextResponse.json({ wallets: walletsWithBots });
  } catch (error) {
    console.error("GET /api/v1/stripe-wallet/list error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
