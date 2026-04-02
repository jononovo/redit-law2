import { storage } from "@/server/storage";
import CatalogClient from "./catalog-client";
import type { Metadata } from "next";
import { parseSearchParams, filtersToMetaTitle, filtersToCanonicalParams } from "@/lib/catalog/parse-filters";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";
const PAGE_SIZE = 50;

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const filters = parseSearchParams(params);
  filters.limit = PAGE_SIZE;

  let total = 0;
  try {
    total = await storage.searchBrandsCount(filters);
  } catch {}

  const title = filtersToMetaTitle(filters);
  const hasFilters = !!(filters.q || filters.tiers?.length || filters.checkoutMethods?.length || filters.capabilities?.length);
  const description = hasFilters
    ? `${total || ""} matching AI agent procurement skills. Filter by sector, checkout method, and ASX score.`
    : `Browse ${total || ""}${total ? "+" : ""} procurement skills that teach AI agents how to shop at verified vendors. Filter by sector, checkout method, and ASX score.`;

  const canonicalParams = filtersToCanonicalParams(filters);

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
  const filters = parseSearchParams(params);
  filters.limit = PAGE_SIZE;

  let brands: Awaited<ReturnType<typeof storage.searchBrands>> = [];
  let facets: Awaited<ReturnType<typeof storage.getAllBrandFacets>> = { sectors: [], tiers: [] };
  let total = 0;

  try {
    [brands, facets, total] = await Promise.all([
      storage.searchBrands({
        ...filters,
        lite: true,
      }),
      storage.getAllBrandFacets(),
      storage.searchBrandsCount(filters),
    ]);
  } catch {}

  const initialFilters = {
    search: filters.q ?? "",
    checkoutMethods: (filters.checkoutMethods ?? []) as string[],
    capabilities: (filters.capabilities ?? []) as string[],
    maturity: (filters.maturities ?? []) as string[],
    sectors: (filters.sectors ?? []) as string[],
    tiers: (filters.tiers ?? []) as string[],
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
