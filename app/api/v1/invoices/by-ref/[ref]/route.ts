import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  try {
    const { ref } = await params;
    const invoice = await storage.getInvoiceByReferenceNumber(ref);

    if (!invoice) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      reference_number: invoice.referenceNumber,
      status: invoice.status,
      recipient_name: invoice.recipientName,
      line_items: invoice.lineItems,
      subtotal_usd: invoice.subtotalUsdc / 1_000_000,
      tax_usd: invoice.taxUsdc / 1_000_000,
      total_usd: invoice.totalUsdc / 1_000_000,
      due_date: invoice.dueDate?.toISOString() || null,
      checkout_page_id: invoice.checkoutPageId,
    });
  } catch (err) {
    console.error("GET /api/v1/invoices/by-ref/[ref] error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
