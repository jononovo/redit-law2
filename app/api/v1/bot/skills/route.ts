import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import type { BrandIndex } from "@/shared/schema";

function parseCSV(param: string | null): string[] | undefined {
  if (!param) return undefined;
  const vals = param.split(",").map(s => s.trim()).filter(Boolean);
  return vals.length > 0 ? vals : undefined;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const category = url.searchParams.get("category");
  const sector = url.searchParams.get("sector");
  const search = url.searchParams.get("search");
  const checkoutParam = url.searchParams.get("checkout");
  const capabilityParam = url.searchParams.get("capability");
  const maturityParam = url.searchParams.get("maturity");
  const tierParam = url.searchParams.get("tier");
  const subSectorParam = url.searchParams.get("sub_sector");
  const orderingParam = url.searchParams.get("ordering_permission");
  const paymentMethodParam = url.searchParams.get("payment_method");
  const hasDeals = url.searchParams.get("has_deals");
  const hasSearchApi = url.searchParams.get("search_api");
  const hasMcp = url.searchParams.get("mcp");
  const carriesBrand = url.searchParams.get("carries_brand");
  const shipsTo = url.searchParams.get("ships_to");
  const taxExempt = url.searchParams.get("tax_exempt");
  const poNumber = url.searchParams.get("po_number");

  const minRating = url.searchParams.get("min_rating");
  const minSearchRating = url.searchParams.get("min_search_rating");
  const minStockRating = url.searchParams.get("min_stock_rating");
  const minCheckoutRating = url.searchParams.get("min_checkout_rating");
  const sortParam = url.searchParams.get("sort");

  const sectorValues = parseCSV(sector) ?? parseCSV(category);

  const validSortBy = sortParam === "rating" ? "rating"
    : sortParam === "name" ? "name"
    : sortParam === "created_at" ? "created_at"
    : "score" as const;

  const brands = await storage.searchBrands({
    q: search ?? undefined,
    sectors: sectorValues,
    tiers: parseCSV(tierParam),
    maturities: parseCSV(maturityParam),
    hasMcp: hasMcp === "true" ? true : undefined,
    hasApi: hasSearchApi === "true" ? true : undefined,
    hasDeals: hasDeals === "true" ? true : undefined,
    taxExempt: taxExempt === "true" ? true : undefined,
    poNumber: poNumber === "true" ? true : undefined,
    carriesBrand: carriesBrand ?? undefined,
    shipsTo: shipsTo ?? undefined,
    checkoutMethods: parseCSV(checkoutParam),
    capabilities: parseCSV(capabilityParam),
    orderings: parseCSV(orderingParam),
    paymentMethods: parseCSV(paymentMethodParam),
    subSector: subSectorParam ?? undefined,
    minAxsRating: minRating && !isNaN(parseFloat(minRating)) ? parseFloat(minRating) : undefined,
    minRatingSearch: minSearchRating && !isNaN(parseFloat(minSearchRating)) ? parseFloat(minSearchRating) : undefined,
    minRatingStock: minStockRating && !isNaN(parseFloat(minStockRating)) ? parseFloat(minStockRating) : undefined,
    minRatingCheckout: minCheckoutRating && !isNaN(parseFloat(minCheckoutRating)) ? parseFloat(minCheckoutRating) : undefined,
    sortBy: validSortBy,
    sortDir: "desc",
  });

  const facets = await storage.getAllBrandFacets();

  return NextResponse.json({
    vendors: brands.map(brandToVendorResponse),
    total: brands.length,
    sectors: facets.sectors,
    tiers: facets.tiers,
  });
}

function brandToVendorResponse(b: BrandIndex) {
  const brandData = b.brandData as Record<string, unknown>;
  const feedbackStats = brandData?.feedbackStats as { successRate?: number } | undefined;

  return {
    slug: b.slug,
    name: b.name,
    sector: b.sector,
    category: b.sector,
    url: b.url,
    checkout_methods: b.checkoutMethods,
    capabilities: b.capabilities,
    maturity: b.maturity,
    asx_score: b.overallScore ?? null,
    guest_checkout: b.ordering === "guest",
    bulk_pricing: b.capabilities.includes("bulk_pricing"),
    free_shipping_above: b.freeShippingThreshold ? parseFloat(b.freeShippingThreshold) : null,
    skill_url: `https://creditclaw.com/api/v1/bot/skills/${b.slug}`,
    catalog_url: `https://creditclaw.com/skills/${b.slug}`,
    version: b.version,
    last_verified: b.lastVerified,
    success_rate: feedbackStats?.successRate ?? null,
    taxonomy: {
      sector: b.sector,
      sub_sectors: b.subSectors,
      tier: b.tier,
      tags: b.tags ?? [],
    },
    search_discovery: {
      search_api: b.hasApi,
      mcp: b.hasMcp,
      search_internal: b.siteSearch,
    },
    buying: {
      ordering_permission: b.ordering,
      checkout_providers: b.checkoutProvider ? [b.checkoutProvider] : [],
      payment_methods: b.paymentMethodsAccepted ?? [],
      delivery_options: (b.deliveryOptions ?? []).join(", "),
      free_delivery: b.freeShippingThreshold ? `for orders over $${b.freeShippingThreshold}` : null,
      returns_policy: null,
    },
    deals: b.hasDeals ? {
      current_deals: b.hasDeals,
      deals_url: b.dealsUrl ?? null,
      loyalty_program: b.loyaltyProgram ?? null,
    } : null,
    ratings: b.axsRating ? {
      axs_rating: Number(b.axsRating),
      search_accuracy: Number(b.ratingSearchAccuracy),
      stock_reliability: Number(b.ratingStockReliability),
      checkout_completion: Number(b.ratingCheckoutCompletion),
      count: b.ratingCount,
    } : null,
    agent_readiness: b.overallScore,
    carries_brands: b.carriesBrands ?? [],
    domain: b.domain,
  };
}
