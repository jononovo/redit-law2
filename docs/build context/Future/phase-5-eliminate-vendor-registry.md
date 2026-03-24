# Phase 5: Eliminate Vendor Registry — Database-Only Source of Truth

## Objective
Remove the in-memory TypeScript vendor registry (`VENDOR_REGISTRY`) entirely. The `brand_index` database table becomes the sole source of truth for all surfaces — bots, humans, and exports. The human-facing catalog (`/skills`) switches from client-side filtering to server-side filtering with pagination.

## Why this is urgent
Two sources of truth exist side by side:
- **Bot-facing API** (`/api/v1/bot/skills`) reads from `brand_index` — correct, up to date
- **Human-facing catalog** (`/skills`, `/skills/[vendor]`) imports `VENDOR_REGISTRY` — stale TypeScript files

This means:
- Brand claims that update `maturity` to "official" in the DB are invisible on the catalog
- New brands added through the Skill Builder pipeline appear for bots but not for humans
- Filter facets (sectors, tiers) on the catalog only reflect the 14 hardcoded vendors

## Scope
- **In scope:** Internal API route, catalog page rewrite (server-side filtering), vendor detail page data source swap, export route swap, claim modal search swap, registry file deletion
- **NOT in scope:** "You manage this" indicator on catalog cards (requires auth-aware rendering on a public page — separate decision), URL rename of My Skills page (avoid breaking bookmarks during data migration)

## Pre-build validation step

**Before writing any code**, run this query to validate `brandData` JSONB fidelity:

```sql
SELECT slug, name,
  brand_data->'methodConfig' IS NOT NULL as has_method_config,
  brand_data->'feedbackStats' IS NOT NULL as has_feedback_stats,
  brand_data->'search' IS NOT NULL as has_search,
  brand_data->'shipping' IS NOT NULL as has_shipping,
  brand_data->'tips' IS NOT NULL as has_tips,
  brand_data->'buying' IS NOT NULL as has_buying,
  brand_data->'checkout' IS NOT NULL as has_checkout,
  brand_data->'deals' IS NOT NULL as has_deals,
  brand_data->'searchDiscovery' IS NOT NULL as has_search_discovery,
  brand_data->'taxonomy' IS NOT NULL as has_taxonomy,
  brand_data->'generatedBy' IS NOT NULL as has_generated_by
FROM brand_index;
```

If any brand rows are missing expected nested objects, re-run the seed (`npx tsx scripts/seed-brand-index.ts`) to refresh them before proceeding.

Also validate the stored JSONB matches the VendorSkill type by spot-checking one vendor:
```sql
SELECT slug, brand_data FROM brand_index WHERE slug = 'amazon' LIMIT 1;
```

Compare the structure against `lib/procurement-skills/vendors/amazon.ts`. If the VendorSkill type has added fields since the last seed, the JSONB needs refreshing.

---

## Step 1: Create internal brands search API

**Create:** `app/api/internal/brands/search/route.ts`

This is the human-facing catalog's data source. Separate from the bot API — different response shape (returns raw `brandData` JSONB), no agent-specific transformations, no external rate limiting concerns.

```tsx
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

  const [brands, facets] = await Promise.all([
    storage.searchBrands(filters),
    storage.getAllBrandFacets(),
  ]);

  return NextResponse.json({
    brands,
    total: brands.length,
    facets,
  });
}
```

**Key design decisions:**
- Returns full `BrandIndex` rows including `brandData` JSONB — the catalog page casts `brandData` to `VendorSkill` for rendering
- Returns facets alongside results so the filter sidebar can populate dynamically
- No auth required (public catalog)
- `limit`/`offset` pagination built in from day one

**Note on `searchBrands` total count:** The current implementation returns `brands.length` which is the page size, not the total matching count. For proper pagination, `searchBrands` should also return a total count. See Step 1B below.

### Step 1B: Add total count to searchBrands

**Edit:** `server/storage/brand-index.ts`

The current `searchBrands` returns paginated results but no total count. For pagination UI ("Showing 1-50 of 237"), we need the total.

Add a new method or modify `searchBrands` to also return the total count. Simplest approach — add a `searchBrandsCount` method:

```tsx
async searchBrandsCount(filters: BrandSearchFilters): Promise<number> {
  // Same conditions as searchBrands but SELECT count(*)
  // Omit limit/offset/sort
}
```

