import { NextRequest, NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { botUpdateCheckoutPageSchema } from "@/shared/schema";

function formatPage(page: any) {
  return {
    checkout_page_id: page.checkoutPageId,
    checkout_url: `/pay/${page.checkoutPageId}`,
    title: page.title,
    description: page.description,
    wallet_address: page.walletAddress,
    amount_usd: page.amountUsdc ? page.amountUsdc / 1_000_000 : null,
    amount_locked: page.amountLocked,
    allowed_methods: page.allowedMethods,
    status: page.status,
    page_type: page.pageType || "product",
    image_url: page.imageUrl || null,
    collect_buyer_name: page.collectBuyerName || false,
    digital_product_url: page.digitalProductUrl || null,
    shop_visible: page.shopVisible || false,
    shop_order: page.shopOrder || 0,
    view_count: page.viewCount,
    payment_count: page.paymentCount,
    total_received_usd: page.totalReceivedUsdc / 1_000_000,
    created_at: page.createdAt.toISOString(),
    expires_at: page.expiresAt?.toISOString() || null,
  };
}

export const GET = withBotApi("/api/v1/bot/checkout-pages/[id]", async (request, { bot }) => {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const id = segments[segments.length - 1];

  const page = await storage.getCheckoutPageById(id);
  if (!page) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const wallet = await storage.privyGetWalletByBotId(bot.botId);
  if (!wallet || page.walletId !== wallet.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(formatPage(page));
});

export const PATCH = withBotApi("/api/v1/bot/checkout-pages/[id]", async (request, { bot }) => {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const id = segments[segments.length - 1];

  const existing = await storage.getCheckoutPageById(id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const wallet = await storage.privyGetWalletByBotId(bot.botId);
  if (!wallet || existing.walletId !== wallet.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = botUpdateCheckoutPageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", message: parsed.error.issues[0]?.message || "Invalid request body." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const updates: Record<string, any> = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.amount_usd !== undefined) updates.amountUsdc = data.amount_usd ? Math.round(data.amount_usd * 1_000_000) : null;
  if (data.amount_locked !== undefined) updates.amountLocked = data.amount_locked;
  if (data.allowed_methods !== undefined) updates.allowedMethods = data.allowed_methods;
  if (data.status !== undefined) updates.status = data.status;
  if (data.success_url !== undefined) updates.successUrl = data.success_url;
  if (data.expires_at !== undefined) updates.expiresAt = data.expires_at ? new Date(data.expires_at) : null;
  if (data.page_type !== undefined) updates.pageType = data.page_type;
  if (data.shop_visible !== undefined) updates.shopVisible = data.shop_visible;
  if (data.shop_order !== undefined) updates.shopOrder = data.shop_order;
  if (data.image_url !== undefined) updates.imageUrl = data.image_url;
  if (data.collect_buyer_name !== undefined) updates.collectBuyerName = data.collect_buyer_name;
  if (data.digital_product_url !== undefined) updates.digitalProductUrl = data.digital_product_url;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(formatPage(existing));
  }

  const updated = await storage.updateCheckoutPage(id, updates);
  if (!updated) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json(formatPage(updated));
});
