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
    buyer_ip: sale.buyerIp,
    buyer_user_agent: sale.buyerUserAgent,
    tx_hash: sale.txHash,
    stripe_onramp_session_id: sale.stripeOnrampSessionId,
    privy_transaction_id: sale.privyTransactionId,
    invoice_id: sale.invoiceId,
    metadata: sale.metadata,
    confirmed_at: sale.confirmedAt?.toISOString() || null,
    created_at: sale.createdAt.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sale_id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { sale_id } = await params;
    if (!sale_id) {
      return NextResponse.json({ error: "Sale ID is required" }, { status: 400 });
    }

    const sale = await storage.getSaleById(sale_id);
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    if (sale.ownerUid !== user.uid) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return NextResponse.json({ sale: formatSale(sale) });
  } catch (error) {
    console.error("GET /api/v1/sales/[sale_id] error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
