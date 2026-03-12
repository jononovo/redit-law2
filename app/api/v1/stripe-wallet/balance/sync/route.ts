import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { microUsdcToUsd } from "@/lib/rail1/x402";
import { getOnChainUsdcBalance } from "@/lib/rail1/wallet/balance";
import { isAddress } from "viem";

const SYNC_COOLDOWN_MS = 30 * 1000;

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const walletId = body.wallet_id;
    if (!walletId) {
      return NextResponse.json({ error: "wallet_id is required" }, { status: 400 });
    }

    const wallet = await storage.privyGetWalletById(Number(walletId));
    if (!wallet || wallet.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (wallet.lastSyncedAt) {
      const elapsed = Date.now() - new Date(wallet.lastSyncedAt).getTime();
      if (elapsed < SYNC_COOLDOWN_MS) {
        const retryAfter = Math.ceil((SYNC_COOLDOWN_MS - elapsed) / 1000);
        return NextResponse.json(
          { error: "Please wait before syncing again", retry_after: retryAfter },
          { status: 429 }
        );
      }
    }

    if (!isAddress(wallet.address)) {
      console.error("[Balance Sync] Invalid wallet address:", wallet.address);
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    await storage.privyUpdateWalletSyncedAt(wallet.id);

    let onChainBalance: number;
    try {
      onChainBalance = await getOnChainUsdcBalance(wallet.address);
    } catch (rpcError) {
      console.error("[Balance Sync] RPC call failed:", rpcError);
      return NextResponse.json({ error: "Could not reach blockchain. Try again later." }, { status: 502 });
    }

    const previousBalance = wallet.balanceUsdc;
    const delta = onChainBalance - previousBalance;
    const changed = delta !== 0;

    if (changed) {
      await storage.privyUpdateWalletBalanceAndSync(wallet.id, onChainBalance);

      await storage.privyCreateTransaction({
        walletId: wallet.id,
        type: "reconciliation",
        amountUsdc: Math.abs(delta),
        status: "confirmed",
        balanceAfter: onChainBalance,
        metadata: {
          source: "on_chain_sync",
          direction: delta > 0 ? "increase" : "decrease",
          previous_balance: previousBalance,
          new_balance: onChainBalance,
        },
      });

      console.log("[Balance Sync] Reconciliation recorded:", {
        walletId: wallet.id,
        previousBalance,
        onChainBalance,
        delta,
      });
    }

    return NextResponse.json({
      balance_usdc: onChainBalance,
      balance_display: `$${microUsdcToUsd(onChainBalance).toFixed(2)}`,
      previous_balance: previousBalance,
      changed,
    });
  } catch (error) {
    console.error("POST /api/v1/stripe-wallet/balance/sync error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
