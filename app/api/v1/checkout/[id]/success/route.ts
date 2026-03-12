import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const saleId = request.nextUrl.searchParams.get("sale_id");

    const page = await storage.getCheckoutPageById(id);
    if (!page) {
      return NextResponse.json({ error: "Checkout page not found" }, { status: 404 });
    }

    let sellerName: string | null = null;
    let sellerLogoUrl: string | null = null;
    let sellerEmail: string | null = null;

    const sellerProfile = await storage.getSellerProfileByOwnerUid(page.ownerUid);
    if (sellerProfile && (sellerProfile.businessName || sellerProfile.logoUrl || sellerProfile.contactEmail)) {
      sellerName = sellerProfile.businessName;
      sellerLogoUrl = sellerProfile.logoUrl;
      sellerEmail = sellerProfile.contactEmail;
    } else {
      const bots = await storage.getBotsByOwnerUid(page.ownerUid);
      const linkedBot = bots.find(b => b.ownerUid === page.ownerUid);
      if (linkedBot) {
        sellerName = linkedBot.botName;
        sellerEmail = linkedBot.ownerEmail;
      }
    }

    const response: Record<string, unknown> = {
      checkout_page_id: page.checkoutPageId,
      title: page.title,
      description: page.description,
      page_type: page.pageType || "product",
      amount_usdc: page.amountUsdc,
      success_url: page.successUrl,
      success_message: page.successMessage,
      seller_name: sellerName,
      seller_logo_url: sellerLogoUrl,
      seller_email: sellerEmail,
      sale_verified: false,
      amount_paid_usdc: null,
      digital_product_url: null,
    };

    if (saleId) {
      const sale = await storage.getSaleById(saleId);
      if (
        sale &&
        sale.checkoutPageId === id &&
        (sale.status === "confirmed" || sale.status === "completed")
      ) {
        response.sale_verified = true;
        response.amount_paid_usdc = sale.amountUsdc;

        if (page.pageType === "digital_product" && page.digitalProductUrl) {
          response.digital_product_url = page.digitalProductUrl;
        }
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/v1/checkout/[id]/success error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
