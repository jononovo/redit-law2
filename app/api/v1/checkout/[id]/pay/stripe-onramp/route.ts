import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { createStripeOnrampSession } from "@/lib/crypto-onramp/stripe-onramp/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const page = await storage.getCheckoutPageById(id);
    if (!page || page.status !== "active") {
      return NextResponse.json({ error: "Checkout page not found" }, { status: 404 });
    }

    if (page.expiresAt && new Date(page.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Checkout page has expired" }, { status: 410 });
    }

    if (!page.allowedMethods.includes("stripe_onramp")) {
      return NextResponse.json({ error: "Stripe onramp payments are not enabled for this checkout page" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const invoiceRef = body.invoice_ref as string | undefined;
    const buyerName = typeof body.buyer_name === "string" ? body.buyer_name.trim().slice(0, 200) : undefined;

    let amountUsd: number | undefined;
    let resolvedInvoiceRef: string | undefined;

    if (invoiceRef) {
      const invoice = await storage.getInvoiceByReferenceNumber(invoiceRef);
      if (!invoice || invoice.checkoutPageId !== page.checkoutPageId) {
        return NextResponse.json({ error: "Invalid invoice reference" }, { status: 400 });
      }
      if (invoice.status === "draft") {
        return NextResponse.json({ error: "Invoice has not been sent yet" }, { status: 400 });
      }
      if (invoice.status === "paid") {
        return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });
      }
      if (invoice.status === "cancelled") {
        return NextResponse.json({ error: "Invoice has been cancelled" }, { status: 400 });
      }
      amountUsd = invoice.totalUsdc / 1_000_000;
      resolvedInvoiceRef = invoice.referenceNumber;
    } else if (page.amountLocked && page.amountUsdc) {
      amountUsd = page.amountUsdc / 1_000_000;
    } else {
      if (body.amount_usd && typeof body.amount_usd === "number" && body.amount_usd > 0) {
        amountUsd = body.amount_usd;
      }
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const { clientSecret, sessionId, redirectUrl } = await createStripeOnrampSession({
      walletAddress: page.walletAddress,
      customerIp: ip,
      amountUsd,
      metadata: {
        checkout_page_id: page.checkoutPageId,
        ...(ip ? { buyer_ip: ip } : {}),
        ...(userAgent ? { buyer_user_agent: userAgent } : {}),
        ...(resolvedInvoiceRef ? { invoice_ref: resolvedInvoiceRef } : {}),
        ...(buyerName ? { buyer_name: buyerName } : {}),
      },
    });

    return NextResponse.json({
      client_secret: clientSecret,
      session_id: sessionId,
      redirect_url: redirectUrl,
      wallet_address: page.walletAddress,
      amount_usd: amountUsd,
    });
  } catch (error) {
    console.error("POST /api/v1/checkout/[id]/pay/stripe-onramp error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
