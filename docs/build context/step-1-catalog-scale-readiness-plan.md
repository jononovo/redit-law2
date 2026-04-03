# Step 1: Catalog Scale Readiness — Technical Plan

Prepares the catalog for tens of thousands of brands. Three independent tasks that can be built in any order or in parallel.

---

## 1A. URL-Based Filter State on `/skills`

### Problem

The server component (`app/skills/page.tsx`) always renders the same default view: 50 brands sorted by score, public maturities only. All filtering happens client-side via `catalog-client.tsx` fetching from `/api/internal/brands/search`. This means:
- Crawlers never see filtered views
- Filtered URLs aren't shareable or bookmarkable
- `generateMetadata()` always produces the same generic title/description

### Current Architecture

```
User hits /skills
  → Server: page.tsx fetches hardcoded default (limit 50, score desc, public maturities)
  → Server: passes initialBrands, initialFacets, initialTotal to CatalogClient
  → Client: CatalogClient renders, user changes filters
  → Client: fetchBrands() calls /api/internal/brands/search with URLSearchParams
  → Client: re-renders with new data
  → URL never changes
```

### Target Architecture

```
User hits /skills?q=office&tier=value&checkout=native_api
  → Server: page.tsx reads searchParams, maps to BrandSearchFilters, fetches matching data
  → Server: generateMetadata() produces filter-aware title ("Office Value Tier Skills | CreditClaw")
  → Server: passes initialBrands + initialFilters to CatalogClient
  → Client: CatalogClient initializes filter state from initialFilters (not empty defaults)
  → Client: user changes filters → router.replace() updates URL → triggers server re-render
  → Shareable, crawlable, bookmarkable
```

### Implementation

#### 1. `app/skills/page.tsx` — Read searchParams, pass to storage

The server component needs a `searchParams` prop (Next.js App Router provides this automatically to page components).

**Param mapping** (reuse the same logic as `app/api/internal/brands/search/route.ts`):

| URL Param | Filter Field | Type | Notes |
|---|---|---|---|
| `q` | `q` | string | Full-text search |
| `checkout` | `checkoutMethods` | CSV → string[] | e.g., `native_api,self_hosted_card` |
| `capability` | `capabilities` | CSV → string[] | |
| `tier` | `tiers` | CSV → string[] | |
| `maturity` | `maturities` | CSV → string[] | Defaults to `["verified","official","beta","community"]` if absent |
| `sort` | `sortBy` | enum | `score`, `name`, `created_at`, `rating` |
| `dir` | `sortDir` | enum | `asc`, `desc` |

**Note:** Sector filtering uses `/c/[sector]` routes, NOT `?sector=` on `/skills`. The sector nav already links to `/c/[sector]` (catalog-client.tsx line 130). No sector param needed here.

Extract a shared `parseSearchParams(params)` → `BrandSearchFilters` helper that both `page.tsx` and the internal API route can import, eliminating the duplicated parsing logic.

**File:** Create `lib/catalog/parse-filters.ts` with the shared parser. Update `app/api/internal/brands/search/route.ts` to import from it. Use it in `page.tsx`.

#### 2. `app/skills/page.tsx` — Filter-aware `generateMetadata()`

`generateMetadata` receives `{ searchParams }` in Next.js App Router. Use the parsed filters to build a descriptive title:

- No filters → "Skill Index — AI Agent Procurement Skills | CreditClaw" (current default)
- `?q=office` → "\"office\" — Skill Index | CreditClaw"
- `?tier=value` → "Value Tier Skills — Skill Index | CreditClaw"
- `?checkout=native_api` → "Native API Checkout Skills — Skill Index | CreditClaw"
- Multiple → combine: "Value Tier, Native API Skills — Skill Index | CreditClaw"

Canonical URL should include the active search params (sorted, deduped) so Google treats each filtered view as a distinct page.

#### 3. `app/skills/page.tsx` — Pass initialFilters to CatalogClient

Add a new prop to `CatalogClientProps`:

```ts
initialFilters?: {
  search: string;
  checkoutMethods: CheckoutMethod[];
  capabilities: VendorCapability[];
  maturity: SkillMaturity[];
  tiers: BrandTier[];
};
```

