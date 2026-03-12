import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { getWalletBalance } from "@/lib/rail2/wallet/balance";
import { formatUsdc } from "@/lib/rail2/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const walletId = request.nextUrl.searchParams.get("wallet_id");
    if (!walletId) {
      return NextResponse.json({ error: "wallet_id is required" }, { status: 400 });
    }

    const wallet = await storage.crossmintGetWalletById(Number(walletId));
    if (!wallet || wallet.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    let balanceUsdc = wallet.balanceUsdc;
    try {
      balanceUsdc = await getWalletBalance(wallet.address);
      await storage.crossmintUpdateWalletBalance(wallet.id, balanceUsdc);
    } catch (err) {
      console.error("[Card Wallet] Balance fetch from CrossMint failed, using cached:", err);
    }

    return NextResponse.json({
      wallet_id: wallet.id,
      balance_usdc: balanceUsdc,
      balance_display: formatUsdc(balanceUsdc),
    });
  } catch (error) {
    console.error("GET /api/v1/card-wallet/balance error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
