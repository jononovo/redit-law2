import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { parseSearchParams, DEFAULT_MATURITIES } from "@/lib/catalog/parse-filters";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const filters = parseSearchParams(url.searchParams);

  if (!filters.maturities?.length) {
    filters.maturities = DEFAULT_MATURITIES;
  }

  try {
    const [brands, total, facets] = await Promise.all([
      storage.searchBrands({ ...filters, lite: true }),
      storage.searchBrandsCount(filters),
      storage.getAllBrandFacets(),
    ]);

    return NextResponse.json({
      brands,
      total,
      facets,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "search_failed", message }, { status: 500 });
  }
}