The server component constructs this from `searchParams` and passes it down.

#### 4. `app/skills/catalog-client.tsx` — Initialize from props, sync URL

Changes:
- Accept `initialFilters` prop
- Initialize `useState<FilterState>` from `initialFilters` instead of empty defaults
- When user changes a filter: build the new URL params, call `router.replace(/skills?${params})` (shallow, no scroll reset)
- The `fetchBrands()` function continues to work as-is — it already builds URLSearchParams from filter state and calls the internal API. URL syncing is additive, not a rewrite of existing logic.
- On initial mount with `initialFilters`, skip the first `fetchBrands()` call (data already came from server). This is already handled by the `isInitialMount` ref (line 228).

**Import needed:** `useRouter` from `next/navigation` (for `router.replace()`).

#### 5. Pagination URL state

Current pagination is page-number based (`page` state, offset = `page * PAGE_SIZE`). Add `?page=2` to URL when user navigates pages, so deep pages are also shareable.

### Files Changed

| File | Change |
|---|---|
| `lib/catalog/parse-filters.ts` | **NEW** — shared searchParams→BrandSearchFilters parser |
| `app/skills/page.tsx` | Read searchParams, pass initialFilters, filter-aware metadata |
| `app/skills/catalog-client.tsx` | Accept initialFilters, `router.replace()` on filter change |
| `app/api/internal/brands/search/route.ts` | Import shared parser (reduces duplication) |

### What NOT to change

- `catalog-client.tsx` rendering logic, filter UI, table/card views — untouched
- `vendor-card.tsx` — untouched
- `storage.searchBrands()` — already supports all needed filters
- Sector nav links — already point to `/c/[sector]`, no change needed

---

## 1B. `generateStaticParams` for Brand Detail Pages

### Problem

Every brand detail page (`/skills/[vendor]`) is SSR on-demand. At tens of thousands of brands, popular pages hit the database on every view. Pre-rendering verified/official brands at build time means instant loads and no DB pressure for the most-visited pages.

### Current Code

`app/skills/[vendor]/page.tsx` has no `generateStaticParams`. The `getBrand` function uses React `cache()` (line 55) which deduplicates within a single request but doesn't persist across requests.

### Implementation

Add to `app/skills/[vendor]/page.tsx`:

```ts
export async function generateStaticParams() {
  const brands = await storage.searchBrands({
    maturities: ["verified", "official"],
    limit: 500,
    lite: true,
  });
  return brands.map(b => ({ vendor: b.slug }));
}
```

This pre-renders verified and official brand pages. Community and beta brands continue with on-demand SSR. Draft brands are already excluded from the catalog.

The limit of 500 is a safety cap — at tens of thousands of total brands, only a subset will be verified/official. If that number grows beyond 500, increase the limit or paginate.

Consider adding `export const revalidate = 3600;` (1 hour ISR) so pages refresh periodically without requiring a full rebuild.

### Files Changed

| File | Change |
|---|---|
| `app/skills/[vendor]/page.tsx` | Add `generateStaticParams()`, optionally add `revalidate` |

---

## 1C. Lean Catalog Query (drop `brandData` from lite select)

### Problem

`LITE_COLUMNS` (line 41 in `server/storage/brand-index.ts`) includes `brandData` — the full VendorSkill JSONB blob (~2-4 KB per row). Every catalog page load fetches 50 rows × 2-4 KB = 100-200 KB of JSON that the cards barely use. At 10K+ brands with pagination, this is measurable waste.

### What the cards actually use from `brandData`

Both `vendor-card.tsx` (line 82, 195-199) and `catalog-client.tsx` (line 588, 631-634) do:
```ts
const vendor = brand.brandData as unknown as VendorSkill | null;
// ...
vendor?.feedbackStats?.successRate  // → displays as percentage
```

That's it. One number. Everything else the cards display comes from top-level columns already in `LITE_COLUMNS`: `name`, `slug`, `sector`, `tier`, `maturity`, `overallScore`, `checkoutMethods`, `capabilities`, `subSectors`, `hasDeals`, `axsRating`, `ratingCount`.

