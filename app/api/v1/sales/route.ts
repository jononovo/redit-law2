import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import type { Sale } from "@/shared/schema";

function formatSale(sale: Sale) {
  return {
    sale_id: sale.saleId,
    checkout_page_id: sale.checkoutPageId,
    checkout_title: sale.checkoutTitle,
    checkout_description: sale.checkoutDescription,
    amount_usd: sale.amountUsdc / 1_000_000,
    payment_method: sale.paymentMethod,
    status: sale.status,
    buyer_type: sale.buyerType,
    buyer_email: sale.buyerEmail,
    buyer_identifier: sale.buyerIdentifier,
    confirmed_at: sale.confirmedAt?.toISOString() || null,
    created_at: sale.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const checkoutPageId = params.get("checkout_page_id") || undefined;
    const status = params.get("status") || undefined;
    const paymentMethod = params.get("payment_method") || undefined;
    const limit = params.get("limit") ? Number(params.get("limit")) : undefined;

    const salesList = await storage.getSalesByOwnerUid(user.uid, {
      checkoutPageId,
      status,
      paymentMethod,
      limit,
    });

    return NextResponse.json({ sales: salesList.map(formatSale), total: salesList.length });
  } catch (error) {
    console.error("GET /api/v1/sales error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
