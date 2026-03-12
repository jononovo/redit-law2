import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getOnChainUsdcBalance } from "@/lib/rail1/wallet/balance";
import { buildEip681Uri } from "@/lib/qr-pay/eip681";
import { storage } from "@/server/storage";

const QR_PAY_TTL_MS = 60 * 60 * 1000;

const createSchema = z.object({
  wallet_address: z.string().min(1),
  amount_usd: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { wallet_address, amount_usd } = parsed.data;
    const amountUsdc = Math.round(amount_usd * 1_000_000);

    await storage.expireWaitingQrPaymentsForWallet(wallet_address);

    const balanceBefore = await getOnChainUsdcBalance(wallet_address);

    const paymentId = `qr_${crypto.randomBytes(6).toString("hex")}`;
    const eip681Uri = buildEip681Uri(wallet_address, amountUsdc);
    const expiresAt = new Date(Date.now() + QR_PAY_TTL_MS);

    const payment = await storage.createQrPayment({
      paymentId,
      ownerUid: user.uid,
      walletAddress: wallet_address,
      amountUsdc,
      eip681Uri,
      balanceBefore,
      status: "waiting",
      expiresAt,
    });

    console.log("[QR Pay] Created:", {
      paymentId,
      walletAddress: wallet_address,
      amountUsdc,
      balanceBefore,
    });

    return NextResponse.json({
      payment_id: payment.paymentId,
      eip681_uri: payment.eip681Uri,
      wallet_address: payment.walletAddress,
      amount_usdc: payment.amountUsdc,
      expires_at: payment.expiresAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[QR Pay] Create error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
