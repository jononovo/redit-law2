# Remaining Build Tasks — Brand Catalog, Feedback & SEO Infrastructure

## Related Documents

| Document | What It Covers |
|---|---|
| `agentic-commerce-standard.md` | Master standard — metadata format, ASX Score, AXS Rating |
| `creditclaw-agentic-commerce-strategy.md` | Go-to-market strategy, service tiers, revenue model |
| `agentic-shopping-score-build-plan.md` | Technical build plan for Tier 1 ASX Score scanner |
| `agent-readiness-and-product-index-service.md` | Three-tier service details, agent gateway |
| `scan-page-ux-design.md` | Scanner page UX wireframes |

---

## What's Already Done

### Brand Detail Page SSR (Phase 6 Part A1) — COMPLETE

- `app/skills/[vendor]/page.tsx` is a server component (no `"use client"`)
- Uses React `cache()` to deduplicate DB queries between `generateMetadata()` and page render
- `generateMetadata()` generates dynamic SEO/OG tags per brand
- Interactive pieces extracted to client components:
  - `brand-claim-button.tsx`
  - `skill-preview-panel.tsx`
  - `copy-skill-url.tsx`

### Catalog Page SSR (Phase 6 Part A2) — PARTIALLY COMPLETE

- `app/skills/page.tsx` is a server component with `generateMetadata()`
- Server-side initial brand fetch with `storage.searchBrands()`
- Server-side facet fetch with `storage.getAllBrandFacets()`
- **Not done:** URL-based filter state (`searchParams` not read server-side, filters client-only via `catalog-client.tsx`)

### Sector Landing Pages (Phase 6 Part A5) — COMPLETE

- `app/c/[sector]/page.tsx` exists with `generateStaticParams()` and `generateMetadata()`
- Sector-specific brands fetched server-side

### Remove Vendors Table (Phase 11 Part A) — COMPLETE

- `vendors` table removed from `shared/schema.ts`
- `server/storage/vendors.ts` deleted
- `merchantAccounts` aliases replaced with `brandLoginAccounts`

### Feedback Loop (Phase 6 Part B) — NEARLY COMPLETE

- **B1: `brand_feedback` table** — Done (`shared/schema.ts` line 1560)
- **B2: Rating columns on `brand_index`** — Done (`ratingSearchAccuracy`, `ratingStockReliability`, `ratingCheckoutCompletion`, `axsRating`, `ratingCount`)
- **B3: Storage layer** — Done (`server/storage/brand-feedback.ts` with `createBrandFeedback`, `getBrandFeedback`, `getBrandFeedbackCount`, `getRecentFeedbackByBot`)
- **B4: Feedback API endpoint** — Done (`app/api/v1/bot/skills/[vendor]/feedback/route.ts` with auth detection for agents/humans/anonymous)
- **B5: Feedback section in SKILL.md generator** — Done (`lib/procurement-skills/generator.ts` appends feedback instructions with POST endpoint)
- **B6: Aggregation job** — Done (`lib/feedback/aggregate.ts` with recency + source weighting, `app/api/internal/feedback/aggregate/route.ts` trigger)
- **B7: Rating display on brand detail page** — Done (`app/skills/[vendor]/page.tsx` renders rating bars when data exists)
- **B8: Rating display on catalog cards** — Done (`app/skills/vendor-card.tsx` shows rating + count)
- **B9: Human feedback UI** — Done (`components/dashboard/purchase-feedback-prompt.tsx` exists)

---

## What's Still Outstanding

### 1. Catalog URL-Based Filter State

**Priority:** Medium — improves SEO for filtered views, makes URLs shareable

**What's needed:** The `/skills` page currently ignores `searchParams` on the server. Filters are driven entirely by the client-side `catalog-client.tsx`. This means:
- Crawlers always see the default unfiltered view
- Filter URLs can't be bookmarked or shared
- No filter-specific metadata

**Implementation approach** (from Phase 6 plan):

```
page.tsx (server component)
├── reads searchParams → builds filter object
├── calls storage.searchBrands() with filters (no API hop)
├── calls storage.getAllBrandFacets() for sidebar options
├── renders brand cards server-side
├── generateMetadata() reflects current filters
│
├── catalog-search.tsx (client) — debounced input → router.replace()
├── catalog-filters.tsx (client) — checkbox toggles → router.replace()
└── catalog-load-more.tsx (client) — progressive "Load more" from internal API
```

**Key rule:** Sector filters use dedicated `/c/[sector]` routes, NOT `?sector=` query params on `/skills`. The `/skills` page handles `?q=`, `?checkout=`, `?tier=`, `?capability=`, `?maturity=` only.

**Files to modify:**
- `app/skills/page.tsx` — read `searchParams`, pass to storage, pass to client components
- `app/skills/catalog-client.tsx` — refactor to accept initial server data + use `router.replace()` for filter changes
- `app/skills/catalog-search.tsx` — may need to be created or extracted
- `app/skills/catalog-filters.tsx` — may need to be created or extracted