Or modify `searchBrands` return type to `{ brands: BrandIndex[]; total: number }`. This is a **breaking change** for the bot API (`app/api/v1/bot/skills/route.ts` line 34) — update the bot API's call site too.

**Recommendation:** Add a separate `searchBrandsCount` method to avoid breaking the bot API. Add it to `IStorage` interface in `server/storage/types.ts` and compose it in `server/storage/index.ts`.

### Step 1C: Add brand detail by slug API

**Create:** `app/api/internal/brands/[slug]/route.ts`

The vendor detail page needs to fetch a single brand by slug. This could also be done as a direct storage call in a server component, but since the vendor detail page is a client component (it has interactive state for claim button, skill preview toggle, clipboard), it needs an API.

```tsx
import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const brand = await storage.getBrandBySlug(slug);
  if (!brand) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ brand });
}
```

---

## Step 2: Rewrite the catalog page (server-side filtering)

**Edit:** `app/skills/page.tsx` (624 lines → full rewrite)

### 2A. Remove VENDOR_REGISTRY import
**Line 27:** Delete `import { VENDOR_REGISTRY } from "@/lib/procurement-skills/registry";`

Keep all other imports from `@/lib/procurement-skills/types` — the label maps, color maps, type definitions, and icons are still needed for rendering.

### 2B. Remove `computeAgentFriendliness` import
**Line 29:** Delete `computeAgentFriendliness` from the types import.

Replace with the DB-stored `agentReadiness` score, converted to 1-5 using the bot API's formula:
```tsx
const friendliness = Math.min(Math.floor((brand.agentReadiness ?? 0) / 20) + 1, 5);
```

### 2C. Change data model from VendorSkill to BrandIndex

The `VendorCard` component currently takes `{ vendor: VendorSkill }`. Change to accept a `BrandIndex` row and extract display properties from the row columns + `brandData` JSONB cast.

```tsx
import type { BrandIndex } from "@/shared/schema";
import type { VendorSkill } from "@/lib/procurement-skills/types";

function VendorCard({ brand }: { brand: BrandIndex }) {
  const vendor = brand.brandData as unknown as VendorSkill;
  const friendliness = Math.min(Math.floor((brand.agentReadiness ?? 0) / 20) + 1, 5);
  const maturity = MATURITY_CONFIG[brand.maturity as SkillMaturity];
  // ... rest uses brand columns for indexed data, vendor for nested display data
}
```

**Property mapping:**
| Display need | Source |
|---|---|
| `slug`, `name`, `url` | `brand` columns |
| `sector`, `tier`, `subSectors`, `tags` | `brand` columns |
| `checkoutMethods`, `capabilities`, `maturity` | `brand` columns |
| `agentReadiness` → friendliness score | `brand.agentReadiness` with formula |
| `deals.currentDeals` | `brand.hasDeals` column |
| `feedbackStats.successRate` | `vendor.feedbackStats` from `brandData` cast |
| `category` | `brand.sector` (sector replaced category) |

### 2D. Replace useMemo client-side filtering with fetch-on-filter

Remove:
- `availableSectors` useMemo (lines 239-245)
- `availableTiers` useMemo (lines 247-253)
- `filteredVendors` useMemo (lines 255-303)
- `groupedVendors` useMemo (lines 329-337)

Replace with:

```tsx
const [brands, setBrands] = useState<BrandIndex[]>([]);
const [facets, setFacets] = useState<{ sectors: string[]; tiers: string[]; categories: string[] }>({ sectors: [], tiers: [], categories: [] });
const [loading, setLoading] = useState(true);
const [total, setTotal] = useState(0);
const [page, setPage] = useState(0);
const PAGE_SIZE = 50;

const fetchBrands = useCallback(async () => {
  setLoading(true);
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.sectors.length) params.set("sector", filters.sectors.join(","));
  if (filters.tiers.length) params.set("tier", filters.tiers.join(","));
  if (filters.categories.length) params.set("sector", filters.categories.join(","));
  if (filters.checkoutMethods.length) params.set("checkout", filters.checkoutMethods.join(","));
  if (filters.capabilities.length) params.set("capability", filters.capabilities.join(","));
  if (filters.maturity.length) params.set("maturity", filters.maturity.join(","));
  params.set("limit", String(PAGE_SIZE));
  params.set("offset", String(page * PAGE_SIZE));

  try {
    const res = await fetch(`/api/internal/brands/search?${params}`);
    if (res.ok) {
      const data = await res.json();
      setBrands(data.brands);
      setFacets(data.facets);
      setTotal(data.total);
    }
  } catch {}
  setLoading(false);
}, [filters, page]);

useEffect(() => {
  fetchBrands();
}, [fetchBrands]);
```

