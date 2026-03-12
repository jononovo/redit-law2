import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getOnChainUsdcBalance } from "@/lib/rail1/wallet/balance";
import { creditWalletFromQrPay } from "@/lib/qr-pay/ledger";
import { storage } from "@/server/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await params;

  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payment = await storage.getQrPaymentById(paymentId);
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (payment.status === "confirmed") {
      return NextResponse.json({
        status: "confirmed",
        credited_usdc: payment.creditedUsdc,
        new_balance_usd: payment.creditedUsdc
          ? payment.creditedUsdc / 1_000_000
          : undefined,
      });
    }

    if (payment.status === "expired" || new Date() > payment.expiresAt) {
      if (payment.status === "waiting") {
        await storage.expireQrPayment(paymentId);
      }
      return NextResponse.json({ status: "expired" });
    }

    const currentBalance = await getOnChainUsdcBalance(payment.walletAddress);
    const received = currentBalance - payment.balanceBefore;

    if (received <= 0) {
      return NextResponse.json({ status: "waiting" });
    }

    const { transaction, newBalance } = await creditWalletFromQrPay({
      paymentId,
      walletAddress: payment.walletAddress,
      creditedUsdc: received,
    });

    console.log("[QR Pay] Confirmed:", {
      paymentId,
      requested: payment.amountUsdc,
      credited: received,
      newBalance,
    });

    return NextResponse.json({
      status: "confirmed",
      credited_usdc: received,
      new_balance_usd: newBalance / 1_000_000,
      transaction_id: transaction.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "Payment already processed or not found") {
      const payment = await storage.getQrPaymentById(paymentId);
      if (payment?.status === "confirmed") {
        return NextResponse.json({
          status: "confirmed",
          credited_usdc: payment.creditedUsdc,
          new_balance_usd: payment.creditedUsdc
            ? payment.creditedUsdc / 1_000_000
            : undefined,
        });
      }
    }

    console.error("[QR Pay] Status check error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
