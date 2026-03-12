import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { z } from "zod";

const updateInvoiceSchema = z.object({
  recipient_name: z.string().max(200).optional().nullable(),
  recipient_email: z.string().email().max(200).optional().nullable(),
  recipient_type: z.enum(["human", "bot", "agent"]).optional().nullable(),
  line_items: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unit_price_usd: z.number().min(0),
  })).min(1).optional(),
  tax_usd: z.number().min(0).optional(),
  due_date: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
}).strict();

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const invoice = await storage.getInvoiceById(id);
    if (!invoice || invoice.ownerUid !== user.uid) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json(formatInvoice(invoice));
  } catch (err) {
    console.error("GET /api/v1/invoices/[id] error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await storage.getInvoiceById(id);
    if (!existing || existing.ownerUid !== user.uid) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (existing.status !== "draft") {
      return NextResponse.json({ error: "only_draft_invoices_can_be_updated" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "validation_error", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const updates: Record<string, any> = {};

    if (data.recipient_name !== undefined) updates.recipientName = data.recipient_name;
    if (data.recipient_email !== undefined) updates.recipientEmail = data.recipient_email;
    if (data.recipient_type !== undefined) updates.recipientType = data.recipient_type;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.due_date !== undefined) updates.dueDate = data.due_date ? new Date(data.due_date) : null;

    if (data.line_items !== undefined) {
      const lineItems = data.line_items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPriceUsd: item.unit_price_usd,
        amountUsd: item.quantity * item.unit_price_usd,
      }));

      const subtotalUsd = lineItems.reduce((sum, item) => sum + item.amountUsd, 0);
      const taxUsd = data.tax_usd !== undefined ? data.tax_usd : existing.taxUsdc / 1_000_000;
      const totalUsd = subtotalUsd + taxUsd;

      updates.lineItems = lineItems;
      updates.subtotalUsdc = Math.round(subtotalUsd * 1_000_000);
      updates.taxUsdc = Math.round(taxUsd * 1_000_000);
      updates.totalUsdc = Math.round(totalUsd * 1_000_000);
    } else if (data.tax_usd !== undefined) {
      const subtotalUsd = existing.subtotalUsdc / 1_000_000;
      updates.taxUsdc = Math.round(data.tax_usd * 1_000_000);
      updates.totalUsdc = Math.round((subtotalUsd + data.tax_usd) * 1_000_000);
    }

    const updated = await storage.updateInvoice(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    return NextResponse.json(formatInvoice(updated));
  } catch (err) {
    console.error("PATCH /api/v1/invoices/[id] error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
