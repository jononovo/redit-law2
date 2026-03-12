import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const profile = await storage.getSellerProfileBySlug(slug);
    if (!profile || !profile.shopPublished) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const pages = await storage.getShopPagesByOwnerUid(profile.ownerUid);

    const products = await Promise.all(
      pages.map(async (page) => {
        const buyerCount = page.pageType === "event"
          ? await storage.getBuyerCountForCheckoutPage(page.checkoutPageId)
          : 0;

        return {
          checkout_page_id: page.checkoutPageId,
          title: page.title,
          description: page.description,
          amount_usd: page.amountUsdc ? page.amountUsdc / 1_000_000 : null,
          amount_locked: page.amountLocked,
          page_type: page.pageType || "product",
          image_url: page.imageUrl || null,
          collect_buyer_name: page.collectBuyerName || false,
          buyer_count: buyerCount,
          checkout_url: `/pay/${page.checkoutPageId}`,
        };
      })
    );

    return NextResponse.json({
      shop: {
        business_name: profile.businessName,
        logo_url: profile.logoUrl,
        description: profile.description,
        website_url: profile.websiteUrl,
        banner_url: profile.shopBannerUrl,
        slug: profile.slug,
      },
      products,
    });
  } catch (error) {
    console.error("GET /api/v1/shop/[slug] error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
