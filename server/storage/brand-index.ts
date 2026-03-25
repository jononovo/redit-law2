import { db } from "@/server/db";
import { brandIndex, type BrandIndex, type InsertBrandIndex } from "@/shared/schema";
import { eq, and, sql, desc, asc, inArray, count } from "drizzle-orm";
import type { IStorage } from "./types";

export interface BrandSearchFilters {
  q?: string;
  sectors?: string[];
  tiers?: string[];
  maturities?: string[];
  hasMcp?: boolean;
  hasApi?: boolean;
  hasDeals?: boolean;
  taxExempt?: boolean;
  poNumber?: boolean;
  carriesBrand?: string;
  shipsTo?: string;
  checkoutMethods?: string[];
  capabilities?: string[];
  orderings?: string[];
  paymentMethods?: string[];
  subSector?: string;
  minReadiness?: number;
  limit?: number;
  offset?: number;
  sortBy?: "readiness" | "name" | "created_at";
  sortDir?: "asc" | "desc";
  /**
   * When true, excludes heavy columns (skillMd, most metadata fields) from the query.
   * Use for catalog card rendering and sitemap generation where only display fields are needed.
   * Omitted fields will be undefined at runtime despite the BrandIndex return type.
   * Included lite fields: id, slug, name, sector, subSectors, tier, maturity,
   * agentReadiness, checkoutMethods, capabilities, hasDeals, brandData, updatedAt.
   */
  lite?: boolean;
}

export type BrandCardRow = Pick<BrandIndex,
  | "id" | "slug" | "name" | "sector" | "subSectors" | "tier" | "maturity"
  | "agentReadiness" | "checkoutMethods" | "capabilities" | "hasDeals"
  | "brandData" | "updatedAt"
>;

const LITE_COLUMNS = {
  id: brandIndex.id,
  slug: brandIndex.slug,
  name: brandIndex.name,
  sector: brandIndex.sector,
  subSectors: brandIndex.subSectors,
  tier: brandIndex.tier,
  maturity: brandIndex.maturity,
  agentReadiness: brandIndex.agentReadiness,
  checkoutMethods: brandIndex.checkoutMethods,
  capabilities: brandIndex.capabilities,
  hasDeals: brandIndex.hasDeals,
  brandData: brandIndex.brandData,
  updatedAt: brandIndex.updatedAt,
};

type BrandIndexMethods = Pick<IStorage,
  | "searchBrands"
  | "searchBrandsCount"
  | "getBrandById"
  | "getBrandBySlug"
  | "getRetailersForBrand"
  | "upsertBrandIndex"
  | "recomputeReadiness"
  | "getAllBrandFacets"
>;

let facetCache: { sectors: string[]; tiers: string[] } | null = null;
let facetCacheExpiry = 0;
const FACET_CACHE_TTL_MS = 10 * 60 * 1000;

export function invalidateFacetCache() {
  facetCache = null;
  facetCacheExpiry = 0;
}

function computeReadinessScore(row: Partial<InsertBrandIndex>): number {
  let score = 0;
  if (row.hasMcp) score += 25;
  if (row.hasApi) score += 20;
  if (row.ordering === "guest") score += 15;
  const caps = row.capabilities ?? [];
  if (caps.includes("programmatic_checkout")) score += 10;
  if (row.hasDeals) score += 5;
  if (row.productFeed) score += 5;
  if (row.maturity === "verified") score += 5;
  return Math.min(score, 100);
}

