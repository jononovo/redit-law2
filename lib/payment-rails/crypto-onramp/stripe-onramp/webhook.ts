import { storage } from "@/server/storage";
import { fireWebhook } from "@/lib/webhooks";
import type { OnrampWebhookEvent } from "../types";
import crypto from "crypto";

function generateSaleId(): string {
  return `sale_${crypto.randomBytes(6).toString("hex")}`;
}

export async function handleStripeOnrampFulfillment(event: OnrampWebhookEvent): Promise<void> {
  const { walletAddress, amountUsdc, sessionId, metadata } = event;

  if (amountUsdc <= 0) {
    console.error("[Onramp Webhook] Amount was zero or invalid:", amountUsdc);
    return;
  }

  const targetWallet = await storage.privyGetWalletByAddress(walletAddress);

  if (!targetWallet) {
    console.error("[Onramp Webhook] No wallet found for address:", walletAddress);
    return;
  }

  const newBalance = targetWallet.balanceUsdc + amountUsdc;
  console.log("[Onramp Webhook] Crediting Rail 1 wallet:", {
    walletId: targetWallet.id,
    currentBalance: targetWallet.balanceUsdc,
    creditAmount: amountUsdc,
    newBalance,
  });

  await storage.privyUpdateWalletBalance(targetWallet.id, newBalance);

  const transaction = await storage.privyCreateTransaction({
    walletId: targetWallet.id,
    type: "deposit",
    amountUsdc,
    status: "confirmed",
    stripeSessionId: sessionId,
    balanceAfter: newBalance,
    metadata: metadata || {},
  });

  console.log("[Onramp Webhook] Balance updated and transaction created successfully");

  const checkoutPageId = metadata?.checkout_page_id as string | undefined;
  if (checkoutPageId) {
    console.log("[Onramp Webhook] Checkout payment detected:", { checkoutPageId, amountUsdc });

    try {
      const checkoutPage = await storage.getCheckoutPageById(checkoutPageId);
      if (!checkoutPage) {
        console.error("[Onramp Webhook] Checkout page not found:", checkoutPageId);
        return;
      }

      let saleStatus: "confirmed" | "amount_mismatch" = "confirmed";

      if (checkoutPage.amountLocked && checkoutPage.amountUsdc) {
        const expectedUsdc = checkoutPage.amountUsdc;
        const lowerBound = expectedUsdc * 0.99;
        const upperBound = expectedUsdc * 1.01;
        if (amountUsdc < lowerBound || amountUsdc > upperBound) {
          saleStatus = "amount_mismatch";
          console.warn("[Onramp Webhook] Amount mismatch detected:", {
            checkoutPageId,
            expectedUsdc,
            receivedUsdc: amountUsdc,
            expectedUsd: expectedUsdc / 1_000_000,
            receivedUsd: amountUsdc / 1_000_000,
            diffPercent: ((amountUsdc - expectedUsdc) / expectedUsdc * 100).toFixed(2) + "%",
          });
        }
      }

      const invoiceRef = metadata?.invoice_ref as string | undefined;
      let linkedInvoiceId: string | null = null;

      if (invoiceRef) {
        try {
          const invoice = await storage.getInvoiceByReferenceNumber(invoiceRef);
          if (
            invoice &&
            invoice.checkoutPageId === checkoutPageId &&
            (invoice.status === "sent" || invoice.status === "viewed")
          ) {
            const invoiceLower = invoice.totalUsdc * 0.99;
            const invoiceUpper = invoice.totalUsdc * 1.01;
            if (amountUsdc < invoiceLower || amountUsdc > invoiceUpper) {
              saleStatus = "amount_mismatch";
              console.warn("[Onramp Webhook] Invoice amount mismatch:", {
                invoiceRef,
                expectedUsdc: invoice.totalUsdc,
                receivedUsdc: amountUsdc,
                diffPercent: ((amountUsdc - invoice.totalUsdc) / invoice.totalUsdc * 100).toFixed(2) + "%",
              });
            }
            linkedInvoiceId = invoice.invoiceId;
            console.log("[Onramp Webhook] Invoice matched for payment:", { invoiceRef, invoiceId: invoice.invoiceId });
          } else {
            console.warn("[Onramp Webhook] Invoice ref did not match or not payable:", { invoiceRef, invoiceStatus: invoice?.status });
          }
        } catch (invErr) {
          console.error("[Onramp Webhook] Failed to look up invoice:", invErr);
        }
      }

      const saleId = generateSaleId();
      await storage.createSale({
        saleId,
        checkoutPageId,
        ownerUid: checkoutPage.ownerUid,
        amountUsdc,
        paymentMethod: "stripe_onramp",
        status: saleStatus,
        buyerType: "stripe_customer",
        buyerEmail: (metadata?.buyer_email as string) || null,
        buyerName: (metadata?.buyer_name as string) || null,
        buyerIp: (metadata?.buyer_ip as string) || null,
        buyerUserAgent: (metadata?.buyer_user_agent as string) || null,
        stripeOnrampSessionId: sessionId,
        privyTransactionId: transaction.id,
        checkoutTitle: checkoutPage.title,
        checkoutDescription: checkoutPage.description,
        confirmedAt: new Date(),
        invoiceId: linkedInvoiceId,
      });

      await storage.incrementCheckoutPageStats(checkoutPageId, amountUsdc);
      console.log("[Onramp Webhook] Sale record created:", { saleId, checkoutPageId, linkedInvoiceId });

      if (linkedInvoiceId) {
        try {
          await storage.markInvoicePaid(linkedInvoiceId, saleId);
          console.log("[Onramp Webhook] Invoice marked as paid:", { invoiceId: linkedInvoiceId, saleId });
        } catch (invPaidErr) {
          console.error("[Onramp Webhook] Failed to mark invoice as paid:", invPaidErr);
        }
      }

      try {
        const walletWithBot = await storage.privyGetWalletById(checkoutPage.walletId);
        const walletBotId = walletWithBot?.botId;
        const walletBot = walletBotId ? await storage.getBotByBotId(walletBotId) : null;
        if (walletBot) {
          await fireWebhook(walletBot, "wallet.sale.completed", {
            sale_id: saleId,
            checkout_page_id: checkoutPageId,
            amount_usd: amountUsdc / 1_000_000,
            payment_method: "stripe_onramp",
            status: saleStatus,
            ...(saleStatus === "amount_mismatch" && checkoutPage.amountUsdc ? {
              expected_amount_usd: checkoutPage.amountUsdc / 1_000_000,
            } : {}),
            buyer_email: (metadata?.buyer_email as string) || null,
            new_balance_usd: newBalance / 1_000_000,
            ...(linkedInvoiceId ? { invoice_id: linkedInvoiceId, invoice_ref: invoiceRef } : {}),
          });
        }
      } catch (webhookErr) {
        console.error("[Onramp Webhook] Failed to fire wallet.sale.completed webhook:", webhookErr);
      }
    } catch (err) {
      console.error("[Onramp Webhook] Failed to create sale record:", err);
    }
  }
}

export function parseStripeOnrampEvent(session: Record<string, unknown>): OnrampWebhookEvent | null {
  const transactionDetails = session.transaction_details as Record<string, unknown> | undefined;
  const walletAddress = (transactionDetails?.wallet_addresses as Record<string, string> | undefined)?.ethereum;
  const deliveredAmount = transactionDetails?.destination_amount;

  if (!walletAddress) {
    console.error("[Onramp Webhook] No wallet address in session");
    return null;
  }

  const amountUsdc = deliveredAmount ? Math.round(Number(deliveredAmount) * 1_000_000) : 0;

  const sessionMetadata = session.metadata as Record<string, unknown> | undefined;

  return {
    provider: "stripe",
    walletAddress,
    amountUsdc,
    sessionId: session.id as string,
    metadata: {
      source_currency: transactionDetails?.source_currency,
      source_amount: transactionDetails?.source_amount,
      ...sessionMetadata,
    },
  };
}
