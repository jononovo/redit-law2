import { storage } from "@/server/storage";
import { fireWebhook } from "@/lib/webhooks";
import crypto from "crypto";
import type { CheckoutPage, PrivyTransaction } from "@/shared/schema";

function generateSaleId(): string {
  return `sale_${crypto.randomBytes(6).toString("hex")}`;
}

interface RecordX402SaleInput {
  checkoutPage: CheckoutPage;
  amountUsdc: number;
  txHash: string;
  senderAddress: string;
  transaction: PrivyTransaction;
  newBalance: number;
  nonce?: string;
  buyerEmail?: string;
  buyerName?: string;
  buyerIp?: string;
  buyerUserAgent?: string;
  invoiceRef?: string;
}

interface RecordX402SaleResult {
  saleId: string;
  status: string;
}

export async function creditWalletFromX402(input: {
  walletAddress: string;
  amountUsdc: number;
  txHash: string;
  senderAddress: string;
}): Promise<{ transaction: PrivyTransaction; newBalance: number; walletId: number }> {
  const { walletAddress, amountUsdc, txHash, senderAddress } = input;

  const targetWallet = await storage.privyGetWalletByAddress(walletAddress);
  if (!targetWallet) {
    throw new Error(`No wallet found for address: ${walletAddress}`);
  }

  const newBalance = targetWallet.balanceUsdc + amountUsdc;

  await storage.privyUpdateWalletBalance(targetWallet.id, newBalance);

  const transaction = await storage.privyCreateTransaction({
    walletId: targetWallet.id,
    type: "deposit",
    amountUsdc,
    status: "confirmed",
    balanceAfter: newBalance,
    metadata: { source: "x402", tx_hash: txHash, sender: senderAddress },
  });

  return { transaction, newBalance, walletId: targetWallet.id };
}

export async function recordX402Sale(input: RecordX402SaleInput): Promise<RecordX402SaleResult> {
  const {
    checkoutPage, amountUsdc, txHash, senderAddress, transaction, newBalance,
    nonce, buyerEmail, buyerName, buyerIp, buyerUserAgent, invoiceRef,
  } = input;

  let saleStatus: "confirmed" | "amount_mismatch" = "confirmed";

  if (checkoutPage.amountLocked && checkoutPage.amountUsdc) {
    const expectedUsdc = checkoutPage.amountUsdc;
    const lowerBound = expectedUsdc * 0.99;
    const upperBound = expectedUsdc * 1.01;
    if (amountUsdc < lowerBound || amountUsdc > upperBound) {
      saleStatus = "amount_mismatch";
      console.warn("[x402 Sale] Amount mismatch:", {
        checkoutPageId: checkoutPage.checkoutPageId,
        expectedUsdc,
        receivedUsdc: amountUsdc,
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
      }
    } catch (invErr) {
      console.error("[x402 Sale] Failed to look up invoice:", invErr);
    }
  }

  const saleId = generateSaleId();
  await storage.createSale({
    saleId,
    checkoutPageId: checkoutPage.checkoutPageId,
    ownerUid: checkoutPage.ownerUid,
    amountUsdc,
    paymentMethod: "x402",
    status: saleStatus,
    buyerType: "x402_wallet",
    buyerIdentifier: senderAddress,
    buyerEmail: buyerEmail || null,
    buyerName: buyerName || null,
    buyerIp: buyerIp || null,
    buyerUserAgent: buyerUserAgent || null,
    txHash,
    privyTransactionId: transaction.id,
    checkoutTitle: checkoutPage.title,
    checkoutDescription: checkoutPage.description,
    confirmedAt: new Date(),
    invoiceId: linkedInvoiceId,
    x402Nonce: nonce || null,
  });

  await storage.incrementCheckoutPageStats(checkoutPage.checkoutPageId, amountUsdc);

  if (linkedInvoiceId) {
    try {
      await storage.markInvoicePaid(linkedInvoiceId, saleId);
    } catch (invPaidErr) {
      console.error("[x402 Sale] Failed to mark invoice as paid:", invPaidErr);
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
        payment_method: "x402",
        status: saleStatus,
        buyer_wallet: senderAddress,
        buyer_email: buyerEmail || null,
        new_balance_usd: newBalance / 1_000_000,
        ...(linkedInvoiceId ? { invoice_id: linkedInvoiceId, invoice_ref: invoiceRef } : {}),
      });
    }
  } catch (webhookErr) {
    console.error("[x402 Sale] Failed to fire webhook:", webhookErr);
  }

  return { saleId, status: saleStatus };
}