function buildConditions(filters: BrandSearchFilters) {
  const conditions = [];

  if (filters.q) {
    conditions.push(sql`search_vector @@ plainto_tsquery('english', ${filters.q})`);
  }
  if (filters.sectors?.length) {
    conditions.push(inArray(brandIndex.sector, filters.sectors));
  }
  if (filters.tiers?.length) {
    conditions.push(sql`${brandIndex.tier} IN (${sql.join(filters.tiers.map(t => sql`${t}`), sql`, `)})`);
  }
  if (filters.maturities?.length) {
    conditions.push(inArray(brandIndex.maturity, filters.maturities));
  }
  if (filters.hasMcp) {
    conditions.push(eq(brandIndex.hasMcp, true));
  }
  if (filters.hasApi) {
    conditions.push(eq(brandIndex.hasApi, true));
  }
  if (filters.hasDeals) {
    conditions.push(eq(brandIndex.hasDeals, true));
  }
  if (filters.taxExempt) {
    conditions.push(eq(brandIndex.taxExemptSupported, true));
  }
  if (filters.poNumber) {
    conditions.push(eq(brandIndex.poNumberSupported, true));
  }
  if (filters.orderings?.length) {
    conditions.push(sql`${brandIndex.ordering} IN (${sql.join(filters.orderings.map(o => sql`${o}`), sql`, `)})`);
  }
  if (filters.carriesBrand) {
    conditions.push(sql`${brandIndex.carriesBrands} @> ARRAY[${filters.carriesBrand}]::text[]`);
  }
  if (filters.shipsTo) {
    conditions.push(sql`${brandIndex.supportedCountries} @> ARRAY[${filters.shipsTo}]::text[]`);
  }
  if (filters.checkoutMethods?.length) {
    conditions.push(sql`${brandIndex.checkoutMethods} && ARRAY[${sql.join(filters.checkoutMethods.map(c => sql`${c}`), sql`, `)}]::text[]`);
  }
  if (filters.capabilities?.length) {
    const capArrayLiteral = `{${filters.capabilities.join(",")}}`;
    conditions.push(sql`${brandIndex.capabilities} @> ${capArrayLiteral}::text[]`);
  }
  if (filters.paymentMethods?.length) {
    conditions.push(sql`${brandIndex.paymentMethodsAccepted} && ARRAY[${sql.join(filters.paymentMethods.map(p => sql`${p}`), sql`, `)}]::text[]`);
  }
  if (filters.subSector) {
    conditions.push(sql`EXISTS (SELECT 1 FROM unnest(${brandIndex.subSectors}) AS s WHERE lower(s) LIKE ${'%' + filters.subSector.toLowerCase() + '%'})`);
  }
  if (filters.minReadiness !== undefined) {
    conditions.push(sql`${brandIndex.agentReadiness} >= ${filters.minReadiness}`);
  }

  return conditions;
}

export const brandIndexMethods: BrandIndexMethods = {
  async searchBrands(filters: BrandSearchFilters): Promise<BrandIndex[]> {
    const conditions = buildConditions(filters);

    const sortCol = filters.sortBy === "name" ? brandIndex.name
      : filters.sortBy === "created_at" ? brandIndex.createdAt
      : brandIndex.agentReadiness;
    const sortFn = filters.sortDir === "asc" ? asc : desc;

    const query = filters.lite
      ? db.select(LITE_COLUMNS).from(brandIndex)
      : db.select().from(brandIndex);
    const withWhere = conditions.length > 0
      ? query.where(and(...conditions))
      : query;

    return withWhere
      .orderBy(sortFn(sortCol))
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0) as Promise<BrandIndex[]>;
  },

  async searchBrandsCount(filters: BrandSearchFilters): Promise<number> {
    const conditions = buildConditions(filters);

    const query = db.select({ total: count() }).from(brandIndex);
    const withWhere = conditions.length > 0
      ? query.where(and(...conditions))
      : query;

    const [row] = await withWhere;
    return row?.total ?? 0;
  },

  async getBrandById(id: number): Promise<BrandIndex | null> {
    const [row] = await db.select().from(brandIndex).where(eq(brandIndex.id, id)).limit(1);
    return row ?? null;
  },

  async getBrandBySlug(slug: string): Promise<BrandIndex | null> {
    const [row] = await db.select().from(brandIndex).where(eq(brandIndex.slug, slug)).limit(1);
    return row ?? null;
  },

  async getRetailersForBrand(brandName: string): Promise<BrandIndex[]> {
    return db.select().from(brandIndex)
      .where(sql`${brandIndex.carriesBrands} @> ARRAY[${brandName}]::text[]`)
      .orderBy(desc(brandIndex.agentReadiness));
  },

  async upsertBrandIndex(data: InsertBrandIndex): Promise<BrandIndex> {
    const readiness = computeReadinessScore(data);
    const values = { ...data, agentReadiness: readiness, updatedAt: new Date() };

    const [row] = await db.insert(brandIndex)
      .values(values)
      .onConflictDoUpdate({
        target: brandIndex.slug,
        set: values,
      })
      .returning();

    invalidateFacetCache();

    return row;
  },

  async recomputeReadiness(slug: string): Promise<number> {
    const existing = await brandIndexMethods.getBrandBySlug(slug);
    if (!existing) return 0;

    const score = computeReadinessScore(existing);
    await db.update(brandIndex)
      .set({ agentReadiness: score, updatedAt: new Date() })
      .where(eq(brandIndex.slug, slug));
    return score;
  },

  async getAllBrandFacets(): Promise<{ sectors: string[]; tiers: string[] }> {
    const now = Date.now();
    if (facetCache && now < facetCacheExpiry) {
      return facetCache;
    }

    const rows = await db
      .select({ sector: brandIndex.sector, tier: brandIndex.tier })
      .from(brandIndex);
    const sectors = [...new Set(rows.map(r => r.sector))];
    const tiers = [...new Set(rows.map(r => r.tier).filter((t): t is string => t !== null))];

    facetCache = { sectors, tiers };
    facetCacheExpiry = now + FACET_CACHE_TTL_MS;

    return facetCache;
  },
};
