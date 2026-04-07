import sgMail from "@sendgrid/mail";
import type { Invoice } from "@/shared/schema";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@creditclaw.com";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

interface SendInvoiceEmailOptions {
  invoice: Invoice;
  pdfBase64?: string;
}

function formatCurrency(usdc: number): string {
  return `$${(usdc / 1_000_000).toFixed(2)}`;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildLineItemsHtml(lineItems: Array<{ description: string; quantity: number; unitPriceUsd: number; amountUsd: number }>): string {
  const rows = lineItems.map((item) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">${item.description}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; text-align: right;">$${item.unitPriceUsd.toFixed(2)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; text-align: right;">$${item.amountUsd.toFixed(2)}</td>
    </tr>
  `).join("");

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Description</th>
          <th style="padding: 10px 12px; text-align: center; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Qty</th>
          <th style="padding: 10px 12px; text-align: right; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
          <th style="padding: 10px 12px; text-align: right; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function buildInvoiceEmailHtml(invoice: Invoice): string {
  const lineItems = (invoice.lineItems || []) as Array<{ description: string; quantity: number; unitPriceUsd: number; amountUsd: number }>;
  const subtotal = formatCurrency(invoice.subtotalUsdc);
  const tax = invoice.taxUsdc > 0 ? formatCurrency(invoice.taxUsdc) : null;
  const total = formatCurrency(invoice.totalUsdc);

  return `
<div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #ffffff;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 800; color: #1a1a2e; margin: 0;">CreditClaw</h1>
    <p style="color: #888; font-size: 14px; margin-top: 4px;">Invoice</p>
  </div>

  <div style="background: #f9fafb; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 24px;">
      <div>
        <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">Invoice</p>
        <p style="font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0;">${invoice.referenceNumber}</p>
      </div>
      <div style="text-align: right;">
        <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">Due Date</p>
        <p style="font-size: 15px; font-weight: 600; color: #1a1a2e; margin: 0;">${formatDate(invoice.dueDate)}</p>
      </div>
    </div>

    <div style="display: flex; gap: 40px; margin-bottom: 24px;">
      <div style="flex: 1;">
        <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">From</p>
        <p style="font-size: 15px; font-weight: 600; color: #1a1a2e; margin: 0;">${invoice.senderName || "—"}</p>
        ${invoice.senderEmail ? `<p style="font-size: 13px; color: #666; margin: 4px 0 0;">${invoice.senderEmail}</p>` : ""}
      </div>
      <div style="flex: 1;">
        <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Bill To</p>
        <p style="font-size: 15px; font-weight: 600; color: #1a1a2e; margin: 0;">${invoice.recipientName || "—"}</p>
        ${invoice.recipientEmail ? `<p style="font-size: 13px; color: #666; margin: 4px 0 0;">${invoice.recipientEmail}</p>` : ""}
      </div>
    </div>

    ${buildLineItemsHtml(lineItems)}

    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 12px; font-size: 14px; color: #666;">Subtotal</td>
          <td style="padding: 4px 12px; font-size: 14px; color: #1a1a2e; text-align: right; font-weight: 600;">${subtotal}</td>
        </tr>
        ${tax ? `
        <tr>
          <td style="padding: 4px 12px; font-size: 14px; color: #666;">Tax</td>
          <td style="padding: 4px 12px; font-size: 14px; color: #1a1a2e; text-align: right; font-weight: 600;">${tax}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding: 8px 12px; font-size: 18px; font-weight: 700; color: #1a1a2e; border-top: 2px solid #1a1a2e;">Total</td>
          <td style="padding: 8px 12px; font-size: 18px; font-weight: 700; color: #1a1a2e; text-align: right; border-top: 2px solid #1a1a2e;">${total}</td>
        </tr>
      </table>
    </div>

    ${invoice.notes ? `
    <div style="margin-top: 20px; padding: 16px; background: white; border-radius: 12px; border: 1px solid #e5e7eb;">
      <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Notes</p>
      <p style="font-size: 14px; color: #374151; margin: 0; line-height: 1.6;">${invoice.notes}</p>
    </div>
    ` : ""}

    <a href="${invoice.paymentUrl}" style="display: block; background: #1a1a2e; color: white; text-align: center; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; margin-top: 24px;">
      Pay ${total} &rarr;
    </a>
  </div>

  <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 24px; line-height: 1.5;">
    Powered by <a href="https://creditclaw.com" style="color: #888; text-decoration: none;">CreditClaw</a>
  </p>
</div>`;
}

function buildInvoiceEmailText(invoice: Invoice): string {
  const lineItems = (invoice.lineItems || []) as Array<{ description: string; quantity: number; unitPriceUsd: number; amountUsd: number }>;
  const total = formatCurrency(invoice.totalUsdc);
  const subtotal = formatCurrency(invoice.subtotalUsdc);

  let text = `INVOICE ${invoice.referenceNumber}\n\n`;
  text += `From: ${invoice.senderName || "—"}${invoice.senderEmail ? ` (${invoice.senderEmail})` : ""}\n`;
  text += `To: ${invoice.recipientName || "—"}${invoice.recipientEmail ? ` (${invoice.recipientEmail})` : ""}\n`;
  text += `Due Date: ${formatDate(invoice.dueDate)}\n\n`;
  text += `--- Line Items ---\n`;
  for (const item of lineItems) {
    text += `${item.description} — Qty: ${item.quantity} × $${item.unitPriceUsd.toFixed(2)} = $${item.amountUsd.toFixed(2)}\n`;
  }
  text += `\nSubtotal: ${subtotal}\n`;
  if (invoice.taxUsdc > 0) {
    text += `Tax: ${formatCurrency(invoice.taxUsdc)}\n`;
  }
  text += `Total: ${total}\n`;
  if (invoice.notes) {
    text += `\nNotes: ${invoice.notes}\n`;
  }
  text += `\nPay now: ${invoice.paymentUrl}\n`;
  text += `\n— CreditClaw`;
  return text;
}

export async function sendInvoiceEmail({ invoice, pdfBase64 }: SendInvoiceEmailOptions): Promise<{ sent: boolean; reason?: string }> {
  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set — skipping invoice email send");
    return { sent: false, reason: "no_api_key" };
  }

  if (!invoice.recipientEmail) {
    console.warn("No recipient email on invoice — skipping email send");
    return { sent: false, reason: "no_recipient_email" };
  }

  const total = formatCurrency(invoice.totalUsdc);
  const subject = `Invoice ${invoice.referenceNumber} — ${total} due${invoice.dueDate ? ` by ${formatDate(invoice.dueDate)}` : ""}`;

  const msg: any = {
    to: invoice.recipientEmail,
    from: {
      email: FROM_EMAIL,
      name: invoice.senderName || "CreditClaw",
    },
    subject,
    text: buildInvoiceEmailText(invoice),
    html: buildInvoiceEmailHtml(invoice),
  };

  if (pdfBase64) {
    msg.attachments = [
      {
        content: pdfBase64,
        filename: `${invoice.referenceNumber}.pdf`,
        type: "application/pdf",
        disposition: "attachment",
      },
    ];
  }

  try {
    await sgMail.send(msg);
    return { sent: true };
  } catch (error: any) {
    console.error("SendGrid invoice email failed:", error?.response?.body || error?.message);
    return { sent: false, reason: "send_failed" };
  }
}
