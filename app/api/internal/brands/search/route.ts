import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import type { BrandSearchFilters } from "@/server/storage/brand-index";

function parseCSV(param: string | null): string[] | undefined {
  if (!param) return undefined;
  const vals = param.split(",").map(s => s.trim()).filter(Boolean);
  return vals.length > 0 ? vals : undefined;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const filters: BrandSearchFilters = {
    q: url.searchParams.get("q") ?? undefined,
    sectors: parseCSV(url.searchParams.get("sector")),
    tiers: parseCSV(url.searchParams.get("tier")),
    maturities: parseCSV(url.searchParams.get("maturity")),
    hasMcp: url.searchParams.get("mcp") === "true" ? true : undefined,
    hasApi: url.searchParams.get("search_api") === "true" ? true : undefined,
    hasDeals: url.searchParams.get("has_deals") === "true" ? true : undefined,
    taxExempt: url.searchParams.get("tax_exempt") === "true" ? true : undefined,
    poNumber: url.searchParams.get("po_number") === "true" ? true : undefined,
    carriesBrand: url.searchParams.get("carries_brand") ?? undefined,
    shipsTo: url.searchParams.get("ships_to") ?? undefined,
    checkoutMethods: parseCSV(url.searchParams.get("checkout")),
    capabilities: parseCSV(url.searchParams.get("capability")),
    orderings: parseCSV(url.searchParams.get("ordering")),
    paymentMethods: parseCSV(url.searchParams.get("payment_method")),
    subSector: url.searchParams.get("sub_sector") ?? undefined,
    minReadiness: url.searchParams.get("min_readiness") ? parseInt(url.searchParams.get("min_readiness")!) : undefined,
    limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : 50,
    offset: url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : 0,
    sortBy: (url.searchParams.get("sort") as "readiness" | "name" | "created_at") || "readiness",
    sortDir: (url.searchParams.get("dir") as "asc" | "desc") || "desc",
  };

  try {
    const [brands, total, facets] = await Promise.all([
      storage.searchBrands(filters),
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
