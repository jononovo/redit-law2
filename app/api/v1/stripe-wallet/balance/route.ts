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
    if (!walletId) {
      return NextResponse.json({ error: "wallet_id is required" }, { status: 400 });
    }

    const wallet = await storage.privyGetWalletById(Number(walletId));
    if (!wallet || wallet.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    return NextResponse.json({
      wallet_id: wallet.id,
      address: wallet.address,
      balance_usdc: wallet.balanceUsdc,
      balance_display: `$${microUsdcToUsd(wallet.balanceUsdc).toFixed(2)}`,
      status: wallet.status,
    });
  } catch (error) {
    console.error("GET /api/v1/stripe-wallet/balance error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
