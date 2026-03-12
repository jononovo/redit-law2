import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { getOrderStatus } from "@/lib/procurement/crossmint-worldstore/purchase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { order_id } = await params;
    if (!order_id) {
      return NextResponse.json({ error: "order_id is required" }, { status: 400 });
    }

    const transaction = await storage.crossmintGetTransactionByOrderId(order_id);
    if (!transaction) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const wallet = await storage.crossmintGetWalletById(transaction.walletId);
    if (!wallet || wallet.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    let liveStatus: Record<string, unknown> | null = null;
    try {
      liveStatus = await getOrderStatus(order_id);

      const newOrderStatus = (liveStatus as any)?.phase || (liveStatus as any)?.status;
      const trackingData = (liveStatus as any)?.fulfillment?.tracking || (liveStatus as any)?.tracking;

      const updates: Record<string, unknown> = {};
      if (newOrderStatus && newOrderStatus !== transaction.orderStatus) {
        updates.orderStatus = newOrderStatus;
      }
      if (trackingData) {
        updates.trackingInfo = trackingData;
      }
      if (Object.keys(updates).length > 0) {
        await storage.crossmintUpdateTransaction(transaction.id, updates);
      }
    } catch (fetchErr) {
      console.warn("[Card Wallet] Failed to fetch live order status from CrossMint:", fetchErr);
    }

    return NextResponse.json({
      order: {
        id: transaction.id,
        crossmint_order_id: transaction.crossmintOrderId,
        type: transaction.type,
        amount_usdc: transaction.amountUsdc,
        amount_display: `$${(Number(transaction.amountUsdc) / 1_000_000).toFixed(2)}`,
        product_locator: transaction.productLocator,
        product_name: transaction.productName,
        quantity: transaction.quantity,
        status: transaction.status,
        order_status: liveStatus ? ((liveStatus as any)?.phase || (liveStatus as any)?.status || transaction.orderStatus) : transaction.orderStatus,
        shipping_address: transaction.shippingAddress,
        tracking_info: liveStatus ? ((liveStatus as any)?.fulfillment?.tracking || (liveStatus as any)?.tracking || transaction.trackingInfo) : transaction.trackingInfo,
        metadata: transaction.metadata,
        wallet_address: wallet.address,
        bot_id: wallet.botId,
        created_at: transaction.createdAt,
        updated_at: transaction.updatedAt,
      },
      crossmint_raw: liveStatus,
    });
  } catch (error) {
    console.error("GET /api/v1/card-wallet/orders/[order_id] error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
