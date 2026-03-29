# Phase 11: Vendor Table Removal, Sub-Sector Pages, Sitemap Splitting

## Status: Not started

## Overview

Three infrastructure tasks that should be completed together before the brand catalog scales beyond the current ~14 brands:

1. **Remove the dead `vendors` table** — confirmed unused, all consumers migrated to `brand_index`
2. **Sub-sector landing pages** — browsable pages for each sub-sector within a sector (e.g., `/c/office/ink-toner`)
3. **Sitemap splitting** — replace the single `sitemap.ts` with a sitemap index so each sector gets its own sitemap file

These are sequenced as Part A → Part B → Part C, but Parts B and C are independent of each other and can be built in parallel after Part A.

---

## Part A: Remove the Dead `vendors` Table

### Why

The `vendors` table (`shared/schema.ts` line 1082) is completely unused at runtime:

- **Zero callers**: No file in the codebase calls `storage.getVendorBySlug()`, `storage.getVendorById()`, or `storage.getAllVendors()`. The methods exist in the storage layer but are never invoked.
- **No FK references**: The `orders.vendorId` column (line 1165) is a standalone integer — no foreign key constraint points to `vendors`. No fulfillment or checkout code passes `vendorId` when creating orders.
- **`/api/v1/vendors` already migrated**: The route at `app/api/v1/vendors/route.ts` calls `storage.searchBrands({})` — it reads from `brand_index`, not `vendors`.
- **`brandLoginAccounts` already migrated**: The table formerly known as `merchant_accounts` was renamed to `brand_login_accounts` and its `brandId` column references `brand_index.id`. A deprecated alias `merchantAccounts = brandLoginAccounts` exists in schema (line 1136-1137).

### Audit results (verified 2025-03-26)

Full codebase trace confirmed:

- **`storage.getVendorBySlug()`** — defined in `server/storage/vendors.ts`, registered in `IStorage`, but **zero callers** across the entire codebase.
- **`storage.getVendorById()`** — same: defined, registered, **zero callers**.
- **`storage.getAllVendors()`** — same: defined, registered, **zero callers**.
- **No file imports `Vendor`, `InsertVendor`, or `vendors`** from `shared/schema` except `server/storage/vendors.ts` (the file being deleted) and `server/storage/types.ts` (the import being cleaned up).
- **No raw SQL** references `FROM vendors`, `JOIN vendors`, `INSERT INTO vendors`, `UPDATE vendors`, or `DELETE FROM vendors` anywhere in the TypeScript codebase.
- **`orders.vendorId`** (schema line 1165) — a standalone `integer` column with **no FK constraint** to the `vendors` table. Additionally confirmed: no fulfillment handler (`rail1-fulfillment.ts` through `rail5-fulfillment.ts`), no checkout route, and no API route passes `vendorId` when calling `recordOrder()`. The column is nullable and never written.
- **`listVersionsByVendor`** (types.ts line 252) — uses "vendor" in its method name but queries the `skill_versions` table by `vendorSlug`. No dependency on the `vendors` table. NOT affected by this change.
- **`app/api/v1/vendors/route.ts`** — already rewritten. Calls `storage.searchBrands({})` from `brand_index`. Does NOT touch the `vendors` table or storage methods. NOT affected by this change.
- **Historical migration** `drizzle/0000_late_giant_girl.sql` — contains `CREATE TABLE "vendors"`. This is a committed migration file and MUST NOT be modified.

### What to remove

| File | Action | Detail |
|---|---|---|
| `shared/schema.ts` lines 1082-1109 | Delete | `vendors` table definition, `Vendor`/`InsertVendor` types, `insertVendorSchema` |
| `server/storage/vendors.ts` | Delete file | `vendorMethods` object (3 methods, all dead) |
| `server/storage/index.ts` line 18 | Delete | `import { vendorMethods } from "./vendors"` |
| `server/storage/index.ts` line 51 | Delete | `...vendorMethods,` spread |
| `server/storage/types.ts` lines 307-309 | Delete | `getVendorBySlug`, `getVendorById`, `getAllVendors` from `IStorage` |
| `server/storage/types.ts` line 42 | Delete | `type Vendor, type InsertVendor` import |
| `server/storage/types.ts` line 44 | Delete | `type MerchantAccount, type InsertMerchantAccount` import (unused — only imported here, never used in IStorage) |

