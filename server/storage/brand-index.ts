import { db } from "@/server/db";
import { brandIndex, type BrandIndex, type InsertBrandIndex } from "@/shared/schema";
import { eq, and, sql, desc, asc, inArray, count } from "drizzle-orm";
import type { IStorage } from "./types";
import { SECTOR_LABELS } from "@/lib/procurement-skills/taxonomy/sectors";

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
  minScore?: number;
  minAxsRating?: number;
  minRatingSearch?: number;
  minRatingStock?: number;
  minRatingCheckout?: number;
  limit?: number;
  offset?: number;
  sortBy?: "score" | "name" | "created_at" | "rating";
  sortDir?: "asc" | "desc";
  lite?: boolean;
}

export type BrandCardRow = Pick<BrandIndex,
  | "id" | "slug" | "name" | "domain" | "logoUrl" | "sector" | "subSectors" | "tier" | "maturity"
  | "overallScore" | "checkoutMethods" | "capabilities" | "hasDeals"
  | "axsRating" | "ratingCount" | "updatedAt"
> & { successRate: string | null };

const LITE_COLUMNS = {
  id: brandIndex.id,
  slug: brandIndex.slug,
  name: brandIndex.name,
  domain: brandIndex.domain,
  logoUrl: brandIndex.logoUrl,
  sector: brandIndex.sector,
  subSectors: brandIndex.subSectors,
  tier: brandIndex.tier,
  maturity: brandIndex.maturity,
  overallScore: brandIndex.overallScore,
  checkoutMethods: brandIndex.checkoutMethods,
  capabilities: brandIndex.capabilities,
  hasDeals: brandIndex.hasDeals,
  successRate: sql<string>`(${brandIndex.brandData}->'feedbackStats'->>'successRate')`.as('success_rate'),
  axsRating: brandIndex.axsRating,
  ratingCount: brandIndex.ratingCount,
  updatedAt: brandIndex.updatedAt,
};

type BrandIndexMethods = Pick<IStorage,
  | "searchBrands"
  | "searchBrandsCount"
  | "getBrandById"
  | "getBrandBySlug"
  | "getBrandByDomain"
  | "getRetailersForBrand"
  | "upsertBrandIndex"
  | "getAllBrandFacets"
>;

let facetCache: { sectors: string[]; tiers: string[] } | null = null;
let facetCacheExpiry = 0;
const FACET_CACHE_TTL_MS = 10 * 60 * 1000;

export function invalidateFacetCache() {
  facetCache = null;
  facetCacheExpiry = 0;
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
  if (filters.minScore !== undefined) {
    conditions.push(sql`${brandIndex.overallScore} >= ${filters.minScore}`);
  }
  if (filters.minAxsRating !== undefined) {
    conditions.push(sql`${brandIndex.axsRating}::numeric >= ${filters.minAxsRating}`);
  }
  if (filters.minRatingSearch !== undefined) {
    conditions.push(sql`${brandIndex.ratingSearchAccuracy}::numeric >= ${filters.minRatingSearch}`);
  }
  if (filters.minRatingStock !== undefined) {
    conditions.push(sql`${brandIndex.ratingStockReliability}::numeric >= ${filters.minRatingStock}`);
  }
  if (filters.minRatingCheckout !== undefined) {
    conditions.push(sql`${brandIndex.ratingCheckoutCompletion}::numeric >= ${filters.minRatingCheckout}`);
  }

  return conditions;
}

export const brandIndexMethods: BrandIndexMethods = {
  async searchBrands(filters: BrandSearchFilters): Promise<BrandIndex[]> {
    const conditions = buildConditions(filters);

    const isRatingSort = filters.sortBy === "rating";
    const sortCol = filters.sortBy === "name" ? brandIndex.name
      : filters.sortBy === "created_at" ? brandIndex.createdAt
      : isRatingSort ? brandIndex.axsRating
      : brandIndex.overallScore;
    const sortFn = filters.sortDir === "asc" ? asc : desc;

    const query = filters.lite
      ? db.select(LITE_COLUMNS).from(brandIndex)
      : db.select().from(brandIndex);
    const withWhere = conditions.length > 0
      ? query.where(and(...conditions))
      : query;

    const orderClause = isRatingSort
      ? sql`${sortCol} ${filters.sortDir === "asc" ? sql`ASC NULLS LAST` : sql`DESC NULLS LAST`}`
      : sortFn(sortCol);

    return withWhere
      .orderBy(orderClause)
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

  async getBrandByDomain(domain: string): Promise<BrandIndex | null> {
    const [row] = await db.select().from(brandIndex).where(eq(brandIndex.domain, domain)).limit(1);
    return row ?? null;
  },

  async getRetailersForBrand(brandName: string): Promise<BrandIndex[]> {
    return db.select().from(brandIndex)
      .where(sql`${brandIndex.carriesBrands} @> ARRAY[${brandName}]::text[]`)
      .orderBy(desc(brandIndex.overallScore));
  },

  async upsertBrandIndex(data: InsertBrandIndex): Promise<BrandIndex> {
    const values = { ...data, updatedAt: new Date() };
    const { slug: _slug, domain: _domain, ...updateSet } = values;

    const MAX_SLUG_RETRIES = 5;
    for (let attempt = 0; attempt <= MAX_SLUG_RETRIES; attempt++) {
      try {
        const insertValues = attempt === 0
          ? values
          : { ...values, slug: `${values.slug}-${attempt}` };

        const [row] = await db.insert(brandIndex)
          .values(insertValues)
          .onConflictDoUpdate({
            target: brandIndex.domain,
            set: { ...updateSet, updatedAt: new Date() },
          })
          .returning();

        invalidateFacetCache();
        return row;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        const isSlugConflict = msg.includes("brand_index_slug_unique");
        if (!isSlugConflict || attempt === MAX_SLUG_RETRIES) throw err;
      }
    }
    throw new Error("Unreachable: slug collision retry exhausted");
  },

  async getAllBrandFacets(): Promise<{ sectors: string[]; tiers: string[] }> {
    const now = Date.now();
    if (facetCache && now < facetCacheExpiry) {
      return facetCache;
    }

    const validSectorSlugs = new Set(Object.keys(SECTOR_LABELS));
    const rows = await db
      .select({ sector: brandIndex.sector, tier: brandIndex.tier })
      .from(brandIndex);
    const sectors = [...new Set(rows.map(r => r.sector))].filter(s => validSectorSlugs.has(s));
    const tiers = [...new Set(rows.map(r => r.tier).filter((t): t is string => t !== null))];

    facetCache = { sectors, tiers };
    facetCacheExpiry = now + FACET_CACHE_TTL_MS;

    return facetCache;
  },
};
