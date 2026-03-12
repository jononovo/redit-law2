import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { authenticateBot } from "@/lib/agent-management/auth";
import { formatUsdc } from "@/lib/rail2/client";

async function handler(request: NextRequest, botId: string) {
  try {
    const transactionId = request.nextUrl.searchParams.get("transaction_id");
    const approvalId = request.nextUrl.searchParams.get("approval_id");

    if (!transactionId && !approvalId) {
      return NextResponse.json({ error: "transaction_id or approval_id is required" }, { status: 400 });
    }

    const wallet = await storage.crossmintGetWalletByBotId(botId);
    if (!wallet) {
      return NextResponse.json({ error: "No Card Wallet found for this bot" }, { status: 404 });
    }

    if (approvalId) {
      const approval = await storage.getUnifiedApprovalById(approvalId);
      if (!approval || approval.ownerUid !== wallet.ownerUid) {
        return NextResponse.json({ error: "Approval not found" }, { status: 404 });
      }

      if (approval.status === "pending") {
        return NextResponse.json({
          status: "awaiting_approval",
          expires_at: approval.expiresAt,
        });
      }

      if (approval.status === "denied" || approval.status === "expired") {
        return NextResponse.json({
          status: "failed",
          reason: `approval_${approval.status}`,
        });
      }

      const txId = Number(approval.railRef);
      if (!isNaN(txId)) {
        const tx = await storage.crossmintGetTransactionById(txId);
        if (tx) {
          return NextResponse.json({
            status: tx.status,
            order_status: tx.orderStatus,
            crossmint_order_id: tx.crossmintOrderId,
            tracking: tx.trackingInfo,
          });
        }
      }
    }

    if (transactionId) {
      const tx = await storage.crossmintGetTransactionById(Number(transactionId));
      if (!tx || tx.walletId !== wallet.id) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      }

      return NextResponse.json({
        status: tx.status,
        order_status: tx.orderStatus,
        crossmint_order_id: tx.crossmintOrderId,
        product_name: tx.productName,
        amount_display: formatUsdc(tx.amountUsdc),
        tracking: tx.trackingInfo,
      });
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("GET /api/v1/card-wallet/bot/purchase/status error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const bot = await authenticateBot(request);
  if (!bot) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }
  return handler(request, bot.botId);
}
