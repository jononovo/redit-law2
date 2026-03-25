# Phase 10: Catalog Scaling — Sector Hierarchy, Sub-Sector Pages, Sitemap Splitting

## Objective

Scale the `/skills` catalog to handle 1,000–5,000+ brands with a browsable sector hierarchy, sub-sector landing pages, optimized sitemaps, and JSONB extraction for catalog performance. This phase assumes Phase 6 Part A (full SSR catalog with URL-based filter state) is already implemented.

## Why this matters

At 14 brands the flat grid grouped by sector works. At 1,000+ brands:

| Problem | At 1K brands | At 5K brands |
|---|---|---|
| Sector group sizes | Some sectors have 100+ cards — unreadable | Some sectors have 500+ cards |
| Sub-sector count | ~100 distinct sub-sectors, no browsable pages | 200+ sub-sectors, users can't discover them |
| Sitemap | ~1,050 URLs in one file — fine | ~5,050 URLs, XML file ~500 KB |
| `brandData` JSONB in catalog queries | 1.8 KB/row × 50 = 90 KB wasted per page | Grows as VendorSkill schema grows |
| Filter sidebar | Manageable but crowded | 20+ sectors, 200+ sub-sectors — unusable without hierarchy |

## Prerequisites

- **Phase 6 Part A complete** — catalog page is SSR with URL-based filter state
- **Phase 6 Part B complete** — `rating_success_rate`, `rating_count` columns exist on `brand_index` (these replace the `brandData.feedbackStats.successRate` usage, enabling Problem 3 fix)
- **Phase 8 complete** — `vendors` table eliminated, `brand_index` is the single canonical table

## Part A: Sector Landing Pages

### A1. Route structure

Create `/skills/sector/[sector]/page.tsx` as a server component:

```
/skills/sector/office       → Office Supplies sector page
/skills/sector/electronics  → Electronics sector page
/skills/sector/retail       → Retail sector page
```

Each sector page:
- Has `generateMetadata()` with sector-specific title/description/OG tags
- Reads `searchParams` for filters (same pattern as main catalog)
- Calls `storage.searchBrands({ sectors: [sector], ...otherFilters })` directly
- Renders the full brand grid for that sector, grouped by sub-sector
- Has its own filter sidebar (scoped: shows sub-sectors, tiers, checkout methods within that sector)
- Has a `not-found.tsx` for invalid sector slugs

### A2. Sector index on the main catalog

The main `/skills` page becomes a sector directory at scale:
- Show each sector as a card/row with: sector name, brand count, top sub-sectors, top brands (3–4 logos)
- Each sector card links to `/skills/sector/[sector]`
- Keep the full filter sidebar for power users who want to search across all sectors
- The full brand grid (grouped by sector, collapsed at 6 cards) stays as a secondary view below the sector cards

### A3. `generateStaticParams` for sector pages

```tsx
export async function generateStaticParams() {
  const facets = await storage.getAllBrandFacets();
  return facets.sectors.map(s => ({ sector: s.value }));
}
```

This statically generates pages for all known sectors at build time.

### A4. Sector page metadata

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sector } = await params;
  const label = SECTOR_LABELS[sector as VendorSector] ?? sector;
  const count = await storage.searchBrandsCount({ sectors: [sector] });
  return {
    title: `${label} Procurement Skills (${count} Brands) | CreditClaw`,
    description: `Browse ${count} AI agent procurement skills for ${label} vendors. Filter by sub-sector, checkout method, and agent friendliness.`,
    openGraph: { ... },
    alternates: { canonical: `${BASE_URL}/skills/sector/${sector}` },
  };
}
```

## Part B: Sub-Sector Pages

### B1. Route structure

Create `/skills/sector/[sector]/[subSector]/page.tsx`:

```
/skills/sector/office/office-furniture     → Office Furniture sub-sector
/skills/sector/electronics/consumer-audio  → Consumer Audio sub-sector
```

### B2. When to create sub-sector pages

Only generate sub-sector pages when a sub-sector has **5+ brands**. Below that threshold, the sector page handles it with a filter.

```tsx
export async function generateStaticParams() {
  const subSectors = await storage.getSubSectorCounts();
  return subSectors
    .filter(s => s.count >= 5)
    .map(s => ({
      sector: s.sector,
      subSector: slugify(s.subSector),
    }));
}
```

### B3. Sub-sector storage method

Add to `brand-index.ts`:

```typescript
async getSubSectorCounts(): Promise<{ sector: string; subSector: string; count: number }[]> {
  const result = await db.execute(sql`
    SELECT sector, s AS sub_sector, count(*)::int AS cnt
    FROM brand_index, unnest(sub_sectors) s
    GROUP BY sector, s
    ORDER BY cnt DESC
  `);
  return result.rows.map(r => ({
    sector: r.sector as string,
    subSector: r.sub_sector as string,
    count: r.cnt as number,
  }));
}
```

### B4. Sub-sector slug mapping

Sub-sectors are stored as display strings ("Office Furniture", "Consumer Audio"). URL slugs need a mapping:
- `slugify("Office Furniture")` → `"office-furniture"`
- The page needs to reverse this: `"office-furniture"` → look up brands where sub_sector matches

Add a `sub_sector_slug` approach — either:
1. **Runtime slugification:** `slugify()` the sub-sector values from the DB and match against the URL param
2. **Stored slug column:** Add `sub_sector_slugs text[]` to `brand_index` (computed from `sub_sectors` on insert/update)

Option 1 is simpler and works fine at 5K. Option 2 is needed at 50K+ for index-based lookups.

## Part C: Sitemap Splitting

### C1. Sitemap index

Replace the single `app/sitemap.ts` with a sitemap index:

```
app/sitemap.ts → generates sitemap index pointing to:
  /sitemap/0.xml  → static pages + sector pages
  /sitemap/1.xml  → brand pages (sector: office)
  /sitemap/2.xml  → brand pages (sector: retail)
  ...