### What NOT to touch

| Item | Reason |
|---|---|
| `orders.vendorId` column (schema line 1165) | Nullable, never written. Harmless. Removing a column from a live table requires a migration — not worth the risk for an unused nullable field. |
| `orders.vendor` text column (schema line 1164) | Actively used — stores the merchant display name. |
| `lib/procurement-skills/vendors/*.ts` files | Still used by the seed script (`scripts/seed-brand-index.ts`). These are vendor DATA files, not the vendors TABLE. |
| `drizzle/0000_late_giant_girl.sql` | Historical migration. Must never be modified. |
| `listVersionsByVendor` method name (types.ts line 252) | Just a naming convention for brand slugs. Queries `skill_versions`, not `vendors`. |
| `app/api/v1/vendors/route.ts` | Already reads from `brand_index`. Endpoint stays for backward compatibility. |

### Deprecated alias cleanup

`shared/schema.ts` has four deprecated aliases that should also be removed:

```typescript
// line 1133
export type MerchantAccount = BrandLoginAccount;
// line 1135
export type InsertMerchantAccount = InsertBrandLoginAccount;
// line 1137
export const merchantAccounts = brandLoginAccounts;
// line 1151
export const insertMerchantAccountSchema = insertBrandLoginAccountSchema;
```

**Verified**: `merchantAccounts` is only referenced in `shared/schema.ts` itself (the alias definition). `MerchantAccount`/`InsertMerchantAccount` are imported by `server/storage/types.ts` line 44 but never used in the `IStorage` interface — it uses `BrandLoginAccount` directly. All four aliases can be safely removed.

### Orders `vendorId` column — keep (confirmed)

The `orders.vendorId` column (line 1165) is an optional integer that is **never populated in practice**. Confirmed by tracing every call to `recordOrder()` in the codebase:
- `lib/orders/create.ts` line 17 passes `vendorId: input.vendorId ?? null`
- `lib/orders/types.ts` line 14 defines `vendorId?: number | null`
- No caller of `recordOrder` sets `vendorId` — it always falls through to `null`

**Recommendation**: Keep the column. It's harmless (nullable, never written). Renaming to `brandId` is a future cleanup.

### Risk assessment

- **Very low risk** — exhaustive trace confirms zero runtime dependencies on the `vendors` table, its types, or its storage methods.
- **No migration needed** — Drizzle does not auto-drop tables. The `vendors` table will remain in PostgreSQL until manually dropped via `DROP TABLE vendors;`. Removing it from the schema just means Drizzle no longer generates queries for it.
- **No data loss** — all vendor data was already migrated to `brand_index` during earlier phases.
- **Build safety** — after removing these items, run `npx tsc --noEmit` to confirm zero TypeScript errors. The removals only affect dead code, so no errors are expected.

### Verification after removal

```bash
# 1. TypeScript compilation — must pass
npx tsc --noEmit

# 2. Confirm no TypeScript references to removed items remain
grep -r "from.*storage/vendors" --include="*.ts"
# Expected: zero matches

grep -r "getVendorBySlug\|getVendorById\|getAllVendors" --include="*.ts" --include="*.tsx"
# Expected: zero matches

grep -r "InsertVendor\b" --include="*.ts" --include="*.tsx"
# Expected: zero matches (note: InsertVendor, not InsertBrandIndex)

# 3. Confirm the vendors/ data directory still exists (used by seed script)
ls lib/procurement-skills/vendors/
# Expected: 14 .ts files
```

---

## Part B: Sub-Sector Landing Pages

### Current state

