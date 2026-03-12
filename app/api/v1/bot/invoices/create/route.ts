import { NextRequest, NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { createInvoiceSchema } from "@/shared/schema";
import crypto from "crypto";

export const POST = withBotApi("/api/v1/bot/invoices/create", async (request, { bot }) => {
  const wallet = await storage.privyGetWalletByBotId(bot.botId);
  if (!wallet || wallet.status !== "active") {
    return NextResponse.json(
      { error: "wallet_not_found", message: "Bot does not have an active Privy wallet." },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", message: parsed.error.issues[0]?.message || "Invalid request body." },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const checkoutPage = await storage.getCheckoutPageById(data.checkout_page_id);
  if (!checkoutPage || checkoutPage.ownerUid !== wallet.ownerUid) {
    return NextResponse.json(
      { error: "checkout_page_not_found", message: "Checkout page not found or does not belong to this bot's owner." },
      { status: 404 }
    );
  }

  const lineItems = data.line_items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPriceUsd: item.unit_price_usd,
    amountUsd: item.quantity * item.unit_price_usd,
  }));

  const subtotalUsd = lineItems.reduce((sum, item) => sum + item.amountUsd, 0);
  const taxUsd = data.tax_usd || 0;
  const totalUsd = subtotalUsd + taxUsd;

  const subtotalUsdc = Math.round(subtotalUsd * 1_000_000);
  const taxUsdc = Math.round(taxUsd * 1_000_000);
  const totalUsdc = Math.round(totalUsd * 1_000_000);

  const invoiceId = `inv_${crypto.randomBytes(12).toString("hex")}`;
  const referenceNumber = await storage.getNextReferenceNumber(wallet.ownerUid);
  const paymentUrl = `/pay/${checkoutPage.checkoutPageId}?ref=${referenceNumber}`;

  const dueDate = data.due_date
    ? new Date(data.due_date)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const invoice = await storage.createInvoice({
    invoiceId,
    ownerUid: wallet.ownerUid,
    checkoutPageId: data.checkout_page_id,
    referenceNumber,
    status: "draft",
    recipientName: data.recipient_name || null,
    recipientEmail: data.recipient_email || null,
    recipientType: data.recipient_type || null,
    lineItems,
    subtotalUsdc,
    taxUsdc,
    totalUsdc,
    paymentUrl,
    dueDate,
    senderName: bot.botName,
    senderEmail: bot.ownerEmail,
    notes: data.notes || null,
  });

  return NextResponse.json({
    invoice_id: invoice.invoiceId,
    reference_number: invoice.referenceNumber,
    checkout_page_id: invoice.checkoutPageId,
    status: invoice.status,
    recipient_name: invoice.recipientName,
    recipient_email: invoice.recipientEmail,
    line_items: invoice.lineItems,
    subtotal_usd: invoice.subtotalUsdc / 1_000_000,
    tax_usd: invoice.taxUsdc / 1_000_000,
    total_usd: invoice.totalUsdc / 1_000_000,
    payment_url: invoice.paymentUrl,
    due_date: invoice.dueDate?.toISOString() || null,
    created_at: invoice.createdAt.toISOString(),
  }, { status: 201 });
});
