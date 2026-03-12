import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { generateInvoicePdf, pdfToBase64 } from "@/lib/invoice-pdf";
import { sendInvoiceEmail } from "@/lib/invoice-email";

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

    if (invoice.status !== "draft") {
      return NextResponse.json({ error: "only_draft_invoices_can_be_sent" }, { status: 400 });
    }

    const pdfBytes = await generateInvoicePdf(invoice);
    const pdfBase64 = pdfToBase64(pdfBytes);

    const updated = await storage.markInvoiceSent(id);
    if (!updated) {
      return NextResponse.json({ error: "send_failed" }, { status: 500 });
    }

    const emailResult = await sendInvoiceEmail({
      invoice: updated,
      pdfBase64,
    });

    return NextResponse.json({
      invoice_id: updated.invoiceId,
      reference_number: updated.referenceNumber,
      status: updated.status,
      sent_at: updated.sentAt?.toISOString() || null,
      payment_url: updated.paymentUrl,
      email_sent: emailResult.sent,
      email_reason: emailResult.reason || null,
    });
  } catch (err) {
    console.error("POST /api/v1/invoices/[id]/send error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