### 2E. Add search debounce
The search input currently filters instantly with useMemo. With server-side filtering, debounce the search input to avoid firing a request on every keystroke:

```tsx
const searchTimer = useRef<NodeJS.Timeout | null>(null);

const handleSearchChange = (value: string) => {
  setFilters(prev => ({ ...prev, search: value }));
  if (searchTimer.current) clearTimeout(searchTimer.current);
  searchTimer.current = setTimeout(() => {
    setPage(0); // reset to first page on new search
  }, 300);
};
```

### 2F. Update stats display
**Line 464:** Replace `{VENDOR_REGISTRY.length}+` with `{total}+`
**Line 486:** Replace `{VENDOR_REGISTRY.filter(v => v.maturity === "verified").length}` with a count from the fetched data or facets
**Line 488-490:** Replace `{availableSectors.length}` and `{availableTiers.length}` with `{facets.sectors.length}` and `{facets.tiers.length}`

### 2G. Update filter sidebar facets
Replace hardcoded `availableSectors` and `availableTiers` with `facets.sectors` and `facets.tiers` from the API response.

Sectors filter (lines 344-354): `availableSectors.map(...)` → `facets.sectors.map(sector => ...)` (cast to VendorSector for label lookup)
Tiers filter (lines 360-369): `availableTiers.map(...)` → `facets.tiers.map(tier => ...)` (cast to VendorTier for label lookup)

### 2H. Update grouping
Currently groups by `v.taxonomy?.sector || v.category`. With BrandIndex, group by `brand.sector`:

```tsx
const groupedBrands = useMemo(() => {
  const groups: Record<string, BrandIndex[]> = {};
  for (const b of brands) {
    const key = b.sector;
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  }
  return groups;
}, [brands]);
```

### 2I. Add loading state
Show skeleton cards or a subtle spinner while fetching — not a full page reload. The header, search bar, and filter sidebar should remain visible during loading.

### 2J. Add pagination UI
At the bottom of the vendor grid, add a "Load more" button or page navigation:

```tsx
{total > PAGE_SIZE && (
  <div className="flex justify-center mt-8">
    <Button
      variant="outline"
      onClick={() => setPage(p => p + 1)}
      disabled={brands.length < PAGE_SIZE}
      data-testid="button-load-more"
    >
      Load more vendors
    </Button>
  </div>
)}
```

Or offset-based page numbers if preferred. Either way, the internal API supports it.

### 2K. Required new imports
```tsx
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { BrandIndex } from "@/shared/schema";
```

---

## Step 3: Rewrite the vendor detail page data source

**Edit:** `app/skills/[vendor]/page.tsx`

### 3A. Remove registry import
**Line 36:** Delete `import { getVendorBySlug } from "@/lib/procurement-skills/registry";`

### 3B. Add data fetching
The page is a client component (needs interactive state for claim button, preview toggle, clipboard). Replace synchronous `getVendorBySlug(slug)` with a fetch:

```tsx
const [brand, setBrand] = useState<BrandIndex | null>(null);
const [loading, setLoading] = useState(true);
const [notFound, setNotFound] = useState(false);

useEffect(() => {
  fetch(`/api/internal/brands/${slug}`)
    .then(r => {
      if (!r.ok) { setNotFound(true); return null; }
      return r.json();
    })
    .then(data => {
      if (data?.brand) setBrand(data.brand);
    })
    .catch(() => setNotFound(true))
    .finally(() => setLoading(false));
}, [slug]);
```

### 3C. Cast brandData to VendorSkill
After fetching, cast the JSONB blob to get the full VendorSkill for display panels:

```tsx
const vendor = brand ? (brand.brandData as unknown as VendorSkill) : null;
```

All the deep display panels (methodConfig, search, shipping, deals, tips, buying, searchDiscovery) continue to read from `vendor` — the cast gives them access to the full stored object.

### 3D. Replace computeAgentFriendliness
**Line 216:** Replace `computeAgentFriendliness(vendor)` with:
```tsx
const friendliness = Math.min(Math.floor((brand.agentReadiness ?? 0) / 20) + 1, 5);
```