- Sector pages exist at `app/c/[sector]/page.tsx` — SSR, `generateStaticParams`, `generateMetadata`, canonical URLs at `/c/[sector]`
- `brand_index.sub_sectors` is a `text[]` column (line 1525 of schema)
- 14 existing brands have sub-sectors defined (e.g., Staples: `["office supplies", "ink & toner", "furniture", "technology"]`)
- No slugify utility exists in the codebase yet
- No `getSubSectorCounts` storage method exists yet

### Current sub-sector inventory (from vendor source files)

| Sector | Sub-sectors | Brands |
|---|---|---|
| office | office supplies, ink & toner, furniture, technology, cleaning | Staples, Office Depot |
| electronics | cameras, audio, lighting, pro video, computers, drones, computer components, peripherals, networking, gaming, consumer electronics | B&H Photo, Newegg |
| construction | building materials, tools, appliances, plumbing, electrical, paint | Home Depot, Lowe's |
| industrial | mro, safety, electrical, plumbing, hvac, hand tools, power tools, fasteners, raw materials, pneumatics, hydraulics, bearings, hardware, packaging, shipping supplies, janitorial, warehouse equipment | Grainger, Uline, McMaster-Carr |
| retail | general merchandise, grocery, home goods, electronics, books, business supplies, bulk purchasing, office equipment | Amazon, Walmart, Amazon Business, Walmart Business |
| saas | platform, dtc brands, independent stores | Shopify |

### Route structure

Create `app/c/[sector]/[subSector]/page.tsx`:

```
/c/office/office-supplies        → Office Supplies sub-sector page
/c/electronics/consumer-audio    → Consumer Audio sub-sector page
/c/industrial/fasteners          → Fasteners sub-sector page
```

### B1. Slugify utility

Create `lib/utils/slugify.ts`:

```typescript
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function deslugify(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\band\b/g, "&");
}
```

The matching approach: slugify sub-sector values from the DB and compare against the URL param. No stored slug column needed at current scale. When the URL param is `ink-and-toner`, `deslugify` converts it back to `ink & toner` and the storage query does a case-insensitive match against the `sub_sectors` array.

### B2. Storage method: `getSubSectorCounts`

Add to `server/storage/brand-index.ts`:

```typescript
async getSubSectorCounts(sector?: string): Promise<{ sector: string; subSector: string; count: number }[]> {
  const sectorFilter = sector ? sql`WHERE sector = ${sector}` : sql``;
  const result = await db.execute(sql`
    SELECT sector, s AS sub_sector, count(*)::int AS cnt
    FROM brand_index, unnest(sub_sectors) s
    ${sectorFilter}
    GROUP BY sector, s
    ORDER BY cnt DESC, s ASC
  `);
  return result.rows.map(r => ({
    sector: r.sector as string,
    subSector: r.sub_sector as string,
    count: r.cnt as number,
  }));
}
```

Add to `IStorage` in `server/storage/types.ts`. Add to `BrandIndexMethods` pick type. Compose in `server/storage/index.ts`.

### B3. Storage method: `searchBrandsBySubSector`

No new method needed. The existing `searchBrands` already supports the `subSector` filter (line 148-149 of brand-index.ts). However, the current implementation does a `LIKE` match which is fuzzy. For the sub-sector page, we want an exact array containment match.

Add a new filter option to `BrandSearchFilters`:

```typescript
subSectorExact?: string;  // exact match against sub_sectors array
```

And add to `buildConditions`:

```typescript
if (filters.subSectorExact) {
  conditions.push(sql`${brandIndex.subSectors} @> ARRAY[${filters.subSectorExact}]::text[]`);
}
```

This uses GIN index `brand_index_sub_sectors_gin` for fast lookups.

### B4. Sub-sector page component

Create `app/c/[sector]/[subSector]/page.tsx`:

