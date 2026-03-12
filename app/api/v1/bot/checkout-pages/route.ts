import { NextRequest, NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";

export const GET = withBotApi("/api/v1/bot/checkout-pages", async (request, { bot }) => {
  const wallet = await storage.privyGetWalletByBotId(bot.botId);
  if (!wallet) {
    return NextResponse.json({ checkout_pages: [] });
  }

  const pages = await storage.getCheckoutPagesByOwnerUid(wallet.ownerUid);
  const botPages = pages.filter(p => p.walletId === wallet.id);

  return NextResponse.json({
    checkout_pages: botPages.map(p => ({
      checkout_page_id: p.checkoutPageId,
      checkout_url: `/pay/${p.checkoutPageId}`,
      title: p.title,
      description: p.description,
      wallet_address: p.walletAddress,
      amount_usd: p.amountUsdc ? p.amountUsdc / 1_000_000 : null,
      amount_locked: p.amountLocked,
      allowed_methods: p.allowedMethods,
      status: p.status,
      page_type: p.pageType || "product",
      image_url: p.imageUrl || null,
      collect_buyer_name: p.collectBuyerName || false,
      digital_product_url: p.digitalProductUrl || null,
      shop_visible: p.shopVisible || false,
      shop_order: p.shopOrder || 0,
      view_count: p.viewCount,
      payment_count: p.paymentCount,
      total_received_usd: p.totalReceivedUsdc / 1_000_000,
      created_at: p.createdAt.toISOString(),
      expires_at: p.expiresAt?.toISOString() || null,
    })),
  });
});
