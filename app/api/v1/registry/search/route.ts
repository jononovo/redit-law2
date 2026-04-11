import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { parseSearchParams } from "@/features/brand-engine/catalog/parse-filters";
import { buildSkillJson } from "@/features/brand-engine/procurement-skills/skill-json";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json(
      { error: "invalid_query", message: "Query parameter 'q' must be at least 2 characters" },
      { status: 400 },
    );
  }

  try {
    const filters = parseSearchParams(sp);
    filters.q = q;

    if (!filters.maturities?.length) {
      filters.maturities = ["verified", "official", "beta", "community"];
    }

    const [brands, total] = await Promise.all([
      storage.searchBrands(filters),
      storage.searchBrandsCount(filters),
    ]);

    const results = await Promise.all(
      brands.map(async (b) => {
        let categoryObjects: { id: number; name: string; path: string; depth: number; primary: boolean }[] = [];
        try {
          categoryObjects = await storage.getBrandCategoryObjects(b.id);
        } catch {}

        const skillJson = buildSkillJson({
          ...b,
          categoryObjects,
        } as Parameters<typeof buildSkillJson>[0]);

        return {
          vendor: b.slug,
          domain: b.domain,
          displayName: b.name,
          asxScore: b.overallScore,
          maturity: b.maturity,
          skillJsonUrl: `/api/v1/registry/${b.slug}/skill-json`,
          skillMdUrl: b.skillMd ? `/api/v1/registry/${b.slug}/skill-md` : null,
          skillJson,
        };
      }),
    );

    return NextResponse.json(
      {
        $schema: "https://shopy.sh/schemas/registry-search/v1",
        query: q,
        total,
        limit: filters.limit,
        offset: filters.offset,
        results,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=120",
        },
      },
    );
  } catch (error) {
    console.error("GET /api/v1/registry/search error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