```typescript
import { cache } from "react";
import { notFound } from "next/navigation";
import { storage } from "@/server/storage";
import { VendorCard } from "@/app/skills/vendor-card";
import { SECTOR_LABELS, VendorSector } from "@/lib/procurement-skills/types";
import { slugify, deslugify } from "@/lib/utils/slugify";
import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";

const getSubSectorBrands = cache(async (sector: string, subSectorDisplay: string) => {
  return storage.searchBrands({
    sectors: [sector],
    subSectorExact: subSectorDisplay,
    maturities: ["verified", "official", "beta", "community"],
    sortBy: "readiness",
    sortDir: "desc",
    limit: 200,
    lite: true,
  });
});

type Props = { params: Promise<{ sector: string; subSector: string }> };

export async function generateStaticParams() {
  const subSectorCounts = await storage.getSubSectorCounts();
  return subSectorCounts.map(sc => ({
    sector: sc.sector,
    subSector: slugify(sc.subSector),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sector, subSector } = await params;
  const sectorLabel = SECTOR_LABELS[sector as VendorSector];
  if (!sectorLabel) return {};

  const subSectorDisplay = deslugify(subSector);
  const titleCase = subSectorDisplay.replace(/\b\w/g, c => c.toUpperCase());

  return {
    title: `${titleCase} — ${sectorLabel} AI Procurement Skills | CreditClaw`,
    description: `Browse AI agent procurement skills for ${titleCase} in the ${sectorLabel} sector. Compare checkout methods, readiness scores, and capabilities.`,
    alternates: { canonical: `${BASE_URL}/c/${sector}/${subSector}` },
    openGraph: {
      title: `${titleCase} — ${sectorLabel} Procurement Skills`,
      description: `AI agent procurement skills for ${titleCase}. Sector: ${sectorLabel}.`,
      url: `${BASE_URL}/c/${sector}/${subSector}`,
      type: "website",
    },
  };
}

export default async function SubSectorPage({ params }: Props) {
  const { sector, subSector } = await params;
  const sectorLabel = SECTOR_LABELS[sector as VendorSector];
  if (!sectorLabel) notFound();

  const subSectorDisplay = deslugify(subSector);
  const brands = await getSubSectorBrands(sector, subSectorDisplay);
  if (brands.length === 0) notFound();

  const titleCase = subSectorDisplay.replace(/\b\w/g, c => c.toUpperCase());

  // Render: breadcrumb (All Skills > Sector > Sub-sector), heading, brand grid
  // Same visual pattern as sector page but scoped to sub-sector
  // Include "Other sub-sectors in {sector}" section at bottom
}
```

### B5. Link sub-sectors from the sector page

Update `app/c/[sector]/page.tsx` to:
1. Call `storage.getSubSectorCounts(sectorKey)` alongside existing data fetches
2. Group brands by sub-sector within the sector page
3. Add sub-sector headings that link to `/c/[sector]/[slugify(subSector)]`
4. Show sub-sector chip/pill navigation at the top of the sector page

### B6. Breadcrumb structure

Sub-sector pages should have a breadcrumb: `All Skills → {Sector} → {Sub-sector}`

```
/skills          → top level
/c/office        → Office sector
/c/office/ink-and-toner  → Ink & Toner sub-sector within Office
```

### B7. Not-found handling

Create `app/c/[sector]/[subSector]/not-found.tsx` with a simple "Sub-sector not found" page that links back to the parent sector page.

### Files touched

| Operation | File | Description |
|---|---|---|
| Create | `lib/utils/slugify.ts` | Slugify/deslugify utility |
| Create | `app/c/[sector]/[subSector]/page.tsx` | Sub-sector landing page (SSR) |
| Create | `app/c/[sector]/[subSector]/not-found.tsx` | 404 for invalid sub-sectors |
| Edit | `app/c/[sector]/page.tsx` | Group brands by sub-sector, add sub-sector links |
| Edit | `server/storage/brand-index.ts` | Add `getSubSectorCounts`, add `subSectorExact` filter |
| Edit | `server/storage/types.ts` | Add `getSubSectorCounts` to IStorage |

### Risk assessment