---

### 2. `generateStaticParams` for Brand Detail Pages

**Priority:** Low — brands with high traffic benefit from static pre-generation, but dynamic SSR with ISR works fine

**What's needed:** Add `generateStaticParams()` to `app/skills/[vendor]/page.tsx` for verified/official brands:

```tsx
export async function generateStaticParams() {
  const brands = await storage.searchBrands({
    maturities: ["verified", "official"],
    limit: 500,
  });
  return brands.map(b => ({ vendor: b.slug }));
}
```

Other brands (draft, community, beta) are rendered on-demand.

**Files to modify:**
- `app/skills/[vendor]/page.tsx`

---

### 3. Sub-Sector Landing Pages

**Priority:** Low until catalog grows beyond ~50 brands

**What's needed:** Browsable pages for each sub-sector (e.g., `/c/office/ink-toner`).

**Implementation steps:**

1. **Create `lib/utils/slugify.ts`** — convert sub-sector display names to URL slugs (e.g., "Ink & Toner" → `ink-and-toner`). Handle `&` → `and`, strip special chars, collapse hyphens.

2. **Add `getSubSectorCounts` storage method** — query `brand_index` to get distinct sub-sectors with counts per sector:
   ```sql
   SELECT sector, unnest(sub_sectors) AS sub_sector, COUNT(*) AS count
   FROM brand_index
   WHERE maturity IN ('verified','official','beta','community')
   GROUP BY sector, sub_sector
   ORDER BY sector, count DESC
   ```

3. **Add `subSectorExact` filter** to `BrandSearchFilters` — exact match against the `sub_sectors` array (current `subSector` filter uses fuzzy `LIKE`):
   ```sql
   WHERE $1 = ANY(sub_sectors)
   ```

4. **Create `app/c/[sector]/[subSector]/page.tsx`** — server component with:
   - `generateStaticParams()` — only generate pages for sub-sectors with 5+ brands
   - `generateMetadata()` — sector + sub-sector specific SEO
   - Server-side brand fetch filtered by sector + exact sub-sector
   - Breadcrumb: All Skills → {Sector} → {Sub-Sector}

**Files to create:**
- `lib/utils/slugify.ts`
- `app/c/[sector]/[subSector]/page.tsx`

**Files to modify:**
- `server/storage/brand-index.ts` — add `getSubSectorCounts`, add `subSectorExact` filter
- `server/storage/types.ts` — add method signatures

---

### 4. Sitemap Splitting

**Priority:** Low until catalog grows beyond ~1,000 URLs

**What's needed:** Replace the single `sitemap()` function in `app/sitemap.ts` with Next.js `generateSitemaps()` so each sector gets its own sitemap file.

**Implementation:**

1. **Rename `app/sitemap.ts` → `app/sitemap.ts` with `generateSitemaps()`:**
   ```tsx
   export async function generateSitemaps() {
     const facets = await storage.getAllBrandFacets();
     return [
       { id: "pages" },           // static pages + docs + blog
       ...facets.sectors.map(s => ({ id: s.value })),  // one per sector
     ];
   }

   export default async function sitemap({ id }: { id: string }) {
     if (id === "pages") {
       return [...staticPages, ...docPages, ...blogPages];
     }
     // Sector sitemap — all brands in this sector
     const brands = await storage.searchBrands({ sectors: [id], limit: 10000 });
     return brands.map(b => ({
       url: `${BASE_URL}/skills/${b.slug}`,
       lastModified: b.updatedAt ?? b.createdAt,
       changeFrequency: "weekly",
       priority: 0.7,
     }));
   }
   ```

2. **Add sub-sector URLs** to sector sitemaps once sub-sector pages exist.

**Files to modify:**
- `app/sitemap.ts`

---

### 5. JSONB Extraction for Catalog Performance

**Priority:** Low — only matters at 1,000+ brands

**What's needed:** The catalog currently fetches `brandData` (JSONB, ~1.8KB per row) for every brand in search results, but most of that data isn't displayed on cards. The `lite: true` flag already exists on `searchBrands()` but may not strip enough.

**Implementation:** Extract the specific fields catalog cards need (description, capabilities, checkout methods, tier) into top-level columns on `brand_index` so the catalog query doesn't need JSONB at all. This is a performance optimization that should be validated with real data before implementing.

**Files to modify:**
- `shared/schema.ts` — add columns
- `server/storage/brand-index.ts` — update queries
- Migration required

---

## Dependencies Between Tasks

```
Task 1 (URL filter state)    → independent, can start now
Task 2 (generateStaticParams) → independent, can start now
Task 3 (sub-sector pages)    → independent, can start now
Task 4 (sitemap splitting)   → depends on Task 3 (sub-sector URLs added to sitemaps)
Task 5 (JSONB extraction)    → independent, low priority
```

Tasks 1, 2, 3, and 5 can all be done in parallel. Task 4 should wait for Task 3 so the sitemaps include sub-sector URLs from the start.