```

In Next.js App Router, use `generateSitemaps()` to split:

```tsx
// app/sitemap.ts
export async function generateSitemaps() {
  const facets = await storage.getAllBrandFacets();
  return [
    { id: 'pages' },
    ...facets.sectors.map(s => ({ id: s.value })),
  ];
}

export default async function sitemap({ id }: { id: string }): Promise<MetadataRoute.Sitemap> {
  if (id === 'pages') {
    return [
      { url: `${BASE_URL}/`, lastModified: new Date() },
      { url: `${BASE_URL}/skills`, lastModified: new Date() },
      // ... other static pages
    ];
  }

  // Sector-specific sitemap
  const brands = await storage.searchBrands({ sectors: [id], limit: 10000 });
  return brands.map(b => ({
    url: `${BASE_URL}/skills/${b.slug}`,
    lastModified: b.updatedAt,
    changeFrequency: 'weekly',
    priority: b.maturity === 'verified' ? 0.9 : 0.7,
  }));
}
```

### C2. When to implement

The single sitemap works fine up to ~10K URLs. Split when:
- Brand count exceeds 5,000 (sitemap XML > 500 KB)
- OR Google Search Console reports sitemap parsing issues

## Part D: Extract `feedbackStats` from JSONB

### D1. Problem

`VendorCard` currently reads `brand.brandData.feedbackStats.successRate` — a tiny field buried in a ~1.8 KB JSONB blob. The catalog query includes `brand_data` just for this one value.

### D2. Fix

After Phase 6 Part B adds `rating_success_rate` and `rating_count` columns to `brand_index`:

1. Migrate existing `feedbackStats.successRate` values to `rating_success_rate`
2. Update `VendorCard` to read `brand.ratingSuccessRate` instead of `brand.brandData.feedbackStats.successRate`
3. Remove `brandData` from `CATALOG_CARD_COLUMNS` in `searchBrandsForCatalog()`

**Payload impact:** Each catalog card row drops from ~1.5 KB (with column subset) to ~500 bytes.

### D3. Migration

```sql
UPDATE brand_index
SET rating_success_rate = (brand_data->'feedbackStats'->>'successRate')::numeric
WHERE brand_data->'feedbackStats'->>'successRate' IS NOT NULL;
```

## Files touched (summary)

| Operation | File | Description |
|---|---|---|
| Create | `app/skills/sector/[sector]/page.tsx` | Sector landing page (SSR) |
| Create | `app/skills/sector/[sector]/not-found.tsx` | 404 for invalid sectors |
| Create | `app/skills/sector/[sector]/[subSector]/page.tsx` | Sub-sector page (SSR) |
| Edit | `app/skills/page.tsx` | Add sector directory cards above the full grid |
| Edit | `server/storage/brand-index.ts` | Add `getSubSectorCounts()`, update facets to include counts |
| Edit | `server/storage/types.ts` | Add new methods to IStorage |
| Edit | `app/sitemap.ts` | Split into sitemap index with per-sector sitemaps |
| Edit | `app/skills/vendor-card.tsx` | Read `ratingSuccessRate` column instead of JSONB |

## Dependencies

| This phase needs | From phase |
|---|---|
| SSR catalog with URL-based filter state | Phase 6 Part A |
| `rating_success_rate`, `rating_count` columns on `brand_index` | Phase 6 Part B |
| `vendors` table eliminated, `brand_index` is canonical | Phase 8 |

## Implementation order

1. **Part A** (sector landing pages) — can start as soon as Phase 6 Part A is done
2. **Part B** (sub-sector pages) — after Part A, when sub-sector count exceeds 100
3. **Part C** (sitemap splitting) — when brand count exceeds 5,000
4. **Part D** (JSONB extraction) — after Phase 6 Part B ships the rating columns
