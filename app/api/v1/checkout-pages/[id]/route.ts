import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { z } from "zod";

const updateCheckoutPageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  amount_usd: z.number().positive().nullable().optional(),
  amount_locked: z.boolean().optional(),
  allowed_methods: z.array(z.enum(["x402", "usdc_direct", "stripe_onramp", "base_pay", "testing"])).min(1).optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
  success_url: z.string().url().nullable().optional(),
  success_message: z.string().max(500).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  page_type: z.enum(["product", "event", "digital_product"]).optional(),
  shop_visible: z.boolean().optional(),
  shop_order: z.number().int().min(0).optional(),
  image_url: z.string().url().max(2000).nullable().optional(),
  collect_buyer_name: z.boolean().optional(),
  digital_product_url: z.string().url().max(2000).nullable().optional(),
});

function formatPage(page: any) {
  return {
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
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const page = await storage.getCheckoutPageById(id);
    if (!page || page.ownerUid !== user.uid) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json(formatPage(page));
  } catch (err) {
    console.error("GET /api/v1/checkout-pages/[id] error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await storage.getCheckoutPageById(id);
    if (!existing || existing.ownerUid !== user.uid) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateCheckoutPageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "validation_error", details: parsed.error.flatten() }, { status: 400 });
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
    if (data.success_message !== undefined) updates.successMessage = data.success_message;
    if (data.expires_at !== undefined) updates.expiresAt = data.expires_at ? new Date(data.expires_at) : null;
    if (data.page_type !== undefined) updates.pageType = data.page_type;
    if (data.shop_visible !== undefined) updates.shopVisible = data.shop_visible;
    if (data.shop_order !== undefined) updates.shopOrder = data.shop_order;
    if (data.image_url !== undefined) updates.imageUrl = data.image_url;
    if (data.collect_buyer_name !== undefined) updates.collectBuyerName = data.collect_buyer_name;
    if (data.digital_product_url !== undefined) updates.digitalProductUrl = data.digital_product_url;

    const updated = await storage.updateCheckoutPage(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    return NextResponse.json(formatPage(updated));
  } catch (err) {
    console.error("PATCH /api/v1/checkout-pages/[id] error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const archived = await storage.archiveCheckoutPage(id, user.uid);
    if (!archived) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, status: "archived" });
  } catch (err) {
    console.error("DELETE /api/v1/checkout-pages/[id] error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
