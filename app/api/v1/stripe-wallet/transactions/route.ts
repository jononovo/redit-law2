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

    const walletId = request.nextUrl.searchParams.get("wallet_id");
    const limit = Number(request.nextUrl.searchParams.get("limit") || "50");

    if (!walletId) {
      return NextResponse.json({ error: "wallet_id is required" }, { status: 400 });
    }

    const wallet = await storage.privyGetWalletById(Number(walletId));
    if (!wallet || wallet.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const transactions = await storage.privyGetTransactionsByWalletId(wallet.id, limit);

    return NextResponse.json({
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount_usdc: tx.amountUsdc,
        amount_display: `$${microUsdcToUsd(tx.amountUsdc).toFixed(2)}`,
        balance_after: tx.balanceAfter,
        balance_after_display: tx.balanceAfter != null ? `$${microUsdcToUsd(tx.balanceAfter).toFixed(2)}` : null,
        recipient_address: tx.recipientAddress,
        resource_url: tx.resourceUrl,
        tx_hash: tx.txHash,
        status: tx.status,
        created_at: tx.createdAt,
        confirmed_at: tx.confirmedAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/v1/stripe-wallet/transactions error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
