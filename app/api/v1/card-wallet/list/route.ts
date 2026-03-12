import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { formatUsdc } from "@/lib/rail2/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const wallets = await storage.crossmintGetWalletsByOwnerUid(user.uid);

    const walletsWithDetails = await Promise.all(
      wallets.map(async (w) => {
        const [bot, guardrails, procControls] = await Promise.all([
          storage.getBotByBotId(w.botId),
          storage.crossmintGetGuardrails(w.id),
          storage.getProcurementControlsByScope(user.uid, "rail2"),
        ]);
        return {
          id: w.id,
          bot_id: w.botId,
          bot_name: bot?.botName || w.botId,
          address: w.address,
          balance_usdc: w.balanceUsdc,
          balance_display: formatUsdc(w.balanceUsdc),
          chain: w.chain,
          status: w.status,
          guardrails: guardrails ? {
            max_per_tx_usdc: guardrails.maxPerTxUsdc,
            daily_budget_usdc: guardrails.dailyBudgetUsdc,
            monthly_budget_usdc: guardrails.monthlyBudgetUsdc,
            require_approval_above: guardrails.requireApprovalAbove,
            allowlisted_merchants: procControls?.allowlistedMerchants ?? [],
            blocklisted_merchants: procControls?.blocklistedMerchants ?? [],
            auto_pause_on_zero: guardrails.autoPauseOnZero,
          } : null,
          created_at: w.createdAt,
        };
      })
    );

    return NextResponse.json({ wallets: walletsWithDetails });
  } catch (error) {
    console.error("GET /api/v1/card-wallet/list error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