### 3E. Use brand.maturity instead of vendor.maturity
For the maturity badge (**line 217-218**), use `brand.maturity` (the DB value, which reflects claim status changes) instead of `vendor.maturity` (the stale JSONB value):

```tsx
const maturity = MATURITY_CONFIG[brand.maturity as SkillMaturity];
```

### 3F. Skill preview — use DB skillMd if available
**Line 218:** Currently `generateVendorSkill(vendor)` generates markdown on-the-fly. The DB has `brand.skillMd` which is the published version. Use it if available, fall back to generating:

```tsx
const skillMd = brand.skillMd || generateVendorSkill(vendor);
```

This ensures the preview shows the actual published skill, not a regenerated version that might differ.

### 3G. Add loading state
Show a loading skeleton while the brand data is being fetched. The current page renders synchronously (registry lookup is instant), so there's currently no loading state.

### 3H. Handle not-found
Currently checks `if (!vendor)` at **line 192**. Change to check `notFound` state:

```tsx
if (loading) {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="py-32 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
      </main>
      <Footer />
    </div>
  );
}

if (notFound || !brand || !vendor) {
  // existing not-found UI (lines 194-213)
}
```

---

## Step 4: Switch the export route

**Edit:** `app/api/v1/skills/export/route.ts`

### 4A. Replace VENDOR_REGISTRY iteration with DB query
**Lines 4, 42:** Replace:
```tsx
import { VENDOR_REGISTRY } from "@/lib/procurement-skills/registry";
// ...
for (const vendor of VENDOR_REGISTRY) {
```

With:
```tsx
const allBrands = await storage.searchBrands({
  maturities: ["verified", "official"],
  sortBy: "name",
  sortDir: "asc",
  limit: 500,
});
// ...
for (const brand of allBrands) {
```

### 4B. Update vendor property access
Inside the loop, replace `vendor.slug` with `brand.slug` and `vendor.name` with `brand.name`.

### 4C. Remove VendorSkill type import
**Line 5:** Delete `import type { VendorSkill } from "@/lib/procurement-skills/types";` (no longer needed).

### 4D. Maturity filter rationale
Only export `verified` and `official` brands to ClawHub/skills.sh. Community drafts and unreviewed submissions should not leak to external registries. This is a deliberate policy decision — brands must pass review before external distribution.

---

## Step 5: Switch claim modal search

**Edit:** `app/(dashboard)/skill-builder/submit/page.tsx`

### 5A. Replace bot API call with internal route
In the `handleClaimSearch` function, replace:
```tsx
const res = await fetch(`/api/v1/bot/skills?search=${encodeURIComponent(q.trim())}`);
if (res.ok) {
  const data = await res.json();
  setClaimSearchResults(
    (data.vendors || []).slice(0, 8).map((v: { slug: string; name: string }) => ({
      slug: v.slug,
      name: v.name,
    }))
  );
}
```

With:
```tsx
const res = await fetch(`/api/internal/brands/search?q=${encodeURIComponent(q.trim())}&limit=8`);
if (res.ok) {
  const data = await res.json();
  setClaimSearchResults(
    (data.brands || []).slice(0, 8).map((b: { slug: string; name: string }) => ({
      slug: b.slug,
      name: b.name,
    }))
  );
}
```

---

## Step 6: Delete the vendor registry files

### 6A. Delete the registry barrel
**Delete:** `lib/procurement-skills/registry.ts`

This file exports 6 functions:
1. `VENDOR_REGISTRY` (array)
2. `getVendorBySlug(slug)`
3. `getVendorsByCategory(category)`
4. `getVendorsBySector(sector)`
5. `getVendorsByTier(tier)`
6. `searchVendors(query)`

### 6B. Keep the `vendors/` directory (DO NOT delete)

**Decision (confirmed during review):** The `vendors/` directory stays. The seed script (`scripts/seed-brand-index.ts`) imports directly from `lib/procurement-skills/vendors/` — deleting it would break the ability to re-seed after a DB issue. Since `registry.ts` (the barrel that all runtime code imports) is deleted, the individual vendor files become dead code with no runtime importers. This is harmless and keeps the seed pipeline functional.

### 6C. Codebase-wide import search
After deleting `registry.ts`, search for any remaining imports to catch build-breaking references:

