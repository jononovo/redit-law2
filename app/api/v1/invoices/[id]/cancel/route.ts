import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";

export async function POST(
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

    if (invoice.status === "paid" || invoice.status === "cancelled") {
      return NextResponse.json({ error: "invoice_cannot_be_cancelled", detail: `Invoice is already ${invoice.status}` }, { status: 400 });
    }

    const updated = await storage.cancelInvoice(id);
    if (!updated) {
      return NextResponse.json({ error: "cancel_failed" }, { status: 500 });
    }

    return NextResponse.json({
      invoice_id: updated.invoiceId,
      reference_number: updated.referenceNumber,
      status: updated.status,
    });
  } catch (err) {
    console.error("POST /api/v1/invoices/[id]/cancel error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
