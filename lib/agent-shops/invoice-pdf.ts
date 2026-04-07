import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Invoice } from "@/shared/schema";

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

export async function generateInvoicePdf(invoice: Invoice): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  let y = height - margin;

  const darkColor = rgb(0.1, 0.1, 0.18);
  const grayColor = rgb(0.42, 0.45, 0.5);
  const lightGrayColor = rgb(0.82, 0.84, 0.86);

  page.drawText("CreditClaw", {
    x: margin,
    y,
    size: 22,
    font: fontBold,
    color: darkColor,
  });
  y -= 20;

  page.drawText("INVOICE", {
    x: margin,
    y,
    size: 10,
    font: fontRegular,
    color: grayColor,
  });
  y -= 30;

  page.drawText(invoice.referenceNumber, {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: darkColor,
  });

  const dueDateLabel = "Due Date:";
  const dueDateValue = formatDate(invoice.dueDate);
  const dueLabelWidth = fontRegular.widthOfTextAtSize(dueDateLabel, 10);
  page.drawText(dueDateLabel, {
    x: width - margin - dueLabelWidth - fontRegular.widthOfTextAtSize(` ${dueDateValue}`, 10),
    y: y + 4,
    size: 10,
    font: fontRegular,
    color: grayColor,
  });
  page.drawText(` ${dueDateValue}`, {
    x: width - margin - fontBold.widthOfTextAtSize(` ${dueDateValue}`, 10),
    y: y + 4,
    size: 10,
    font: fontBold,
    color: darkColor,
  });

  y -= 30;

  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: lightGrayColor,
  });
  y -= 25;

  page.drawText("FROM", {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: grayColor,
  });
  page.drawText("BILL TO", {
    x: width / 2 + 20,
    y,
    size: 9,
    font: fontBold,
    color: grayColor,
  });
  y -= 16;

  page.drawText(invoice.senderName || "—", {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: darkColor,
  });
  page.drawText(invoice.recipientName || "—", {
    x: width / 2 + 20,
    y,
    size: 11,
    font: fontBold,
    color: darkColor,
  });
  y -= 14;

  if (invoice.senderEmail) {
    page.drawText(invoice.senderEmail, {
      x: margin,
      y,
      size: 9,
      font: fontRegular,
      color: grayColor,
    });
  }
  if (invoice.recipientEmail) {
    page.drawText(invoice.recipientEmail, {
      x: width / 2 + 20,
      y,
      size: 9,
      font: fontRegular,
      color: grayColor,
    });
  }
  y -= 30;

  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: lightGrayColor,
  });
  y -= 20;

  const colX = {
    desc: margin,
    qty: 340,
    unit: 400,
    amount: width - margin - 60,
  };

  page.drawText("DESCRIPTION", { x: colX.desc, y, size: 8, font: fontBold, color: grayColor });
  page.drawText("QTY", { x: colX.qty, y, size: 8, font: fontBold, color: grayColor });
  page.drawText("UNIT PRICE", { x: colX.unit, y, size: 8, font: fontBold, color: grayColor });
  page.drawText("AMOUNT", { x: colX.amount, y, size: 8, font: fontBold, color: grayColor });
  y -= 6;

  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: lightGrayColor,
  });
  y -= 16;

  const lineItems = (invoice.lineItems || []) as Array<{ description: string; quantity: number; unitPriceUsd: number; amountUsd: number }>;

  for (const item of lineItems) {
    const descText = item.description.length > 45 ? item.description.substring(0, 42) + "..." : item.description;
    page.drawText(descText, { x: colX.desc, y, size: 10, font: fontRegular, color: darkColor });
    page.drawText(String(item.quantity), { x: colX.qty, y, size: 10, font: fontRegular, color: darkColor });
    page.drawText(`$${item.unitPriceUsd.toFixed(2)}`, { x: colX.unit, y, size: 10, font: fontRegular, color: darkColor });
    page.drawText(`$${item.amountUsd.toFixed(2)}`, { x: colX.amount, y, size: 10, font: fontRegular, color: darkColor });
    y -= 20;
  }

  y -= 10;
  page.drawLine({
    start: { x: 300, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: lightGrayColor,
  });
  y -= 18;

  const subtotalLabel = "Subtotal";
  const subtotalValue = formatCurrency(invoice.subtotalUsdc);
  page.drawText(subtotalLabel, { x: 340, y, size: 10, font: fontRegular, color: grayColor });
  page.drawText(subtotalValue, { x: colX.amount, y, size: 10, font: fontRegular, color: darkColor });
  y -= 16;

  if (invoice.taxUsdc > 0) {
    const taxValue = formatCurrency(invoice.taxUsdc);
    page.drawText("Tax", { x: 340, y, size: 10, font: fontRegular, color: grayColor });
    page.drawText(taxValue, { x: colX.amount, y, size: 10, font: fontRegular, color: darkColor });
    y -= 16;
  }

  page.drawLine({
    start: { x: 300, y },
    end: { x: width - margin, y },
    thickness: 2,
    color: darkColor,
  });
  y -= 18;

  const totalValue = formatCurrency(invoice.totalUsdc);
  page.drawText("Total", { x: 340, y, size: 14, font: fontBold, color: darkColor });
  page.drawText(totalValue, { x: colX.amount, y, size: 14, font: fontBold, color: darkColor });
  y -= 30;

  if (invoice.notes) {
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: lightGrayColor,
    });
    y -= 20;
    page.drawText("NOTES", { x: margin, y, size: 9, font: fontBold, color: grayColor });
    y -= 16;

    const words = invoice.notes.split(" ");
    let line = "";
    const maxLineWidth = width - margin * 2;
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (fontRegular.widthOfTextAtSize(testLine, 9) > maxLineWidth) {
        page.drawText(line, { x: margin, y, size: 9, font: fontRegular, color: darkColor });
        y -= 14;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, { x: margin, y, size: 9, font: fontRegular, color: darkColor });
      y -= 14;
    }
    y -= 10;
  }

  y -= 10;
  page.drawText("Pay online:", { x: margin, y, size: 9, font: fontRegular, color: grayColor });
  y -= 14;
  const payUrl = invoice.paymentUrl.length > 80 ? invoice.paymentUrl.substring(0, 77) + "..." : invoice.paymentUrl;
  page.drawText(payUrl, { x: margin, y, size: 9, font: fontRegular, color: rgb(0.16, 0.39, 0.78) });

  page.drawText("Powered by CreditClaw", {
    x: margin,
    y: 30,
    size: 8,
    font: fontRegular,
    color: grayColor,
  });

  return pdfDoc.save();
}

export function pdfToBase64(pdfBytes: Uint8Array): string {
  return Buffer.from(pdfBytes).toString("base64");
}