- **Low risk** — additive only. No existing pages or routes are modified in a breaking way.
- **Slug matching edge case**: Sub-sectors with `&` (e.g., "ink & toner") need the slugify/deslugify to handle `&` ↔ `and` correctly. The utility handles this.
- **Empty sub-sectors**: `generateStaticParams` generates pages for all sub-sectors that have at least 1 brand. Sub-sectors with 0 brands won't get pages. New brands added later will be caught on-demand (Next.js dynamic rendering).

---

## Part C: Sitemap Splitting

### Current state

`app/sitemap.ts` (139 lines) generates a single sitemap with:
- 11 static pages
- Doc pages (from `sections`)
- Blog posts, categories, tags (from `content/blog`)
- Brand pages (`/skills/[slug]`) from `storage.searchBrands`
- Sector pages (`/c/[sector]`) from sector counts

At ~14 brands this is tiny. At 5,000+ brands the single XML file would exceed 500 KB and Google recommends splitting at 50,000 URLs or 50 MB.

### Why build it now

The infrastructure should be in place before the data arrives. Building the sitemap index pattern now means every new brand automatically lands in the correct per-sector sitemap with no future work.

### Implementation

Next.js App Router supports sitemap splitting via `generateSitemaps()`:

#### C1. Convert `app/sitemap.ts` to use `generateSitemaps`

