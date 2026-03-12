import { NextRequest, NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";

export const GET = withBotApi("/api/v1/bot/invoices", async (request, { bot }) => {
  const wallet = await storage.privyGetWalletByBotId(bot.botId);
  if (!wallet) {
    return NextResponse.json({ invoices: [] });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const checkoutPageId = url.searchParams.get("checkout_page_id") || undefined;
  const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!, 10) : undefined;

  const invoiceList = await storage.getInvoicesByOwnerUid(wallet.ownerUid, {
    status,
    checkoutPageId,
    limit,
  });

  return NextResponse.json({
    invoices: invoiceList.map(inv => ({
      invoice_id: inv.invoiceId,
      reference_number: inv.referenceNumber,
      checkout_page_id: inv.checkoutPageId,
      status: inv.status,
      recipient_name: inv.recipientName,
      recipient_email: inv.recipientEmail,
      line_items: inv.lineItems,
      subtotal_usd: inv.subtotalUsdc / 1_000_000,
      tax_usd: inv.taxUsdc / 1_000_000,
      total_usd: inv.totalUsdc / 1_000_000,
      payment_url: inv.paymentUrl,
      due_date: inv.dueDate?.toISOString() || null,
      sender_name: inv.senderName,
      sender_email: inv.senderEmail,
      notes: inv.notes,
      sale_id: inv.saleId,
      sent_at: inv.sentAt?.toISOString() || null,
      viewed_at: inv.viewedAt?.toISOString() || null,
      paid_at: inv.paidAt?.toISOString() || null,
      created_at: inv.createdAt.toISOString(),
      updated_at: inv.updatedAt.toISOString(),
    })),
  });
});
