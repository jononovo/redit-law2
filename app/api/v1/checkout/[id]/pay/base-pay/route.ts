import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/server/storage";
import { verifyBasePayPayment } from "@/lib/base-pay/verify";
import { creditWalletFromBasePay } from "@/lib/base-pay/ledger";
import { recordBasePaySale } from "@/lib/base-pay/sale";

const checkoutPaySchema = z.object({
  tx_id: z.string().min(1),
  buyer_email: z.string().email().optional(),
  buyer_name: z.string().max(200).optional(),
  invoice_ref: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const page = await storage.getCheckoutPageById(id);
    if (!page || page.status !== "active") {
      return NextResponse.json({ error: "Checkout page not found" }, { status: 404 });
    }

    if (page.expiresAt && new Date(page.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Checkout page has expired" }, { status: 410 });
    }

    if (!page.allowedMethods.includes("base_pay")) {
      return NextResponse.json({ error: "Base Pay is not enabled for this checkout page" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = checkoutPaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { tx_id, buyer_email, buyer_name, invoice_ref } = parsed.data;

    let expectedAmountUsd: number | undefined;

    if (invoice_ref) {
      const invoice = await storage.getInvoiceByReferenceNumber(invoice_ref);
      if (!invoice || invoice.checkoutPageId !== page.checkoutPageId) {
        return NextResponse.json({ error: "Invalid invoice reference" }, { status: 400 });
      }
      if (invoice.status === "draft") {
        return NextResponse.json({ error: "Invoice has not been sent yet" }, { status: 400 });
      }
      if (invoice.status === "paid") {
        return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });
      }
      if (invoice.status === "cancelled") {
        return NextResponse.json({ error: "Invoice has been cancelled" }, { status: 400 });
      }
      expectedAmountUsd = invoice.totalUsdc / 1_000_000;
    } else if (page.amountLocked && page.amountUsdc) {
      expectedAmountUsd = page.amountUsdc / 1_000_000;
    }

    const verified = await verifyBasePayPayment({
      txId: tx_id,
      expectedAmount: expectedAmountUsd ? String(expectedAmountUsd) : undefined,
      expectedRecipient: page.walletAddress,
    });

    const amountUsdc = Math.round(parseFloat(verified.amount) * 1_000_000);

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const { transaction, newBalance } = await creditWalletFromBasePay({
      walletAddress: page.walletAddress,
      amountUsdc,
      txId: tx_id,
      sender: verified.sender,
      type: "checkout",
      payerEmail: buyer_email,
    });

    const { saleId, status: saleStatus } = await recordBasePaySale({
      checkoutPage: page,
      amountUsdc,
      txId: tx_id,
      sender: verified.sender,
      transaction,
      newBalance,
      buyerEmail: buyer_email,
      buyerName: buyer_name,
      buyerIp: ip,
      buyerUserAgent: userAgent,
      invoiceRef: invoice_ref,
    });

    console.log("[Base Pay Checkout] Payment recorded:", {
      checkoutPageId: id,
      saleId,
      txId: tx_id,
      sender: verified.sender,
      amountUsdc,
    });

    return NextResponse.json({
      status: saleStatus,
      sale_id: saleId,
      amount_usd: amountUsdc / 1_000_000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Base Pay Checkout] Error:", message);

    if (message === "Transaction already processed") {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