```typescript
import type { MetadataRoute } from "next";
import { sections } from "@/docs/content/sections";
import { getAllPosts, getAllTags } from "@/content/blog/posts";
import { categories } from "@/content/blog/taxonomy";
import { storage } from "@/server/storage";
import { SECTOR_LABELS, VendorSector } from "@/lib/procurement-skills/types";
import { slugify } from "@/lib/utils/slugify";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";

const ALL_SECTORS = Object.keys(SECTOR_LABELS) as VendorSector[];

export async function generateSitemaps() {
  return [
    { id: "pages" },
    ...ALL_SECTORS.map(s => ({ id: s })),
  ];
}

export default async function sitemap({ id }: { id: string }): Promise<MetadataRoute.Sitemap> {
  if (id === "pages") {
    // Static pages + docs + blog posts + blog categories + blog tags
    const staticPages: MetadataRoute.Sitemap = [
      { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1.0 },
      { url: `${BASE_URL}/how-it-works`, changeFrequency: "monthly", priority: 0.8 },
      { url: `${BASE_URL}/safety`, changeFrequency: "monthly", priority: 0.7 },
      { url: `${BASE_URL}/skills`, changeFrequency: "weekly", priority: 0.8 },
      { url: `${BASE_URL}/solutions/card-wallet`, changeFrequency: "monthly", priority: 0.7 },
      { url: `${BASE_URL}/solutions/stripe-wallet`, changeFrequency: "monthly", priority: 0.7 },
      { url: `${BASE_URL}/allowance`, changeFrequency: "monthly", priority: 0.7 },
      { url: `${BASE_URL}/newsroom`, changeFrequency: "weekly", priority: 0.6 },
      { url: `${BASE_URL}/docs`, changeFrequency: "weekly", priority: 0.8 },
      { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
      { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    ];

    const docPages: MetadataRoute.Sitemap = [];
    for (const section of sections) {
      for (const page of section.pages) {
        docPages.push({
          url: `${BASE_URL}/docs/${section.slug}/${page.slug}`,
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    }

    const blogPostPages = getAllPosts().map(post => ({
      url: `${BASE_URL}/newsroom/${post.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

    const blogCategoryPages = categories.map(cat => ({
      url: `${BASE_URL}/newsroom/category/${cat.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

    const blogTagPages = getAllTags().map(tagSlug => ({
      url: `${BASE_URL}/newsroom/tag/${tagSlug}`,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    }));

    // Sector landing pages
    const sectorPages = ALL_SECTORS.map(s => ({
      url: `${BASE_URL}/c/${s}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    return [...staticPages, ...docPages, ...blogPostPages, ...blogCategoryPages, ...blogTagPages, ...sectorPages];
  }

  // Sector-specific sitemap: brand pages + sub-sector pages for this sector
  const sector = id;

  try {
    const [brands, subSectorCounts] = await Promise.all([
      storage.searchBrands({
        sectors: [sector],
        maturities: ["verified", "official", "beta", "community"],
        limit: 10000,
        sortBy: "name",
        sortDir: "asc",
        lite: true,
      }),
      storage.getSubSectorCounts(sector),
    ]);

    const brandUrls: MetadataRoute.Sitemap = brands.map(b => ({
      url: `${BASE_URL}/skills/${b.slug}`,
      lastModified: b.updatedAt ?? undefined,
      changeFrequency: "weekly",
      priority: b.maturity === "verified" || b.maturity === "official" ? 0.8 : 0.7,
    }));

    const subSectorUrls: MetadataRoute.Sitemap = subSectorCounts.map(sc => ({
      url: `${BASE_URL}/c/${sector}/${slugify(sc.subSector)}`,
      changeFrequency: "weekly",
      priority: 0.5,
    }));

    return [...brandUrls, ...subSectorUrls];
  } catch {
    return [];
  }
}
```

#### C2. URL structure produced

```
/sitemap.xml           → sitemap index (auto-generated by Next.js)
/sitemap/pages.xml     → static pages, docs, blog, sector landing pages
/sitemap/office.xml    → brand pages in office sector + office sub-sector pages
/sitemap/electronics.xml  → brand pages in electronics sector + sub-sector pages
/sitemap/retail.xml    → brand pages in retail sector + sub-sector pages
... (one per sector)
```

Next.js auto-generates the sitemap index XML at `/sitemap.xml` that references each sub-sitemap. No manual index file needed.

#### C3. robots.txt update

If a `robots.txt` exists, ensure it points to `/sitemap.xml` (the index). No change needed if it already does — Next.js serves the index at the same URL.

### Files touched

| Operation | File | Description |
|---|---|---|
| Rewrite | `app/sitemap.ts` | Convert to `generateSitemaps()` + per-sector sitemaps |

### Risk assessment

- **Low risk** — the sitemap URL stays `/sitemap.xml`. Google re-crawls automatically.
- **Depends on Part B**: The sector sitemaps include sub-sector page URLs, so `getSubSectorCounts` must exist first. If Part C is built before Part B, simply omit sub-sector URLs from the sector sitemaps and add them when Part B ships.
- **Empty sectors**: Sectors with 0 brands produce an empty sitemap XML. This is harmless — Google handles empty sitemaps gracefully.

---

## Build order

```
Part A (vendor table removal)
  ↓
Part B (sub-sector pages) ←→ Part C (sitemap splitting)
         (can be parallel)
```

Part A goes first because it's pure cleanup — removing dead code before adding new code keeps the codebase clean. Parts B and C are independent of each other but both depend on `getSubSectorCounts` from Part B's storage work. Practically:

1. **Part A** — Remove vendors table, storage, types. ~30 minutes.
2. **Part B** — Add slugify utility, `getSubSectorCounts` storage method, `subSectorExact` filter, sub-sector page component, update sector page. ~1-2 hours.
3. **Part C** — Rewrite `sitemap.ts` to use `generateSitemaps()`. ~30 minutes.

### Testing checklist

- [ ] Build succeeds with no TypeScript errors after vendor table removal
- [ ] `/api/v1/vendors` still works (reads from `brand_index`)
- [ ] Each sector page still renders at `/c/[sector]`
- [ ] Sub-sector pages render at `/c/[sector]/[subSector]` with correct brands
- [ ] Sub-sector pages return 404 for invalid sub-sector slugs
- [ ] `generateStaticParams` produces correct params for all sub-sectors
- [ ] `/sitemap.xml` returns a valid sitemap index
- [ ] Each `/sitemap/[id].xml` returns valid sitemap entries
- [ ] Sub-sector URLs appear in the sector-specific sitemaps
- [ ] Sector pages show sub-sector grouping and navigation chips
