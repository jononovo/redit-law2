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

    const walletId = request.nextUrl.searchParams.get("wallet_id");
    if (!walletId) {
      return NextResponse.json({ error: "wallet_id is required" }, { status: 400 });
    }

    const wallet = await storage.crossmintGetWalletById(Number(walletId));
    if (!wallet || wallet.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const typeFilter = request.nextUrl.searchParams.get("type");
    let transactions = await storage.crossmintGetTransactionsByWalletId(wallet.id);

    if (typeFilter) {
      transactions = transactions.filter(t => t.type === typeFilter);
    }

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount_usdc: t.amountUsdc,
        amount_display: formatUsdc(t.amountUsdc),
        balance_after: t.balanceAfter,
        balance_after_display: t.balanceAfter != null ? formatUsdc(t.balanceAfter) : null,
        product_locator: t.productLocator,
        product_name: t.productName,
        quantity: t.quantity,
        order_status: t.orderStatus,
        status: t.status,
        crossmint_order_id: t.crossmintOrderId,
        shipping_address: t.shippingAddress,
        tracking_info: t.trackingInfo,
        created_at: t.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/v1/card-wallet/transactions error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
