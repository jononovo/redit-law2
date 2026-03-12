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
      return NextResponse.json({ transactions: [] });
    }

    const txns = await storage.getTransactionsByWalletId(wallet.id);

    return NextResponse.json({
      transactions: txns.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount_cents: tx.amountCents,
        amount: `$${(tx.amountCents / 100).toFixed(2)}`,
        balance_after: tx.balanceAfter,
        balance_after_display: tx.balanceAfter != null ? `$${(tx.balanceAfter / 100).toFixed(2)}` : null,
        description: tx.description,
        created_at: tx.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json({ error: "Failed to get transactions" }, { status: 500 });
  }
}
