import { storage } from "@/server/storage";
import { fireWebhook } from "@/lib/webhooks";
import crypto from "crypto";
import type { CheckoutPage, PrivyTransaction } from "@/shared/schema";

function generateSaleId(): string {
  return `sale_${crypto.randomBytes(6).toString("hex")}`;
}

interface RecordSaleInput {
  checkoutPage: CheckoutPage;
  amountUsdc: number;
  txId: string;
  sender: string;
  transaction: PrivyTransaction;
  newBalance: number;
  buyerEmail?: string;
  buyerName?: string;
  buyerIp?: string;
  buyerUserAgent?: string;
  invoiceRef?: string;
}

interface RecordSaleResult {
  saleId: string;
  status: string;
}

export async function recordBasePaySale(input: RecordSaleInput): Promise<RecordSaleResult> {
  const {
    checkoutPage, amountUsdc, txId, sender, transaction, newBalance,
    buyerEmail, buyerName, buyerIp, buyerUserAgent, invoiceRef,
  } = input;

  let saleStatus: "confirmed" | "amount_mismatch" = "confirmed";

  if (checkoutPage.amountLocked && checkoutPage.amountUsdc) {
    const expectedUsdc = checkoutPage.amountUsdc;
    const lowerBound = expectedUsdc * 0.99;
    const upperBound = expectedUsdc * 1.01;
    if (amountUsdc < lowerBound || amountUsdc > upperBound) {
      saleStatus = "amount_mismatch";
      console.warn("[Base Pay Sale] Amount mismatch:", {
        checkoutPageId: checkoutPage.checkoutPageId,
        expectedUsdc,
        receivedUsdc: amountUsdc,
        diffPercent: ((amountUsdc - expectedUsdc) / expectedUsdc * 100).toFixed(2) + "%",
      });
    }
  }

  let linkedInvoiceId: string | null = null;

  if (invoiceRef) {
    try {
      const invoice = await storage.getInvoiceByReferenceNumber(invoiceRef);
      if (
        invoice &&
        invoice.checkoutPageId === checkoutPage.checkoutPageId &&
        (invoice.status === "sent" || invoice.status === "viewed")
      ) {
        const invoiceLower = invoice.totalUsdc * 0.99;
        const invoiceUpper = invoice.totalUsdc * 1.01;
        if (amountUsdc < invoiceLower || amountUsdc > invoiceUpper) {
          saleStatus = "amount_mismatch";
        }
        linkedInvoiceId = invoice.invoiceId;
      } else {
        console.warn("[Base Pay Sale] Invoice ref did not match or not payable:", { invoiceRef, invoiceStatus: invoice?.status });
      }
    } catch (invErr) {
      console.error("[Base Pay Sale] Failed to look up invoice:", invErr);
    }
  }

  const saleId = generateSaleId();
  await storage.createSale({
    saleId,
    checkoutPageId: checkoutPage.checkoutPageId,
    ownerUid: checkoutPage.ownerUid,
    amountUsdc,
    paymentMethod: "base_pay",
    status: saleStatus,
    buyerType: "base_pay_wallet",
    buyerIdentifier: sender,
    buyerEmail: buyerEmail || null,
    buyerName: buyerName || null,
    buyerIp: buyerIp || null,
    buyerUserAgent: buyerUserAgent || null,
    txHash: txId,
    privyTransactionId: transaction.id,
    checkoutTitle: checkoutPage.title,
    checkoutDescription: checkoutPage.description,
    confirmedAt: new Date(),
    invoiceId: linkedInvoiceId,
  });

  await storage.incrementCheckoutPageStats(checkoutPage.checkoutPageId, amountUsdc);

  if (linkedInvoiceId) {
    try {
      await storage.markInvoicePaid(linkedInvoiceId, saleId);
    } catch (invPaidErr) {
      console.error("[Base Pay Sale] Failed to mark invoice as paid:", invPaidErr);
    }
  }

  try {
    const walletWithBot = await storage.privyGetWalletById(checkoutPage.walletId);
    const walletBotId = walletWithBot?.botId;
    const walletBot = walletBotId ? await storage.getBotByBotId(walletBotId) : null;
    if (walletBot) {
      await fireWebhook(walletBot, "wallet.sale.completed", {
        sale_id: saleId,
        checkout_page_id: checkoutPage.checkoutPageId,
        amount_usd: amountUsdc / 1_000_000,
        payment_method: "base_pay",
        status: saleStatus,
        ...(saleStatus === "amount_mismatch" && checkoutPage.amountUsdc ? {
          expected_amount_usd: checkoutPage.amountUsdc / 1_000_000,
        } : {}),
        buyer_email: buyerEmail || null,
        buyer_wallet: sender,
        new_balance_usd: newBalance / 1_000_000,
        ...(linkedInvoiceId ? { invoice_id: linkedInvoiceId, invoice_ref: invoiceRef } : {}),
      });
    }
  } catch (webhookErr) {
    console.error("[Base Pay Sale] Failed to fire webhook:", webhookErr);
  }

  return { saleId, status: saleStatus };
}
