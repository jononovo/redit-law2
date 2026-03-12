import { NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";

export const GET = withBotApi("/api/v1/bot/wallet/transactions", async (request, { bot }) => {
  if (bot.walletStatus === "pending") {
    return NextResponse.json(
      { error: "wallet_not_active", message: "Wallet not yet activated." },
      { status: 403 }
    );
  }

  const wallet = await storage.getWalletByBotId(bot.botId);
  if (!wallet) {
    return NextResponse.json({ transactions: [] });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  const txs = await storage.getTransactionsByWalletId(wallet.id, limit);

  return NextResponse.json({
    transactions: txs.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount_usd: tx.amountCents / 100,
      balance_after_usd: tx.balanceAfter != null ? tx.balanceAfter / 100 : null,
      description: tx.description,
      created_at: tx.createdAt.toISOString(),
    })),
  });
});
