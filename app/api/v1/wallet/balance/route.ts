import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const wallet = await storage.getWalletByOwnerUid(user.uid);
    if (!wallet) {
      return NextResponse.json({ balance_cents: 0, balance: "$0.00", has_wallet: false });
    }

    return NextResponse.json({
      balance_cents: wallet.balanceCents,
      balance: `$${(wallet.balanceCents / 100).toFixed(2)}`,
      has_wallet: true,
      currency: wallet.currency,
    });
  } catch (error) {
    console.error("Get balance error:", error);
    return NextResponse.json({ error: "Failed to get balance" }, { status: 500 });
  }
}
