import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { parseSearchParams } from "@/features/brand-engine/catalog/parse-filters";

export async function GET(request: NextRequest) {
  try {
    const filters = parseSearchParams(request.nextUrl.searchParams);

    if (!filters.maturities?.length) {
      filters.maturities = ["verified", "official", "beta", "community"];
    }

    const [brands, total] = await Promise.all([
      storage.searchBrands(filters),
      storage.searchBrandsCount(filters),
    ]);

    const skills = brands.map((b) => ({
      vendor: b.slug,
      domain: b.domain,
      displayName: b.name,
      logoUrl: b.logoUrl,
      sector: b.sector,
      tier: b.tier,
      maturity: b.maturity,
      asxScore: b.overallScore,
      capabilities: b.capabilities ?? [],
      checkoutMethods: b.checkoutMethods ?? [],
      hasApi: b.hasApi,
      hasMcp: b.hasMcp,
      skillJsonUrl: `/api/v1/registry/${b.slug}/skill-json`,
      skillMdUrl: b.skillMd ? `/api/v1/registry/${b.slug}/skill-md` : null,
    }));

    return NextResponse.json(
      {
        $schema: "https://shopy.sh/schemas/registry/v1",
        total,
        limit: filters.limit,
        offset: filters.offset,
        skills,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=600",
        },
      },
    );
  } catch (error) {
    console.error("GET /api/v1/registry error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
