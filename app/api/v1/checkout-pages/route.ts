import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { createCheckoutPageSchema } from "@/shared/schema";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createCheckoutPageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "validation_error", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const wallet = await storage.privyGetWalletById(data.wallet_id);
    if (!wallet || wallet.ownerUid !== user.uid) {
      return NextResponse.json({ error: "wallet_not_found" }, { status: 404 });
    }

    const checkoutPageId = `cp_${crypto.randomBytes(12).toString("hex")}`;
    const amountUsdc = data.amount_usd ? Math.round(data.amount_usd * 1_000_000) : null;

    const page = await storage.createCheckoutPage({
      checkoutPageId,
      ownerUid: user.uid,
      walletId: wallet.id,
      walletAddress: wallet.address,
      title: data.title,
      description: data.description || null,
      amountUsdc,
      amountLocked: data.amount_locked,
      allowedMethods: data.allowed_methods,
      status: "active",
      successUrl: data.success_url || null,
      successMessage: data.success_message || null,
      expiresAt: data.expires_at ? new Date(data.expires_at) : null,
      pageType: data.page_type || "product",
      imageUrl: data.image_url || null,
      collectBuyerName: data.collect_buyer_name || false,
      digitalProductUrl: data.digital_product_url || null,
    });

    return NextResponse.json({
      checkout_page_id: page.checkoutPageId,
      title: page.title,
      description: page.description,
      wallet_id: page.walletId,
      wallet_address: page.walletAddress,
      amount_usd: page.amountUsdc ? page.amountUsdc / 1_000_000 : null,
      amount_locked: page.amountLocked,
      allowed_methods: page.allowedMethods,
      status: page.status,
      success_url: page.successUrl,
      success_message: page.successMessage,
      page_type: page.pageType || "product",
      image_url: page.imageUrl || null,
      collect_buyer_name: page.collectBuyerName || false,
      digital_product_url: page.digitalProductUrl || null,
      view_count: page.viewCount,
      payment_count: page.paymentCount,
      total_received_usd: page.totalReceivedUsdc / 1_000_000,
      checkout_url: `/pay/${page.checkoutPageId}`,
      created_at: page.createdAt.toISOString(),
      expires_at: page.expiresAt?.toISOString() || null,
    }, { status: 201 });
  } catch (err) {
    console.error("POST /api/v1/checkout-pages error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const pages = await storage.getCheckoutPagesByOwnerUid(user.uid);

    const checkoutPages = pages.map((page) => ({
      checkout_page_id: page.checkoutPageId,
      title: page.title,
      description: page.description,
      wallet_id: page.walletId,
      wallet_address: page.walletAddress,
      amount_usd: page.amountUsdc ? page.amountUsdc / 1_000_000 : null,
      amount_locked: page.amountLocked,
      allowed_methods: page.allowedMethods,
      status: page.status,
      success_url: page.successUrl,
      success_message: page.successMessage,
      page_type: page.pageType || "product",
      shop_visible: page.shopVisible || false,
      shop_order: page.shopOrder || 0,
      image_url: page.imageUrl || null,
      collect_buyer_name: page.collectBuyerName || false,
      digital_product_url: page.digitalProductUrl || null,
      view_count: page.viewCount,
      payment_count: page.paymentCount,
      total_received_usd: page.totalReceivedUsdc / 1_000_000,
      checkout_url: `/pay/${page.checkoutPageId}`,
      created_at: page.createdAt.toISOString(),
      updated_at: page.updatedAt.toISOString(),
      expires_at: page.expiresAt?.toISOString() || null,
    }));

    return NextResponse.json({ checkout_pages: checkoutPages });
  } catch (err) {
    console.error("GET /api/v1/checkout-pages error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