### Fix: SQL expression instead of full column

Replace the `brandData` line in `LITE_COLUMNS` with a Drizzle SQL expression that extracts just the success rate:

```ts
const LITE_COLUMNS = {
  id: brandIndex.id,
  slug: brandIndex.slug,
  name: brandIndex.name,
  sector: brandIndex.sector,
  subSectors: brandIndex.subSectors,
  tier: brandIndex.tier,
  maturity: brandIndex.maturity,
  overallScore: brandIndex.overallScore,
  checkoutMethods: brandIndex.checkoutMethods,
  capabilities: brandIndex.capabilities,
  hasDeals: brandIndex.hasDeals,
  // Was: brandData: brandIndex.brandData,
  successRate: sql<string>`(${brandIndex.brandData}->'feedbackStats'->>'successRate')`.as('success_rate'),
  axsRating: brandIndex.axsRating,
  ratingCount: brandIndex.ratingCount,
  updatedAt: brandIndex.updatedAt,
};
```

**Type note:** JSONB `-->>` always returns `string | null`. The components do `Math.round(value * 100)`, so we parse at the component level: `Number(brand.successRate)`.

### Update `BrandCardRow` type

The `BrandCardRow` type (line 35) needs to reflect the change:

```ts
export type BrandCardRow = Pick<BrandIndex,
  | "id" | "slug" | "name" | "sector" | "subSectors" | "tier" | "maturity"
  | "overallScore" | "checkoutMethods" | "capabilities" | "hasDeals" | "updatedAt"
> & { successRate: string | null };
```

Remove `brandData` from `BrandCardRow` since lite queries no longer return it.

### Update card components

**`app/skills/vendor-card.tsx`** (line 82, 195-199):
```ts
// Before:
const vendor = brand.brandData as unknown as VendorSkill | null;
// ...
vendor?.feedbackStats?.successRate

// After:
const successRate = 'successRate' in brand ? Number((brand as any).successRate) : null;
// ...
successRate != null && !isNaN(successRate)
```

Better approach: make VendorCard accept a generic type or check the shape. Since VendorCard receives `BrandIndex` from both lite and full queries, use a union or optional field:

```ts
// Clean approach: check if successRate exists (lite query) or fall back to brandData (full query)
const successRate = 'successRate' in brand
  ? Number(brand.successRate)
  : (brand.brandData as any)?.feedbackStats?.successRate ?? null;
```

This preserves backward compatibility if VendorCard is ever used with full BrandIndex objects elsewhere.

**`app/skills/catalog-client.tsx`** (line 588, 631-634): Same pattern. Both the table view and card view access `brandData` only for `feedbackStats.successRate`.

### What stays unchanged

- Full queries (`lite: false`) still return the complete `brandData` column — the brand detail page is unaffected
- `upsertBrandIndex` — untouched
- Schema — no migration needed
- The `brandData` column itself — stays in the table, just not selected in lite queries

### Files Changed

| File | Change |
|---|---|
| `server/storage/brand-index.ts` | Replace `brandData` with `successRate` SQL expression in `LITE_COLUMNS`, update `BrandCardRow` type |
| `app/skills/vendor-card.tsx` | Read `successRate` directly instead of casting `brandData` |
| `app/skills/catalog-client.tsx` | Same — read `successRate` in table view instead of `brandData` cast |

---

## Build Order

All three tasks are independent — no dependencies between them. They can be built in any order or parallelized across agents.

Suggested order if doing sequentially:
1. **1C (lean query)** — smallest change, immediate performance benefit, cleanest diff
2. **1B (staticParams)** — one function addition, quick win
3. **1A (URL filters)** — largest change, touches 3-4 files, needs the shared parser extraction

---

## Verification

- **1A**: Visit `/skills?q=office&tier=value` → server renders matching brands, page title reflects filters, URL stays after reload, Google can crawl the filtered view
- **1B**: Build completes with pre-rendered brand pages, verified/official brand pages serve without DB queries
- **1C**: Catalog loads → network tab shows no `brandData` JSONB in API response (or in SSR payload), success rate percentages still display correctly on cards and table
