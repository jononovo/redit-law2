import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyBasePayPayment } from "@/lib/base-pay/verify";
import { creditWalletFromBasePay } from "@/lib/base-pay/ledger";
import { getSessionUser } from "@/lib/auth/session";

const verifySchema = z.object({
  tx_id: z.string().min(1),
  expected_amount: z.string().min(1),
  expected_recipient: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { tx_id, expected_amount, expected_recipient } = parsed.data;

    const verified = await verifyBasePayPayment({
      txId: tx_id,
      expectedAmount: expected_amount,
      expectedRecipient: expected_recipient,
    });

    const amountUsdc = Math.round(parseFloat(verified.amount) * 1_000_000);

    const { transaction, newBalance } = await creditWalletFromBasePay({
      walletAddress: verified.recipient,
      amountUsdc,
      txId: tx_id,
      sender: verified.sender,
      type: "topup",
    });

    console.log("[Base Pay Verify] Top-up successful:", {
      txId: tx_id,
      sender: verified.sender,
      amount: verified.amount,
      newBalance,
    });

    return NextResponse.json({
      status: "completed",
      sender: verified.sender,
      amount: verified.amount,
      new_balance_usd: newBalance / 1_000_000,
      transaction_id: transaction.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Base Pay Verify] Error:", message);

    if (message === "Transaction already processed") {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
