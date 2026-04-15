import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/server/storage";
import crypto from "crypto";

function generateSaleId(): string {
  return `sale_${crypto.randomBytes(6).toString("hex")}`;
}

const testPaymentSchema = z.object({
  card_number: z.string().default(""),
  card_expiry: z.string().default(""),
  card_cvv: z.string().default(""),
  cardholder_name: z.string().default(""),
  billing_address: z.string().default(""),
  billing_city: z.string().default(""),
  billing_state: z.string().default(""),
  billing_zip: z.string().default(""),
  billing_country: z.string().default(""),
  buyer_name: z.string().default(""),
});

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

    if (!page.allowedMethods.includes("testing")) {
      return NextResponse.json({ error: "Testing method is not enabled for this checkout page" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = testPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const {
      card_number, card_expiry, card_cvv, cardholder_name,
      billing_address, billing_city, billing_state, billing_zip, billing_country,
      buyer_name,
    } = parsed.data;

    const resolvedBuyerName = buyer_name || cardholder_name || "";

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const userAgent = request.headers.get("user-agent") || null;
    const testToken = request.nextUrl.searchParams.get("t") || null;

    const amountUsdc = page.amountUsdc || 0;

    const saleId = generateSaleId();
    await storage.createSale({
      saleId,
      checkoutPageId: page.checkoutPageId,
      ownerUid: page.ownerUid,
      amountUsdc,
      paymentMethod: "testing",
      status: "test",
      buyerType: "test",
      buyerName: resolvedBuyerName || null,
      buyerIp: ip,
      buyerUserAgent: userAgent,
      checkoutTitle: page.title,
      checkoutDescription: page.description,
      confirmedAt: new Date(),
      metadata: {
        cardNumber: card_number,
        cardExpiry: card_expiry,
        cardCvv: card_cvv,
        cardholderName: cardholder_name,
        billingAddress: billing_address,
        billingCity: billing_city,
        billingState: billing_state,
        billingZip: billing_zip,
        billingCountry: billing_country,
        ...(testToken ? { testToken } : {}),
      },
    });

    await storage.incrementCheckoutPageStats(page.checkoutPageId, amountUsdc);

    if (testToken) {
      try {
        const cards = await storage.getRail5CardsByOwnerUid(page.ownerUid);
        const card = cards.find((c) => c.testToken === testToken);
        if (card && !card.testStartedAt) {
          await storage.updateRail5Card(card.cardId, { testStartedAt: new Date() });
          console.log("[Testing Checkout] testStartedAt fallback set for card:", card.cardId);
        }
      } catch (e) {
        console.warn("[Testing Checkout] testStartedAt fallback failed:", e);
      }
    }

    console.log("[Testing Checkout] Test payment recorded:", {
      checkoutPageId: id,
      saleId,
    });

    return NextResponse.json({
      status: "test",
      sale_id: saleId,
      amount_usd: amountUsdc / 1_000_000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Testing Checkout] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
