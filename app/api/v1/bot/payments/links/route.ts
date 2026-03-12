import { NextRequest, NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";

export const GET = withBotApi("/api/v1/bot/payments/links", async (request, { bot }) => {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 1), 100);
  const statusFilter = url.searchParams.get("status") || undefined;

  if (statusFilter && !["pending", "completed", "expired"].includes(statusFilter)) {
    return NextResponse.json(
      { error: "invalid_status", message: "Status must be one of: pending, completed, expired." },
      { status: 400 }
    );
  }

  const dbStatus = statusFilter === "expired" ? "pending" : statusFilter;
  const links = await storage.getPaymentLinksByBotId(bot.botId, limit, dbStatus);
  const now = new Date();

  let paymentLinks = links.map((link) => {
    const effectiveStatus = link.status === "pending" && link.expiresAt < now ? "expired" : link.status;
    return {
      payment_link_id: link.paymentLinkId,
      amount_usd: link.amountCents / 100,
      description: link.description,
      payer_email: link.payerEmail,
      status: effectiveStatus,
      checkout_url: effectiveStatus === "pending" ? link.checkoutUrl : undefined,
      created_at: link.createdAt.toISOString(),
      expires_at: link.expiresAt.toISOString(),
      paid_at: link.paidAt?.toISOString() || null,
    };
  });

  if (statusFilter === "expired") {
    paymentLinks = paymentLinks.filter(l => l.status === "expired");
  } else if (statusFilter === "pending") {
    paymentLinks = paymentLinks.filter(l => l.status === "pending");
  }

  return NextResponse.json({ payment_links: paymentLinks });
});
