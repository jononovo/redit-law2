import { storage } from "@/server/storage";
import CatalogClient from "./catalog-client";
import type { Metadata } from "next";
import { parseSearchParams, filtersToMetaTitle, filtersToCanonicalParams, DEFAULT_MATURITIES } from "@/lib/brand-engine/catalog/parse-filters";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";
const PAGE_SIZE = 50;

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const rawFilters = parseSearchParams(params);
  const queryFilters = { ...rawFilters, maturities: rawFilters.maturities ?? DEFAULT_MATURITIES, limit: PAGE_SIZE };

  let total = 0;
  try {
    total = await storage.searchBrandsCount(queryFilters);
  } catch {}

  const title = filtersToMetaTitle(rawFilters);
  const hasFilters = !!(rawFilters.q || rawFilters.tiers?.length || rawFilters.checkoutMethods?.length || rawFilters.capabilities?.length);
  const description = hasFilters
    ? `${total || ""} matching AI agent procurement skills. Filter by sector, checkout method, and ASX score.`
    : `Browse ${total || ""}${total ? "+" : ""} procurement skills that teach AI agents how to shop at verified vendors. Filter by sector, checkout method, and ASX score.`;

  const canonicalParams = filtersToCanonicalParams(rawFilters);

  return {
    title,
    description,
    openGraph: {
      title: title.replace(" | CreditClaw", ""),
      description,
      type: "website",
      url: `${BASE_URL}/skills${canonicalParams}`,
    },
    twitter: {
      card: "summary",
      title: title.replace(" | CreditClaw", ""),
      description,
    },
    alternates: {
      canonical: `${BASE_URL}/skills${canonicalParams}`,
    },
  };
}

export default async function SkillsCatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawFilters = parseSearchParams(params);
  const queryFilters = { ...rawFilters, maturities: rawFilters.maturities ?? DEFAULT_MATURITIES, limit: PAGE_SIZE };

  let brands: Awaited<ReturnType<typeof storage.searchBrands>> = [];
  let facets: Awaited<ReturnType<typeof storage.getAllBrandFacets>> = { sectors: [], tiers: [] };
  let total = 0;

  try {
    [brands, facets, total] = await Promise.all([
      storage.searchBrands({
        ...queryFilters,
        lite: true,
      }),
      storage.getAllBrandFacets(),
      storage.searchBrandsCount(queryFilters),
    ]);
  } catch {}

  const initialFilters = {
    search: rawFilters.q ?? "",
    checkoutMethods: (rawFilters.checkoutMethods ?? []) as string[],
    capabilities: (rawFilters.capabilities ?? []) as string[],
    maturity: (rawFilters.maturities ?? []) as string[],
    sectors: (rawFilters.sectors ?? []) as string[],
    tiers: (rawFilters.tiers ?? []) as string[],
  };

  return (
    <CatalogClient
      initialBrands={brands}
      initialFacets={facets}
      initialTotal={total}
      initialFilters={initialFilters}
    />
  );
}
