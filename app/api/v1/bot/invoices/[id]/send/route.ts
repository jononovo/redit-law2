import { NextRequest, NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { generateInvoicePdf, pdfToBase64 } from "@/lib/invoice-pdf";
import { sendInvoiceEmail } from "@/lib/invoice-email";

export const POST = withBotApi("/api/v1/bot/invoices/send", async (request, { bot }) => {
  const wallet = await storage.privyGetWalletByBotId(bot.botId);
  if (!wallet || wallet.status !== "active") {
    return NextResponse.json(
      { error: "wallet_not_found", message: "Bot does not have an active Privy wallet." },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const invoiceIdIndex = segments.indexOf("invoices") + 1;
  const invoiceId = segments[invoiceIdIndex];

  if (!invoiceId) {
    return NextResponse.json(
      { error: "missing_invoice_id", message: "Invoice ID is required." },
      { status: 400 }
    );
  }

  const invoice = await storage.getInvoiceById(invoiceId);
  if (!invoice || invoice.ownerUid !== wallet.ownerUid) {
    return NextResponse.json(
      { error: "not_found", message: "Invoice not found." },
      { status: 404 }
    );
  }

  if (invoice.status !== "draft") {
    return NextResponse.json(
      { error: "only_draft_invoices_can_be_sent", message: "Only draft invoices can be sent." },
      { status: 400 }
    );
  }

  let pdfBase64: string | undefined;
  try {
    const pdfBytes = await generateInvoicePdf(invoice);
    pdfBase64 = pdfToBase64(pdfBytes);
  } catch (pdfErr) {
    console.error("[Bot Invoice Send] PDF generation failed:", pdfErr);
  }

  const updated = await storage.markInvoiceSent(invoiceId);
  if (!updated) {
    return NextResponse.json(
      { error: "send_failed", message: "Failed to send invoice." },
      { status: 500 }
    );
  }

  let emailSent = false;
  let emailReason: string | undefined;
  if (updated.recipientEmail) {
    try {
      const result = await sendInvoiceEmail({
        invoice: updated,
        pdfBase64,
      });
      emailSent = result.sent;
      emailReason = result.reason;
    } catch (emailErr) {
      console.error("[Bot Invoice Send] Email send failed:", emailErr);
      emailReason = "email_error";
    }
  } else {
    emailReason = "no_recipient_email";
  }

  return NextResponse.json({
    invoice_id: updated.invoiceId,
    reference_number: updated.referenceNumber,
    status: updated.status,
    sent_at: updated.sentAt?.toISOString() || null,
    payment_url: updated.paymentUrl,
    email_sent: emailSent,
    email_reason: emailReason,
  });
});
