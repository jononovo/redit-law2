import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

const BASE_USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export async function GET(
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

    if (!page.allowedMethods.includes("x402")) {
      return NextResponse.json({ error: "x402 payments are not enabled for this checkout page" }, { status: 400 });
    }

    const sellerProfile = await storage.getSellerProfileByOwnerUid(page.ownerUid);

    const payload = {
      x402: {
        version: 1,
        accepts: [{
          scheme: "exact",
          network: "base",
          maxAmountRequired: page.amountUsdc ? String(page.amountUsdc) : null,
          resource: `/pay/${page.checkoutPageId}`,
          description: page.title,
          payTo: page.walletAddress,
          token: BASE_USDC_CONTRACT,
          extra: {
            checkout_page_id: page.checkoutPageId,
            title: page.title,
            amount_locked: page.amountLocked,
            seller_name: sellerProfile?.businessName || null,
          },
        }],
      },
    };

    return NextResponse.json(payload, { status: 402 });
  } catch (error) {
    console.error("GET /api/v1/checkout/[id]/x402 error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
