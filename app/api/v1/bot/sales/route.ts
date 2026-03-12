import { NextRequest, NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";

export const GET = withBotApi("/api/v1/bot/sales", async (request, { bot }) => {
  const wallet = await storage.privyGetWalletByBotId(bot.botId);
  if (!wallet) {
    return NextResponse.json({ sales: [] });
  }

  const url = new URL(request.url);
  const checkoutPageId = url.searchParams.get("checkout_page_id") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const paymentMethod = url.searchParams.get("payment_method") || undefined;
  const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!, 10) : undefined;

  const salesData = await storage.getSalesByOwnerUid(wallet.ownerUid, {
    checkoutPageId,
    status,
    paymentMethod,
    limit,
  });

  return NextResponse.json({
    sales: salesData.map(s => ({
      sale_id: s.saleId,
      checkout_page_id: s.checkoutPageId,
      amount_usd: s.amountUsdc / 1_000_000,
      payment_method: s.paymentMethod,
      status: s.status,
      buyer_type: s.buyerType,
      buyer_identifier: s.buyerIdentifier,
      buyer_email: s.buyerEmail,
      tx_hash: s.txHash,
      checkout_title: s.checkoutTitle,
      confirmed_at: s.confirmedAt?.toISOString() || null,
      created_at: s.createdAt.toISOString(),
    })),
  });
});
