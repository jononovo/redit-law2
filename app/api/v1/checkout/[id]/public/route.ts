import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { RAIL5_TEST_CHECKOUT_PAGE_ID } from "@/features/payment-rails/rail5";

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

    storage.incrementCheckoutPageViewCount(id).catch(() => {});

    if (id === RAIL5_TEST_CHECKOUT_PAGE_ID) {
      const testToken = request.nextUrl.searchParams.get("t");
      if (testToken) {
        storage.getRail5CardByTestToken(testToken).then((card) => {
          if (card && !card.testStartedAt) {
            storage.updateRail5Card(card.cardId, { testStartedAt: new Date() }).catch((err) =>
              console.error("[checkout/public] Failed to set testStartedAt:", err)
            );
          }
        }).catch((err) => {
          console.error("[checkout/public] Failed to look up test token:", err);
        });
      }
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

    return NextResponse.json({
      checkout_page_id: page.checkoutPageId,
      title: page.title,
      description: page.description,
      amount_usdc: page.amountUsdc,
      amount_locked: page.amountLocked,
      allowed_methods: page.allowedMethods,
      success_url: page.successUrl,
      success_message: page.successMessage,
      wallet_address: page.walletAddress,
      seller_name: sellerName,
      seller_logo_url: sellerLogoUrl,
      seller_email: sellerEmail,
      page_type: page.pageType || "product",
      collect_buyer_name: page.collectBuyerName || false,
    });
  } catch (error) {
    console.error("GET /api/v1/checkout/[id]/public error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
