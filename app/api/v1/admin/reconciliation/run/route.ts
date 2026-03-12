import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const ownerWallets = await storage.getWalletsByOwnerUid(user.uid);
    if (ownerWallets.length === 0) {
      return NextResponse.json({
        status: "ok",
        message: "No wallets to reconcile.",
        results: [],
        mismatches: 0,
      });
    }

    const results = [];
    let mismatches = 0;

    for (const wallet of ownerWallets) {
      const ledgerBalance = await storage.getTransactionSumByWalletId(wallet.id);
      const storedBalance = wallet.balanceCents;
      const diff = storedBalance - ledgerBalance;
      const status = diff === 0 ? "ok" : "mismatch";

      if (diff !== 0) {
        mismatches++;
      }

      await storage.createReconciliationLog({
        walletId: wallet.id,
        botId: wallet.botId,
        expectedCents: ledgerBalance,
        actualCents: storedBalance,
        diffCents: diff,
        status,
      });

      results.push({
        wallet_id: wallet.id,
        bot_id: wallet.botId,
        ledger_balance_usd: (ledgerBalance / 100).toFixed(2),
        stored_balance_usd: (storedBalance / 100).toFixed(2),
        diff_usd: (diff / 100).toFixed(2),
        status,
      });
    }

    return NextResponse.json({
      status: mismatches > 0 ? "mismatch_found" : "ok",
      message: mismatches > 0
        ? `${mismatches} wallet(s) have balance mismatches.`
        : "All wallets reconciled successfully.",
      results,
      mismatches,
      checked: ownerWallets.length,
    });
  } catch (error) {
    console.error("Reconciliation error:", error);
    return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}