```bash
grep -r "from.*procurement-skills/registry" --include="*.ts" --include="*.tsx"
grep -r "VENDOR_REGISTRY" --include="*.ts" --include="*.tsx"
grep -r "getVendorsByCategory" --include="*.ts" --include="*.tsx"
grep -r "getVendorsBySector" --include="*.ts" --include="*.tsx"
grep -r "getVendorsByTier" --include="*.ts" --include="*.tsx"
grep -r "searchVendors" --include="*.ts" --include="*.tsx"
```

Expected: zero matches (excluding docs/attached_assets). If any remain, update them.

Note: `getVendorBySlug` also exists on `server/storage/vendors.ts` (the `vendors` DB table, unrelated to the procurement skills registry). That one stays.

**DO NOT delete:**
- `lib/procurement-skills/types.ts` — type definitions, label maps, color maps, `computeAgentFriendliness()` (still used by catalog UI, generator, skill-json, description-md — stays as a standalone utility function)
- `lib/procurement-skills/taxonomy/` — taxonomy label definitions (still used by catalog UI)
- `lib/procurement-skills/generator.ts` — skill markdown generator (still used by vendor detail preview and Skill Builder; internally calls `computeAgentFriendliness()`)
- `lib/procurement-skills/vendors/` — individual vendor data files (still used by seed script)
- `scripts/seed-brand-index.ts` — still needed for initial seeding and refreshing JSONB data

---

## Step 7: Update documentation

### 7A. Update replit.md
- Remove references to `VENDOR_REGISTRY` as a data source
- Update the Procurement Skills Module section to reflect DB-only architecture
- Note the internal API route

### 7B. Update manual test checklist
- Add catalog page test cases (server-side filtering, pagination, loading states)
- Update vendor detail page test cases (data loads from DB, maturity reflects claims)

---

## Risk assessment

### Low risk
- **No schema changes** — zero migrations, zero DB changes
- **No data loss** — read-path-only changes
- **brandData JSONB preservation** — the full VendorSkill is already stored; validation step catches any drift
- **Export route maturity filter** — straightforward addition

### Medium risk
- **Catalog page UX change** — instant client-side filtering → server-side fetch with loading states. Users will notice a slight delay when toggling filters. Mitigate with good loading states (skeleton cards, not full-page spinners) and debounced search.
- **brandData JSONB type safety** — casting JSONB to VendorSkill is inherently unsafe. If a stored object is missing a field the UI reads (e.g. `vendor.methodConfig[method]`), it will crash. Mitigate with optional chaining (`vendor.methodConfig?.[method]`) and the pre-build validation step.

### Not a risk
- **The seed script** — It imports from `lib/procurement-skills/vendors/` which we are keeping. The seed pipeline remains fully functional.
- **`computeAgentFriendliness`** — Stays in `types.ts` as a standalone function. Used by `generator.ts`, `skill-json.ts`, `description-md.ts`. Not touched by Phase 5. The catalog pages stop calling it directly (they use the pre-computed `agentReadiness` DB score instead), but nothing is removed.

---

## Files touched (summary)

| Operation | File | Description |
|---|---|---|
| Create | `app/api/internal/brands/search/route.ts` | Internal catalog search API |
| Create | `app/api/internal/brands/[slug]/route.ts` | Internal brand detail API |
| Edit | `server/storage/brand-index.ts` | Add `searchBrandsCount` method |
| Edit | `server/storage/types.ts` | Add `searchBrandsCount` to IStorage |
| Edit | `server/storage/index.ts` | Compose `searchBrandsCount` |
| Rewrite | `app/skills/page.tsx` | Server-side filtering, pagination, BrandIndex data model |
| Edit | `app/skills/[vendor]/page.tsx` | Fetch from internal API, cast brandData |
| Edit | `app/api/v1/skills/export/route.ts` | Replace VENDOR_REGISTRY with DB query |
| Edit | `app/(dashboard)/skill-builder/submit/page.tsx` | Claim modal search → internal API |
| Delete | `lib/procurement-skills/registry.ts` | Vendor registry barrel (only runtime entry point) |
| Keep | `lib/procurement-skills/vendors/` (15 files) | Kept for seed script — no runtime importers after registry.ts deleted |
| Keep | `lib/procurement-skills/types.ts` | Label maps, color maps, `computeAgentFriendliness()` — standalone utility |
| Keep | `lib/procurement-skills/generator.ts` | Skill markdown generator — calls `computeAgentFriendliness()` |
| Edit | `replit.md` | Update documentation |

**Total: 4 creates/edits to storage layer, 4 page edits, 1 API edit, 1 file deletion**
