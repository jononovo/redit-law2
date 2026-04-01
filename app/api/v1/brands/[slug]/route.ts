import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const brand = await storage.getBrandBySlug(slug);
    if (!brand) {
      return NextResponse.json({ error: "not_found", message: `No brand found for slug: ${slug}` }, { status: 404 });
    }

    return NextResponse.json({
      slug: brand.slug,
      name: brand.name,
      domain: brand.domain,
      url: brand.url,
      logoUrl: brand.logoUrl,
      description: brand.description,
      sector: brand.sector,
      tier: brand.tier,
      maturity: brand.maturity,
      score: brand.overallScore,
      scoreBreakdown: brand.scoreBreakdown,
      recommendations: brand.recommendations,
      scanTier: brand.scanTier,
      lastScannedAt: brand.lastScannedAt,
      lastScannedBy: brand.lastScannedBy,
      capabilities: brand.capabilities,
      checkoutMethods: brand.checkoutMethods,
      hasMcp: brand.hasMcp,
      hasApi: brand.hasApi,
      siteSearch: brand.siteSearch,
      hasDeals: brand.hasDeals,
      axsRating: brand.axsRating,
      ratingCount: brand.ratingCount,
      isClaimed: !!brand.claimedBy,
    });
  } catch (error: unknown) {
    console.error("GET /api/v1/brands/[slug] error:", error);
    return NextResponse.json({ error: "lookup_failed", message: "An unexpected error occurred" }, { status: 500 });
  }
}
