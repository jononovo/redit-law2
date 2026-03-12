import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { createInvoiceSchema } from "@/shared/schema";
import crypto from "crypto";

function formatInvoice(invoice: any) {
  return {
    invoice_id: invoice.invoiceId,
    owner_uid: invoice.ownerUid,
    checkout_page_id: invoice.checkoutPageId,
    reference_number: invoice.referenceNumber,
    status: invoice.status,
    recipient_name: invoice.recipientName,
    recipient_email: invoice.recipientEmail,
    recipient_type: invoice.recipientType,
    line_items: invoice.lineItems,
    subtotal_usd: invoice.subtotalUsdc / 1_000_000,
    tax_usd: invoice.taxUsdc / 1_000_000,
    total_usd: invoice.totalUsdc / 1_000_000,
    payment_url: invoice.paymentUrl,
    pdf_url: invoice.pdfUrl,
    due_date: invoice.dueDate?.toISOString() || null,
    sender_name: invoice.senderName,
    sender_email: invoice.senderEmail,
    notes: invoice.notes,
    sale_id: invoice.saleId,
    sent_at: invoice.sentAt?.toISOString() || null,
    viewed_at: invoice.viewedAt?.toISOString() || null,
    paid_at: invoice.paidAt?.toISOString() || null,
    created_at: invoice.createdAt.toISOString(),
    updated_at: invoice.updatedAt.toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "validation_error", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const checkoutPage = await storage.getCheckoutPageById(data.checkout_page_id);
    if (!checkoutPage || checkoutPage.ownerUid !== user.uid) {
      return NextResponse.json({ error: "checkout_page_not_found" }, { status: 404 });
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
    const referenceNumber = await storage.getNextReferenceNumber(user.uid);

    const paymentUrl = `/pay/${checkoutPage.checkoutPageId}?ref=${referenceNumber}`;

    const dueDate = data.due_date
      ? new Date(data.due_date)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await storage.createInvoice({
      invoiceId,
      ownerUid: user.uid,
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
      senderName: user.displayName || null,
      senderEmail: user.email || null,
      notes: data.notes || null,
    });

    return NextResponse.json(formatInvoice(invoice), { status: 201 });
  } catch (err) {
    console.error("POST /api/v1/invoices error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const checkoutPageId = searchParams.get("checkout_page_id") || undefined;
    const dateFrom = searchParams.get("date_from") ? new Date(searchParams.get("date_from")!) : undefined;
    const dateTo = searchParams.get("date_to") ? new Date(searchParams.get("date_to")!) : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

    const invoiceList = await storage.getInvoicesByOwnerUid(user.uid, {
      status,
      checkoutPageId,
      dateFrom,
      dateTo,
      limit,
    });

    return NextResponse.json({ invoices: invoiceList.map(formatInvoice) });
  } catch (err) {
    console.error("GET /api/v1/invoices error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
