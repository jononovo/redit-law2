import { NextRequest, NextResponse } from "next/server";
import { withBotApi } from "@/lib/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { botCreateCheckoutPageSchema } from "@/shared/schema";
import { randomBytes } from "crypto";

function generateCheckoutPageId(): string {
  return `cp_${randomBytes(6).toString("hex")}`;
}

export const POST = withBotApi("/api/v1/bot/checkout-pages/create", async (request, { bot }) => {
  const wallet = await storage.privyGetWalletByBotId(bot.botId);
  if (!wallet || wallet.status !== "active") {
    return NextResponse.json(
      { error: "wallet_not_found", message: "Bot does not have an active Privy wallet." },
      { status: 400 }
    );
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

  const parsed = botCreateCheckoutPageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", message: parsed.error.issues[0]?.message || "Invalid request body." },
      { status: 400 }
    );
  }

  const { title, description, amount_usd, amount_locked, allowed_methods, success_url, expires_at, page_type, image_url, collect_buyer_name, digital_product_url, shop_visible, shop_order } = parsed.data;
  const checkoutPageId = generateCheckoutPageId();
  const amountUsdc = amount_usd ? Math.round(amount_usd * 1_000_000) : null;

  const page = await storage.createCheckoutPage({
    checkoutPageId,
    ownerUid: wallet.ownerUid,
    walletId: wallet.id,
    walletAddress: wallet.address,
    title,
    description: description || null,
    amountUsdc,
    amountLocked: amount_locked,
    allowedMethods: allowed_methods,
    successUrl: success_url || null,
    expiresAt: expires_at ? new Date(expires_at) : null,
    pageType: page_type || "product",
    imageUrl: image_url || null,
    collectBuyerName: collect_buyer_name || false,
    digitalProductUrl: digital_product_url || null,
    shopVisible: shop_visible || false,
    shopOrder: shop_order || 0,
  });

  return NextResponse.json({
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
    created_at: page.createdAt.toISOString(),
  }, { status: 201 });
});
