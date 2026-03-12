import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/server/storage";
import { parseXPaymentHeader, validateX402Payment, settleX402Payment, waitForReceipt, buildX402DedupeKey } from "@/lib/x402/receive";
import { creditWalletFromX402, recordX402Sale } from "@/lib/x402/checkout";

const x402PaySchema = z.object({
  buyer_email: z.string().email().optional(),
  buyer_name: z.string().max(200).optional(),
  invoice_ref: z.string().optional(),
});

const processingNonces = new Set<string>();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let dedupeKey: string | null = null;

  try {
    const { id } = await params;

    const page = await storage.getCheckoutPageById(id);
    if (!page || page.status !== "active") {
      return NextResponse.json({ error: "Checkout page not found" }, { status: 404 });
    }

    if (page.expiresAt && new Date(page.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Checkout page has expired" }, { status: 410 });
    }

    if (!page.allowedMethods.includes("x402")) {
      return NextResponse.json({ error: "x402 payments are not enabled for this checkout page" }, { status: 400 });
    }

    const xPaymentHeader = request.headers.get("x-payment");
    if (!xPaymentHeader) {
      return NextResponse.json({ error: "Missing X-PAYMENT header" }, { status: 400 });
    }

    let payment;
    try {
      payment = parseXPaymentHeader(xPaymentHeader);
    } catch (parseErr) {
      return NextResponse.json({ error: "Invalid X-PAYMENT header", details: (parseErr as Error).message }, { status: 400 });
    }

    const existingSale = await storage.getSaleByX402Nonce(payment.nonce, id);
    if (existingSale) {
      const product = page.pageType === "digital_product" && page.digitalProductUrl
        ? { url: page.digitalProductUrl, type: "digital_product" }
        : null;
      return NextResponse.json({
        status: existingSale.status,
        sale_id: existingSale.saleId,
        tx_hash: existingSale.txHash,
        amount_usd: existingSale.amountUsdc / 1_000_000,
        product,
      });
    }

    dedupeKey = buildX402DedupeKey(payment);
    if (processingNonces.has(dedupeKey)) {
      return NextResponse.json({ error: "Payment is already being processed" }, { status: 409 });
    }
    processingNonces.add(dedupeKey);

    let expectedAmountUsdc: number | null = null;

    const body = await request.json().catch(() => ({}));
    const parsed = x402PaySchema.safeParse(body);
    const { buyer_email, buyer_name, invoice_ref } = parsed.success ? parsed.data : {};

    if (invoice_ref) {
      const invoice = await storage.getInvoiceByReferenceNumber(invoice_ref);
      if (!invoice || invoice.checkoutPageId !== page.checkoutPageId) {
        processingNonces.delete(dedupeKey);
        return NextResponse.json({ error: "Invalid invoice reference" }, { status: 400 });
      }
      if (invoice.status === "paid") {
        processingNonces.delete(dedupeKey);
        return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });
      }
      if (invoice.status === "cancelled") {
        processingNonces.delete(dedupeKey);
        return NextResponse.json({ error: "Invoice has been cancelled" }, { status: 400 });
      }
      if (invoice.status === "draft") {
        processingNonces.delete(dedupeKey);
        return NextResponse.json({ error: "Invoice has not been sent yet" }, { status: 400 });
      }
      expectedAmountUsdc = invoice.totalUsdc;
    } else if (page.amountLocked && page.amountUsdc) {
      expectedAmountUsdc = page.amountUsdc;
    }

    const validation = validateX402Payment(payment, page.walletAddress, expectedAmountUsdc);
    if (!validation.valid) {
      processingNonces.delete(dedupeKey);
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const wallet = await storage.privyGetWalletById(page.walletId);
    if (!wallet) {
      processingNonces.delete(dedupeKey);
      return NextResponse.json({ error: "Seller wallet not found" }, { status: 500 });
    }

    let txHash: string;
    try {
      const result = await settleX402Payment(wallet.privyWalletId, payment);
      txHash = result.hash;
    } catch (settleErr) {
      console.error("[x402 Pay] Settlement failed:", settleErr);
      processingNonces.delete(dedupeKey);
      return NextResponse.json({
        error: "Payment settlement failed",
        details: (settleErr as Error).message,
      }, { status: 502 });
    }

    let receiptStatus: "success" | "reverted";
    try {
      const receipt = await waitForReceipt(txHash, 90_000);
      receiptStatus = receipt.status;
    } catch (receiptErr) {
      console.error("[x402 Pay] Receipt wait failed:", receiptErr);
      processingNonces.delete(dedupeKey);
      return NextResponse.json({
        error: "Transaction confirmation timed out",
        tx_hash: txHash,
        details: "The transaction was submitted but confirmation timed out. Check the tx hash on-chain.",
      }, { status: 504 });
    }

    if (receiptStatus === "reverted") {
      console.error("[x402 Pay] Transaction reverted:", { txHash });
      processingNonces.delete(dedupeKey);
      return NextResponse.json({
        error: "Transaction reverted on-chain",
        tx_hash: txHash,
        details: "The transferWithAuthorization call was reverted. The signature may be invalid, expired, or the nonce may have already been used.",
      }, { status: 400 });
    }

    const amountUsdc = Number(payment.value);

    const { transaction, newBalance } = await creditWalletFromX402({
      walletAddress: page.walletAddress,
      amountUsdc,
      txHash,
      senderAddress: payment.from,
    });

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const { saleId, status: saleStatus } = await recordX402Sale({
      checkoutPage: page,
      amountUsdc,
      txHash,
      senderAddress: payment.from,
      transaction,
      newBalance,
      nonce: payment.nonce,
      buyerEmail: buyer_email,
      buyerName: buyer_name,
      buyerIp: ip,
      buyerUserAgent: userAgent,
      invoiceRef: invoice_ref,
    });

    console.log("[x402 Pay] Payment confirmed on-chain and credited:", {
      checkoutPageId: id,
      saleId,
      txHash,
      sender: payment.from,
      amountUsdc,
    });

    processingNonces.delete(dedupeKey);

    const product = page.pageType === "digital_product" && page.digitalProductUrl
      ? { url: page.digitalProductUrl, type: "digital_product" }
      : null;

    return NextResponse.json({
      status: saleStatus,
      sale_id: saleId,
      tx_hash: txHash,
      amount_usd: amountUsdc / 1_000_000,
      product,
    });
  } catch (error) {
    if (dedupeKey) processingNonces.delete(dedupeKey);
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[x402 Pay] Error:", message);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
