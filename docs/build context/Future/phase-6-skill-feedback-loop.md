# Phase 6: Skill Feedback Loop + Brand Page SSR

## Status: Not started (depends on Phase 5 ✅)

## Summary

Two goals in one phase:

1. **SSR for SEO** — Convert the brand catalog (`/skills`) and brand detail (`/skills/[vendor]`) pages from client-rendered to server-rendered so search engines see real content, proper titles, OG tags, and structured data.
2. **Feedback loop** — Agents and humans rate brands after purchases. Three sub-ratings (search accuracy, stock reliability, checkout completion) feed into weighted aggregated scores on `brand_index`. The feedback endpoint is described directly in every SKILL.md — agents read the instruction and POST three ratings, no SDK required. Humans rate via a dashboard prompt after completed purchases.

SSR is sequenced first because it's independently valuable and the feedback ratings will display on already-SSR'd pages.

---

## Part A: SSR for SEO (Brand Pages)

### Why this matters

Both `/skills` and `/skills/[vendor]` are currently fully client-rendered (`"use client"` at line 1). Search engines see an empty `<div>` with a loading spinner. Meanwhile, the newsroom pages (`/newsroom/[slug]`) already have proper `generateMetadata()` and `generateStaticParams()`, demonstrating the pattern.

Every brand detail page should be indexable with:
- Proper `<title>` and `<meta description>` tags
- Open Graph and Twitter Card metadata (brand name, description, sector, capabilities)
- Pre-rendered content visible to crawlers
- Only interactive parts (claim button, copy URL, skill preview toggle) hydrated as client components

### Step A1: Convert brand detail page to server component

**Edit:** `app/skills/[vendor]/page.tsx` (785 lines)

**Architecture change:** Split into a server component (page) + client components (interactive pieces).

#### A1a. Create the server page

Remove `"use client"` from the top. The page becomes a Next.js server component that:

1. Calls `getBrand(slug)` directly (no API fetch needed — server components can access the DB)
2. Casts `brand.brandData` to `VendorSkill` for display
3. Returns `notFound()` if the brand doesn't exist
4. Renders all static content server-side (name, description, capabilities, checkout methods, taxonomy, search/shipping/deals panels, metadata sidebar)
5. Renders interactive pieces as imported client components

**Critical: deduplicate the DB query.** Both `generateMetadata()` and the page function need the same brand data. Next.js deduplicates `fetch()` calls automatically, but NOT direct database queries. Use React's `cache()` to avoid hitting the DB twice per request:

```tsx
import { cache } from "react";
import { notFound } from "next/navigation";
import { storage } from "@/server/storage";
import type { Metadata } from "next";
import type { BrandIndex } from "@/shared/schema";
import type { VendorSkill } from "@/lib/procurement-skills/types";
import { BrandClaimButton } from "./brand-claim-button";
import { SkillPreviewPanel } from "./skill-preview-panel";
import { CopySkillUrl } from "./copy-skill-url";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";

const getBrand = cache(async (slug: string) => {
  return storage.getBrandBySlug(slug);
});

interface Props {
  params: Promise<{ vendor: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vendor: slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) return {};

  const friendliness = Math.min(Math.floor((brand.agentReadiness ?? 0) / 20) + 1, 5);
  const capabilities = (brand.capabilities ?? []).slice(0, 5).join(", ");

  return {
    title: `${brand.name} — Agent Procurement Skill | CreditClaw`,
    description: `${brand.name} agent friendliness: ${friendliness}/5. Checkout methods: ${(brand.checkoutMethods ?? []).join(", ")}. Capabilities: ${capabilities}. ${brand.description || ""}`.slice(0, 160),
    openGraph: {
      title: `${brand.name} — Procurement Skill for AI Agents`,
      description: `Agent-ready procurement skill for ${brand.name}. Sector: ${brand.sector}. Maturity: ${brand.maturity}.`,
      type: "website",
      url: `${BASE_URL}/skills/${brand.slug}`,
    },
    twitter: {
      card: "summary",
      title: `${brand.name} — CreditClaw Procurement Skill`,
      description: `Agent friendliness: ${friendliness}/5. ${(brand.checkoutMethods ?? []).length} checkout methods available.`,
    },
    alternates: {
      canonical: `${BASE_URL}/skills/${brand.slug}`,
    },
  };
}

export default async function VendorDetailPage({ params }: Props) {
  const { vendor: slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) notFound();

  const vendor = brand.brandData as unknown as VendorSkill;
  const friendliness = Math.min(Math.floor((brand.agentReadiness ?? 0) / 20) + 1, 5);
  // ... render all static panels server-side
  // ... render <BrandClaimButton slug={brand.slug} /> (client component)
  // ... render <SkillPreviewPanel skillMd={skillMd} slug={brand.slug} /> (client component)
  // ... render <CopySkillUrl url={skillUrl} /> (client component)
}
```

**Why `cache()` is needed:** Without it, `generateMetadata` and the page function each call `storage.getBrandBySlug(slug)` independently — two identical DB queries per page load. React's `cache()` deduplicates within a single server request, so the second call returns the cached result. This matches the recommended Next.js pattern for sharing data between `generateMetadata` and page components.

**`use(params)` → `await params`:** The current client component uses React 19's `use()` hook to unwrap the params promise. In server components, this becomes a standard `await`. The newsroom pages already use this exact pattern.

#### A1b. Extract client components

Create three small client component files in `app/skills/[vendor]/`:

| File | Purpose | Interactive state |
|---|---|---|
| `brand-claim-button.tsx` | Claim ownership button | Auth check, claim API call, status display |
| `skill-preview-panel.tsx` | Expand/collapse skill markdown + download | Toggle state, blob download |
| `copy-skill-url.tsx` | Copy skill URL to clipboard | Clipboard API, "Copied!" feedback |

These are extracted from the current monolithic page. Each starts with `"use client"` and receives only serializable props (strings, not objects with methods).

#### A1c. Add `generateStaticParams` (optional, recommended)

For brands with `maturity` of "verified" or "official", pre-generate static pages at build time:

```tsx
export async function generateStaticParams() {
  const brands = await storage.searchBrands({
    maturities: ["verified", "official"],
    limit: 500,
  });
  return brands.map(b => ({ vendor: b.slug }));
}
```

This gives verified brands instant-load static pages. Other brands (draft, community, beta) are rendered on-demand with ISR.

### Step A2: Full SSR for catalog page with URL-based filter state

**Status:** Part A originally shipped with the layout-only approach. This step replaces that with full SSR.

**Refactor:** `app/skills/page.tsx` (670 lines) — convert from fully client-rendered to server component with URL-based filter state.

**Why full SSR:** The layout-only approach gave crawlers a title and description but an empty brand grid. With full SSR, crawlers see the actual brand cards in the HTML. Each filter combination becomes a unique, indexable URL (e.g., `/skills?sector=office`, `/skills?q=amazon`).

#### Architecture

```
page.tsx (server component)
|- reads searchParams -> builds filter object
|- calls storage.searchBrands() directly (no API hop)
|- calls storage.getAllBrandFacets() for filter options
|- renders brand card grid server-side (VendorCard is a plain function, not a client component)
|- has generateMetadata() that reflects current filters
|
|- vendor-card.tsx (shared, no "use client" — plain JSX)
|   - extracted so both page.tsx and catalog-load-more.tsx can import it
|
|- catalog-search.tsx (client component)
|   - search input with 300ms debounce
|   - on change: router.replace('/skills?q=...' + existing params)
|
|- catalog-filters.tsx (client component)
|   - receives facets + currentFilters as props
|   - checkbox toggles -> router.replace() with updated params
|   - mobile filter drawer state (useState, not URL-based)
|   - "Clear all filters" button
|   - useTransition() for non-blocking loading indicator
|
|- catalog-load-more.tsx (client component)
    - receives total, currentCount, currentFilters as props
    - "Load more" button fetches next page from /api/internal/brands/search
    - appends results to local state
    - renders additional VendorCard instances client-side
```

**Key insight:** `"use client"` components are still SSR'd by Next.js — the directive means "this component hydrates on the client," not "skip server rendering." So even the initial render of client components produces HTML on the server.

**"Load more" stays client-side:** Every filter/search change triggers a server re-render via URL params. But "load more" is progressive enhancement — it fetches additional pages from the internal API and appends client-side. Crawlers don't click "load more," so this doesn't hurt SEO. The first 50 brands are in the HTML; that's what matters.

#### A2a. Server page structure

Remove `"use client"` from `app/skills/page.tsx`. The page becomes an async server component:

```tsx
import { storage } from "@/server/storage";
import type { Metadata } from "next";
import type { BrandSearchFilters } from "@/server/storage/brand-index";
import type { BrandIndex } from "@/shared/schema";
import { CatalogSearch } from "./catalog-search";
import { CatalogFilters } from "./catalog-filters";
import { CatalogLoadMore } from "./catalog-load-more";
import { VendorCard } from "./vendor-card";
// ... other imports

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";
const PAGE_SIZE = 50;

interface CatalogSearchParams {
  q?: string;
  sector?: string;
  tier?: string;
  checkout?: string;
  capability?: string;
  maturity?: string;
}

function parseCSV(val?: string): string[] {
  if (!val) return [];
  return val.split(",").map(s => s.trim()).filter(Boolean);
}

function buildFilters(params: CatalogSearchParams): BrandSearchFilters {
  return {
    q: params.q || undefined,
    sectors: parseCSV(params.sector).length ? parseCSV(params.sector) : undefined,
    tiers: parseCSV(params.tier).length ? parseCSV(params.tier) : undefined,
    checkoutMethods: parseCSV(params.checkout).length ? parseCSV(params.checkout) : undefined,
    capabilities: parseCSV(params.capability).length ? parseCSV(params.capability) : undefined,
    maturities: parseCSV(params.maturity).length ? parseCSV(params.maturity) : undefined,
    limit: PAGE_SIZE,
    offset: 0,
    sortBy: "readiness",
    sortDir: "desc",
  };
}

interface Props {
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;

  if (params.sector) {
    const sectorLabel = SECTOR_LABELS[params.sector as VendorSector] ?? params.sector;
    return {
      title: `${sectorLabel} Procurement Skills | CreditClaw`,
      description: `Browse AI agent procurement skills for ${sectorLabel} vendors. Filter by checkout method, capability, and agent friendliness.`,
      alternates: { canonical: `${BASE_URL}/skills` },
    };
  }

  if (params.q) {
    return {
      title: `Search: "${params.q}" - Vendor Skills | CreditClaw`,
      description: `Search results for "${params.q}" in the CreditClaw procurement skills catalog.`,
      alternates: { canonical: `${BASE_URL}/skills` },
    };
  }

  // Default metadata (same content that was in layout.tsx)
  return {
    title: "Skill Index - AI Agent Procurement Skills | CreditClaw",
    description: "Browse procurement skills that teach AI agents how to shop at 50+ vendors. Filter by category, checkout method, and agent friendliness score.",
    openGraph: {
      title: "Skill Index - AI Agent Procurement Skills",
      description: "Browse procurement skills that teach AI agents how to shop at 50+ vendors.",
      type: "website",
      url: `${BASE_URL}/skills`,
    },
    twitter: {
      card: "summary",
      title: "Skill Index - CreditClaw",
      description: "Browse procurement skills that teach AI agents how to shop at 50+ vendors.",
    },
    alternates: { canonical: `${BASE_URL}/skills` },
  };
}

export default async function SkillsCatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters = buildFilters(params);

  const [brands, total, facets] = await Promise.all([
    storage.searchBrands(filters),
    storage.searchBrandsCount(filters),
    storage.getAllBrandFacets(),
  ]);

  // Group brands by sector (same logic as current page)
  const grouped: Record<string, BrandIndex[]> = {};
  for (const b of brands) {
    if (!grouped[b.sector]) grouped[b.sector] = [];
    grouped[b.sector].push(b);
  }

  const currentFilters = {
    search: params.q ?? "",
    sectors: parseCSV(params.sector),
    tiers: parseCSV(params.tier),
    checkoutMethods: parseCSV(params.checkout),
    capabilities: parseCSV(params.capability),
    maturity: parseCSV(params.maturity),
  };

  const verifiedCount = brands.filter(b => b.maturity === "verified").length;

  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <Nav />
      <main>
        {/* Hero section with stats - SERVER RENDERED with real data */}
        <section className="relative py-20 overflow-hidden">
          {/* background blurs */}
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-12">
              {/* heading, pill badge */}
              <p>Curated procurement skills... {total}+ vendors.</p>
            </div>
            <CatalogSearch initialValue={params.q ?? ""} />
            <div className="flex items-center justify-center gap-4 text-sm">
              <span>{total} vendors</span>
              <span>{verifiedCount} verified</span>
              <span>{facets.sectors.length} sectors</span>
              <span>{facets.tiers.length} tiers</span>
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-6">
            <div className="flex gap-8">
              <CatalogFilters facets={facets} currentFilters={currentFilters} />

              <div className="flex-1 min-w-0">
                {Object.keys(grouped).length === 0 ? (
                  <div className="text-center py-20">
                    <h3>No vendors found</h3>
                    {/* CatalogFilters includes clear-all, or inline link */}
                  </div>
                ) : (
                  <div className="space-y-10">
                    {Object.entries(grouped).map(([sector, sectorBrands]) => (
                      <div key={sector}>
                        <h2>{SECTOR_LABELS[sector] ?? sector} ({sectorBrands.length})</h2>
                        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                          {sectorBrands.map(b => <VendorCard key={b.slug} brand={b} />)}
                        </div>
                      </div>
                    ))}
                    <CatalogLoadMore
                      total={total}
                      currentCount={brands.length}
                      filters={currentFilters}
                    />
                  </div>
                )}
              </div>
            </div>
            {/* Bot Discovery API promo - server rendered */}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
```

#### A2b. Client components to extract

| File | Purpose | Interactive state |
|---|---|---|
| `app/skills/vendor-card.tsx` | Brand card (Link + badges + stars) | None — plain JSX, no `"use client"` |
| `app/skills/catalog-search.tsx` | Search input with 300ms debounce | `useState` for input value, `useRouter().replace()` to update `?q=` |
| `app/skills/catalog-filters.tsx` | Filter sidebar + mobile drawer + clear button | `useSearchParams()` to read current filters, `useRouter().replace()` to toggle, `useTransition()` for loading state, `useState` for mobile drawer |
| `app/skills/catalog-load-more.tsx` | "Load more" pagination | `useState` for extra brands, `fetch()` to internal API with offset |

**Props crossing the server/client boundary — all serializable:**

| Component | Props | Types |
|---|---|---|
| `VendorCard` | `brand: BrandIndex` | Drizzle row object (strings, numbers, arrays, null) |
| `CatalogSearch` | `initialValue: string` | string |
| `CatalogFilters` | `facets: { sectors: string[]; tiers: string[]; categories: string[] }`, `currentFilters: { search: string; sectors: string[]; tiers: string[]; ... }` | plain objects |
| `CatalogLoadMore` | `total: number`, `currentCount: number`, `filters: { ... }` | numbers + plain object |

#### A2c. UX: filter interactions with useTransition

Each checkbox click triggers `router.replace()` -> soft navigation -> server re-render. Use `useTransition()` for non-blocking loading indicator:

```tsx
// In catalog-filters.tsx:
"use client";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function CatalogFilters({ facets, currentFilters }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showMobile, setShowMobile] = useState(false);

  const toggleFilter = (paramKey: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get(paramKey)?.split(",").filter(Boolean) ?? [];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    if (next.length) params.set(paramKey, next.join(","));
    else params.delete(paramKey);

    startTransition(() => {
      router.replace(`/skills?${params.toString()}`, { scroll: false });
    });
  };

  const clearAll = () => {
    startTransition(() => {
      router.replace("/skills", { scroll: false });
    });
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:block w-64 flex-shrink-0 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
        {/* filter groups using facets + currentFilters for checked state */}
      </aside>

      {/* Mobile drawer toggle + drawer */}
      {/* ... uses showMobile state ... */}
    </>
  );
}
```

**Note on `useSearchParams()` and Suspense:** Next.js requires components using `useSearchParams()` to be wrapped in a `<Suspense>` boundary during static rendering. Since our page is dynamic (it reads `searchParams` prop), this isn't an issue. But if we ever add `export const dynamic = "force-static"`, we'd need Suspense boundaries around `CatalogSearch` and `CatalogFilters`.

#### A2d. Search input debounce

```tsx
// In catalog-search.tsx:
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function CatalogSearch({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Sync with server-provided value when URL changes externally
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("q", value);
      else params.delete("q");
      router.replace(`/skills?${params.toString()}`, { scroll: false });
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value]);

  return <Input value={value} onChange={e => setValue(e.target.value)} ... />;
}
```

#### A2e. "Load more" — stays client-side

```tsx
// catalog-load-more.tsx
"use client";
import { useState } from "react";
import type { BrandIndex } from "@/shared/schema";
import { VendorCard } from "./vendor-card";

interface Props {
  total: number;
  currentCount: number;
  filters: { search: string; sectors: string[]; tiers: string[]; checkoutMethods: string[]; capabilities: string[]; maturity: string[] };
}

export function CatalogLoadMore({ total, currentCount, filters }: Props) {
  const [extraBrands, setExtraBrands] = useState<BrandIndex[]>([]);
  const [loading, setLoading] = useState(false);
  const [extraBrandsGrouped, setExtraBrandsGrouped] = useState<Record<string, BrandIndex[]>>({});

  // Reset extra brands when filters change (server will re-render with new initial set)
  // This happens automatically: when searchParams change, the page re-renders,
  // CatalogLoadMore unmounts and remounts with new props (currentCount resets to the new batch size)

  if (total <= currentCount + extraBrands.length) return null;

  const loadMore = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.set("q", filters.search);
    if (filters.sectors.length) params.set("sector", filters.sectors.join(","));
    if (filters.tiers.length) params.set("tier", filters.tiers.join(","));
    if (filters.checkoutMethods.length) params.set("checkout", filters.checkoutMethods.join(","));
    if (filters.capabilities.length) params.set("capability", filters.capabilities.join(","));
    if (filters.maturity.length) params.set("maturity", filters.maturity.join(","));
    params.set("offset", String(currentCount + extraBrands.length));
    params.set("limit", "50");

    const res = await fetch(`/api/internal/brands/search?${params}`);
    const data = await res.json();
    const newBrands = data.brands ?? [];
    setExtraBrands(prev => [...prev, ...newBrands]);
    setLoading(false);
  };

  return (
    <div>
      {/* Render extra brands grouped by sector, same layout as server grid */}
      {extraBrands.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
          {extraBrands.map(b => <VendorCard key={b.slug} brand={b} />)}
        </div>
      )}
      <div className="flex justify-center mt-8">
        <Button onClick={loadMore} disabled={loading} data-testid="button-load-more">
          {loading ? "Loading..." : `Load more (${currentCount + extraBrands.length} of ${total})`}
        </Button>
      </div>
    </div>
  );
}
```

#### A2f. VendorCard extraction

Extract `VendorCard` to `app/skills/vendor-card.tsx` — no `"use client"` directive. It's a pure render function (just JSX + a `<Link>`). Both the server page and `CatalogLoadMore` import it.

The existing constants (`MATURITY_CONFIG`, `CATEGORY_ICONS`, `CHECKOUT_ICONS`) should also move to this file or a shared constants file, since they're needed by `VendorCard`.

**Note:** `CATEGORY_ICONS` and `CHECKOUT_ICONS` use lucide-react JSX elements. These are fine in server components — lucide-react components are server-safe. When imported by the client component `CatalogLoadMore`, they'll be included in the client bundle.

#### A2g. Layout cleanup

The existing `app/skills/layout.tsx` has static metadata that's now superseded by the page's `generateMetadata()`. Two options:

1. **Remove metadata from layout** — keep layout only as a structural wrapper (currently just `return children`)
2. **Delete layout entirely** — since it does nothing useful

**Recommendation:** Keep the layout file (it's a good place to add shared structure later, e.g., a breadcrumb or subnav). Remove the `metadata` export since the page provides it dynamically.

#### A2h. What crawlers see after this change

| URL | Crawler sees |
|---|---|
| `/skills` | Full grid of first 50 brands grouped by sector, stats line (N vendors, N verified, N sectors), hero text, Bot API section |
| `/skills?sector=office` | Office sector brands only, `<title>` = "Office Supplies Procurement Skills \| CreditClaw" |
| `/skills?q=amazon` | Search results for "amazon", `<title>` = "Search: amazon - Vendor Skills \| CreditClaw" |
| `/skills?checkout=native_api` | Brands with native API checkout, filtered grid with proper metadata |
| `/skills?tier=enterprise` | Enterprise tier brands only |

Each filter combination has proper `<title>`, `<meta description>`, OG tags, and a **visible, rendered brand grid** in the HTML.

#### A2i. Implementation notes

1. **`numeric` columns return strings.** `brand.agentReadiness` comes from a `numeric()` column. The `VendorCard` already does `Math.floor((brand.agentReadiness ?? 0) / 20)` which coerces to number via math ops. But explicit `Number()` is safer: `Number(brand.agentReadiness ?? 0)`.

2. **No skeleton loader needed for initial render.** The server component fetches data before rendering. The first paint includes the full grid — no loading spinner. Skeleton is only relevant during soft navigation (filter/search changes), and that's handled by `useTransition()` opacity dimming.

3. **The internal search API route stays unchanged.** It's still used by `CatalogLoadMore` for pagination. The server page bypasses it by calling `storage.searchBrands()` directly.

4. **Filter param keys map directly to API params.** The URL uses `?sector=office&checkout=native_api` — same keys as the internal API. This is intentional for consistency.

5. **`categories` filter is currently a separate concept from `sectors`.** The filter sidebar has both "Sector" (from facets) and "Category" (from the CATEGORY_LABELS constant). In the current client page, categories and sectors are merged: `[...new Set([...filters.sectors, ...filters.categories])]` before sending as `sector` param. The server page should handle this the same way — both map to the `sectors` field in `BrandSearchFilters`.

### Step A3: Add JSON-LD structured data to brand detail pages

Add structured data for search engine rich results. Append to the brand detail server component:

```tsx
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `${brand.name} Procurement Skill`,
  description: brand.description,
  url: `${BASE_URL}/skills/${brand.slug}`,
  applicationCategory: "AI Agent Tool",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: brand.agentReadiness ? {
    "@type": "AggregateRating",
    ratingValue: friendliness,
    bestRating: 5,
    worstRating: 1,
  } : undefined,
};

// In the return JSX:
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
/>
```

### Step A4: Update sitemap

**Edit:** `app/sitemap.ts`

The current sitemap function is **synchronous** — it reads blog posts and doc sections from in-memory arrays. Adding brand pages requires a DB call, which means the function must become `async`. Next.js supports `async function sitemap()`.

```tsx
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ... existing static pages, doc pages, blog pages (unchanged)

  // NEW: brand detail pages from DB
  const { storage } = await import("@/server/storage");
  const brands = await storage.searchBrands({
    maturities: ["verified", "official"],
    limit: 500,
    sortBy: "name",
    sortDir: "asc",
  });

  const brandPages: MetadataRoute.Sitemap = brands.map(b => ({
    url: `${BASE_URL}/skills/${b.slug}`,
    lastModified: b.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...docPages, ...blogPostPages, ...blogCategoryPages, ...blogTagPages, ...brandPages];
}
```

**Breaking change:** The return type changes from implicit `MetadataRoute.Sitemap` to `Promise<MetadataRoute.Sitemap>`. This is fine — Next.js handles both sync and async sitemap functions. No consumers call this function directly; Next.js invokes it at `/sitemap.xml`.

**Dynamic import for storage:** Using `await import("@/server/storage")` instead of a top-level import keeps the existing sync code path from breaking if the storage module has initialization side effects. Alternatively, a top-level import works too since this file only runs server-side.

---

## Part B: Feedback Loop (from source spec)

### Source document

The full technical spec is in `docs/build context/Future/skill-feedback-loop(1).md`. This section summarizes the key implementation steps.

### Step B1: `brand_feedback` table — schema + migration

**Edit:** `shared/schema.ts`

Add the feedback table:

```tsx
export const brandFeedback = pgTable("brand_feedback", {
  id: serial("id").primaryKey(),
  brandSlug: text("brand_slug").notNull(),
  source: text("source").notNull().default("agent"),
  authenticated: boolean("authenticated").notNull().default(false),
  botId: text("bot_id"),
  reviewerUid: text("reviewer_uid"),
  searchAccuracy: integer("search_accuracy").notNull(),
  stockReliability: integer("stock_reliability").notNull(),
  checkoutCompletion: integer("checkout_completion").notNull(),
  checkoutMethod: text("checkout_method").notNull(),
  outcome: text("outcome").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("brand_feedback_slug_idx").on(table.brandSlug),
  index("brand_feedback_created_idx").on(table.createdAt),
  index("brand_feedback_slug_recent_idx").on(table.brandSlug, table.createdAt),
]);

export type BrandFeedback = typeof brandFeedback.$inferSelect;
export type InsertBrandFeedback = typeof brandFeedback.$inferInsert;
```

**Validation schema:**

```tsx
export const insertBrandFeedbackSchema = z.object({
  brandSlug: z.string().min(1),
  searchAccuracy: z.number().int().min(1).max(5),
  stockReliability: z.number().int().min(1).max(5),
  checkoutCompletion: z.number().int().min(1).max(5),
  checkoutMethod: z.enum(["native_api", "browser_automation", "x402", "acp", "self_hosted_card", "crossmint_world"]),
  outcome: z.enum(["success", "checkout_failed", "search_failed", "out_of_stock", "price_mismatch", "flow_changed"]),
  comment: z.string().max(500).optional(),
});
```

**⚠️ Verified against codebase:** The `CheckoutMethod` type in `lib/procurement-skills/taxonomy/checkout-methods.ts` uses `"x402"` (NOT `"x402_protocol"` — that value only appears in planning docs). Also includes `"crossmint_world"` which was missing from the original plan.

Run Drizzle migration: `npx drizzle-kit generate` + `npx drizzle-kit push`

### Step B2: Rating columns on `brand_index`

**Edit:** `shared/schema.ts` — add nullable rating columns to `brandIndex`:

```tsx
ratingSearchAccuracy: numeric("rating_search_accuracy"),
ratingStockReliability: numeric("rating_stock_reliability"),
ratingCheckoutCompletion: numeric("rating_checkout_completion"),
ratingOverall: numeric("rating_overall"),
ratingCount: integer("rating_count").default(0),
```

These stay `null` until a brand has 5+ weighted feedback events.

### Step B3: Storage layer for feedback

**Create:** `server/storage/brand-feedback.ts`

Methods:
- `createBrandFeedback(data: InsertBrandFeedback & { source: string; authenticated: boolean; botId?: string; reviewerUid?: string }): Promise<BrandFeedback>`
- `getBrandFeedback(brandSlug: string, limit?: number): Promise<BrandFeedback[]>`
- `getBrandFeedbackCount(brandSlug: string): Promise<number>`
- `getRecentFeedbackByBot(brandSlug: string, botId: string, windowHours?: number): Promise<BrandFeedback | null>` — for rate limiting

Add to `IStorage` in `server/storage/types.ts` and compose in `server/storage/index.ts`.

### Step B4: Feedback API endpoint

**Create:** `app/api/v1/bot/skills/[slug]/feedback/route.ts`

```
POST /api/v1/bot/skills/{slug}/feedback
```

**⚠️ Auth approach — DO NOT use `withBotApi` middleware.** `withBotApi` (from `lib/agent-management/agent-api/middleware.ts`) returns 401 for unauthenticated requests — it enforces auth. This endpoint needs to accept anonymous feedback too. Instead, manually call `authenticateBot(request)` from `lib/agent-management/auth.ts`:

```tsx
import { authenticateBot } from "@/lib/agent-management/auth";

const bot = await authenticateBot(request);
const authenticated = !!bot;
const botId = bot?.botId ?? null;
const source = bot ? "agent" : "anonymous_agent";
```

This gracefully handles both cases: if a valid Bearer token is present, the feedback is attributed to the bot. If absent or invalid, it's accepted anonymously.

**For human feedback (Step B9):** The same endpoint needs to also accept Firebase session auth. Check for session cookie if no Bearer token is present:

```tsx
if (!bot) {
  const user = await getCurrentUser();
  if (user) {
    source = "human";
    authenticated = true;
    reviewerUid = user.uid;
  }
}
```

**Request body:** As defined in the insert schema (Step B1).

**⚠️ API body key format:** The Zod schema uses camelCase (`searchAccuracy`, `stockReliability`, `checkoutCompletion`) because Drizzle maps these to snake_case columns automatically. The SKILL.md in Step B5 must instruct agents to send camelCase keys — OR — the endpoint must accept snake_case keys and transform them. **Recommendation:** Accept snake_case in the API body (agent-facing), transform to camelCase before Zod validation. This keeps the agent-facing API consistent with the bot skills API convention (which uses snake_case throughout — see `app/api/v1/bot/skills/route.ts` response format).

```tsx
const body = await request.json();
const normalized = {
  brandSlug: slug,
  searchAccuracy: body.search_accuracy ?? body.searchAccuracy,
  stockReliability: body.stock_reliability ?? body.stockReliability,
  checkoutCompletion: body.checkout_completion ?? body.checkoutCompletion,
  checkoutMethod: body.checkout_method ?? body.checkoutMethod,
  outcome: body.outcome,
  comment: body.comment,
};
const parsed = insertBrandFeedbackSchema.safeParse(normalized);
```

**Logic:**
1. Validate `slug` exists in `brand_index`
2. Normalize and validate request body with `insertBrandFeedbackSchema`
3. Rate limit: if authenticated bot, check `getRecentFeedbackByBot(slug, botId, 1)` — max 1 per brand per bot per hour. If anonymous, apply IP-based rate limiting (max 5 per hour per IP per brand)
4. Insert into `brand_feedback` with `source`, `authenticated`, `botId`, `reviewerUid`
5. Return `{ received: true, brand_slug: slug, message: "Thanks — this feedback improves the skill for all agents." }`

### Step B5: Feedback section in `generateVendorSkill()`

**Edit:** `lib/procurement-skills/generator.ts`

Append a feedback section at the end of every generated SKILL.md, **after** the Metadata section (currently the last section, ending at line ~200). The generator constructs a template literal — add the new section before the closing backtick:

```typescript
// In generator.ts, at line ~200, before the closing backtick:
---

## Feedback

After your purchase attempt (successful or not), help improve this skill:

POST https://creditclaw.com/api/v1/bot/skills/${vendor.slug}/feedback
Authorization: Bearer <your-creditclaw-api-key>
Content-Type: application/json

{
  "search_accuracy": 4,
  "stock_reliability": 5,
  "checkout_completion": 3,
  "checkout_method": "browser_automation",
  "outcome": "success",
  "comment": "optional — what happened?"
}

Ratings are 1-5. Outcome is one of: success, checkout_failed, search_failed, out_of_stock, price_mismatch, flow_changed.
Checkout method is one of: native_api, browser_automation, x402, acp, self_hosted_card, crossmint_world.
Authorization header is optional but improves rating weight.
This is optional but helps other agents find reliable vendors.
```

**⚠️ Key format:** Uses snake_case (`search_accuracy`, not `searchAccuracy`) to match the existing bot API convention. The endpoint normalizes to camelCase before validation (see Step B4).

**⚠️ Side effect:** This changes every generated SKILL.md. After updating the generator, re-run the seed script to regenerate `skill_md` in `brand_index`:
```bash
npx tsx scripts/seed-brand-index.ts
```
This script already exists and handles regeneration. The bot skill endpoint (`/api/v1/bot/skills/[vendor]`) returns `brand.skillMd` directly, so the updated markdown is immediately served to agents.

**⚠️ Existing skills in the wild:** Agents that have already fetched and cached the old SKILL.md won't see the feedback section until they re-fetch. The `Cache-Control: public, max-age=3600, s-maxage=86400` header on the skill endpoint means CDN caches will refresh within 24 hours.

### Step B6: Aggregation job

**Create:** `lib/feedback/aggregate.ts`

A function (callable via API route or cron) that:

1. Pulls all feedback rows from the last 90 days per brand
2. Applies recency weighting (this week = full weight, 2 months ago = reduced)
3. Applies source weighting:
   - Authenticated agent: 1.0
   - Anonymous agent: 0.5
   - Human: 2.0
4. Computes weighted average for each sub-rating
5. `rating_overall` = average of three sub-ratings
6. `rating_count` = raw count of feedback events
7. Only writes non-null ratings when count >= 5 weighted events
8. Updates `brand_index` row

**Create:** `app/api/internal/feedback/aggregate/route.ts`

A POST endpoint (internal, no auth needed) that triggers aggregation for all brands or a specific slug. Can be called by a cron job or manually.

### Step B7: Rating display on brand detail page

**Edit:** the server component from Step A1.

Add a ratings panel to the brand detail page. Only renders when `brand.ratingOverall` is non-null:

```tsx
{brand.ratingOverall && (
  <div className="bg-white rounded-2xl border border-neutral-100 p-6 mb-8">
    <h3 className="font-bold text-neutral-900 mb-4">Agent Ratings</h3>
    <div className="grid grid-cols-3 gap-4">
      <RatingBar label="Search Accuracy" value={brand.ratingSearchAccuracy} />
      <RatingBar label="Stock Reliability" value={brand.ratingStockReliability} />
      <RatingBar label="Checkout Completion" value={brand.ratingCheckoutCompletion} />
    </div>
    <p className="text-xs text-neutral-500 mt-3">
      Based on {brand.ratingCount} feedback events from agents and humans.
    </p>
  </div>
)}
```

Also add ratings to the catalog cards on `/skills` — show the overall rating alongside the agent friendliness score.

### Step B8: Rating display on catalog cards

**Edit:** `app/skills/page.tsx` — `VendorCard` component

Add a small rating indicator when `brand.ratingOverall` is non-null:

```tsx
{brand.ratingOverall && (
  <div className="flex items-center gap-1 text-xs">
    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
    <span className="font-semibold text-neutral-700">
      {Number(brand.ratingOverall).toFixed(1)}
    </span>
    <span className="text-neutral-400">({brand.ratingCount})</span>
  </div>
)}
```

### Step B9: Human feedback UI (dashboard)

**Create:** `components/dashboard/purchase-feedback-prompt.tsx`

After a checkout session completes through CreditClaw (any rail), show a non-blocking prompt on the dashboard:

- "Your agent bought from {brand}. How did it go?"
- Three star rating rows (search accuracy, stock reliability, checkout completion)
- Optional comment field
- Submit button → `POST /api/v1/bot/skills/{slug}/feedback` with `source: "human"`
- Dismissable, doesn't block anything
- Only shows for transactions completed in the last 48 hours that haven't been rated yet

Implementation detail: Store a `feedbackSubmitted` boolean on the transaction/order record, or check `brand_feedback` for the reviewer's UID + brand slug within the relevant time window.

### Step B10: Bot API — include ratings in skill response

**Edit:** `app/api/v1/bot/skills/route.ts` — `brandToVendorResponse()` function (line ~66)

Add a `ratings` field to the response object. The rating columns are `numeric` type in Postgres, which Drizzle returns as **strings** (not numbers). Must convert with `Number()`:

```tsx
ratings: b.ratingOverall ? {
  overall: Number(b.ratingOverall),
  search_accuracy: Number(b.ratingSearchAccuracy),
  stock_reliability: Number(b.ratingStockReliability),
  checkout_completion: Number(b.ratingCheckoutCompletion),
  count: b.ratingCount,
} : null,
```

**⚠️ `numeric` → string gotcha:** Drizzle's `numeric()` column type maps to PostgreSQL `NUMERIC` which is returned as a JS string (e.g., `"4.2"` not `4.2`). Every consumer must call `Number()` or `parseFloat()`. This affects Steps B7, B8, B10. The `integer()` column (`ratingCount`) does NOT have this issue.

### Step B11: Add rating-based search filters

**Edit:** `server/storage/brand-index.ts` — `BrandSearchFilters`

The current `sortBy` type is `"readiness" | "name" | "created_at"`. **Extend** it (don't replace):

```tsx
minRatingOverall?: number;
minRatingSearch?: number;
minRatingStock?: number;
minRatingCheckout?: number;
sortBy?: "readiness" | "name" | "created_at" | "rating";
```

Update `searchBrands` query builder to add `WHERE` conditions for `minRating*` filters (compare as `numeric >= value`) and add `ORDER BY rating_overall` when `sortBy === "rating"`.

**Edit:** `app/api/v1/bot/skills/route.ts` — accept new query params:
```
?min_rating=3.5
?min_search_rating=4.0
?min_stock_rating=3.0
?min_checkout_rating=4.0
?sort=rating
```

Map these to the new filter fields before calling `storage.searchBrands()`.

---

## Implementation order

| Step | Description | Depends on | Risk |
|---|---|---|---|
| A1 | Brand detail page → server component + client extraction | — | Medium (large file refactor) |
| A2 | Catalog page metadata via layout | — | Low |
| A3 | JSON-LD structured data | A1 | Low |
| A4 | Sitemap update | — | Low |
| B1 | `brand_feedback` table | — | Low (schema only) |
| B2 | Rating columns on `brand_index` | — | Low (schema only) |
| B3 | Feedback storage layer | B1 | Low |
| B4 | Feedback API endpoint | B1, B3 | Low |
| B5 | Feedback section in generator | B4 | Low |
| B6 | Aggregation job | B1, B2, B3 | Medium (weighting logic) |
| B7 | Rating display on detail page | A1, B2, B6 | Low |
| B8 | Rating display on catalog cards | B2, B6 | Low |
| B9 | Human feedback UI (dashboard) | B4 | Medium (UX design) |
| B10 | Bot API ratings | B2 | Low |
| B11 | Rating-based search filters | B2, B10 | Low |

**Recommended build sequence:**
1. ~~A1 + A2 + A4 (SSR — immediate SEO value, no new tables)~~ **✅ DONE**
2. B1 + B2 (schema changes — both migrations at once)
3. B3 + B4 (storage + API — feedback can start being collected)
4. B5 (generator update — agents start seeing feedback instructions)
5. A3 (structured data — builds on A1)
6. B6 (aggregation — ratings become visible)
7. B7 + B8 + B10 (display ratings everywhere)
8. B11 (rating filters — agents can use ratings in search)
9. B9 (human feedback UI — can happen any time after B4)

Steps 2-4 can be done as a single task. Steps 5-8 as a second task. Step 9 is independent.

---

## Dependencies

- **Phase 5 must be complete** ✅ — catalog reads from `brand_index`, internal API exists
- `computeAgentFriendliness` stays as a standalone function — Phase 6 adds a complementary crowd-sourced rating system alongside the static readiness score
- Phase 8 (unify vendors table) is independent — can be completed before, during, or after Phase 6

---

## Risk assessment

### Low risk
- **SSR conversion is additive** — extracting client components from a working page doesn't change functionality
- **Schema additions** — new table and nullable columns, no existing data affected
- **Feedback API** — new endpoint, no changes to existing routes

### Medium risk
- **Brand detail page refactor** — 785-line client component being split into server + client pieces. Test all interactive flows (claim button, skill preview, clipboard copy) after extraction.
- **Aggregation weighting** — the recency + source weighting formula needs careful implementation and testing. Edge cases: zero feedback, all anonymous, very old feedback only.
- **`generateVendorSkill` change** — adding the feedback section changes every generated SKILL.md. Requires re-seeding `skill_md` in `brand_index`. Verify the bot API still returns correct markdown.

### Not a risk
- **Catalog page** — minimal change (just adding a layout file for metadata). The interactive client component is untouched.
- **Existing bot API** — ratings fields are additive (nullable), existing consumers won't break.

---

## Part A verification checklist (SSR)

These items were verified against the codebase during planning. Confirm they still hold before implementation:

### Server-component compatibility of imports

| Import | Status | Notes |
|---|---|---|
| `Nav` (`components/nav.tsx`) | ✅ Safe | Is `"use client"` — server components can render client components. Newsroom pages (server components) already render `<Nav />`. |
| `Footer` (`components/footer.tsx`) | ✅ Safe | No `"use client"`, no hooks. Pure server-compatible. |
| `Badge` (`components/ui/badge.tsx`) | ✅ Safe | No `"use client"`, no hooks. Just a styled div with `cva`. |
| `Button` (`components/ui/button.tsx`) | ✅ Safe | No `"use client"`, uses `forwardRef` + `Slot` but no hooks. **Caveat:** Buttons with `onClick` handlers must be in client components — the plan accounts for this by extracting interactive buttons. |
| `generateVendorSkill` (`lib/procurement-skills/generator.ts`) | ✅ Safe | Pure function importing from `./types` (also pure). No browser APIs, no hooks. |
| `storage` (`server/storage`) | ✅ Safe | Server-only module. Imported directly in server components. |
| Lucide icons | ✅ Safe | SVG components, no hooks. Render in server components. |
| `MATURITY_CONFIG`, `CATEGORY_ICONS`, `CHECKOUT_ICONS` constants | ✅ Safe | Static objects containing JSX (Lucide SVGs). No hooks. |

### Pattern changes

| Current (client) | After (server) | Notes |
|---|---|---|
| `use(params)` to unwrap Promise | `await params` | Standard server component pattern. Newsroom uses this. |
| `useState` + `useEffect` for data fetching | Direct `await storage.getBrandBySlug()` | Eliminates loading state — page renders with data or 404. |
| `useState` for `copied`, `showSkillPreview` | Extracted to client components | Only interactive state moves to client components. |
| `useAuth()` in `BrandClaimButton` | Stays in extracted client component | `BrandClaimButton` becomes its own `"use client"` file. |
| `fetch("/api/internal/brands/${slug}")` | `storage.getBrandBySlug(slug)` | Eliminates the API hop — server component calls DB directly. |

### What gets removed from the page

- `"use client"` directive
- `use`, `useState`, `useEffect`, `useCallback` imports from React
- `useAuth` import (moves to `brand-claim-button.tsx`)
- `Loader2` import (no loading state needed — server renders complete or 404)
- `fetch()` call to internal brands API
- Loading spinner JSX
- `notFound` state variable (replaced by `notFound()` from `next/navigation`)

### What stays in the page (server-rendered)

- All static content panels (capabilities, checkout methods, taxonomy, search/shipping/deals, security report, metadata sidebar)
- `MATURITY_CONFIG`, `CATEGORY_ICONS`, `CHECKOUT_ICONS` constants
- `ALL_CAPABILITIES` list
- Brand name, description, sector, tier, sub-sectors, tags
- Agent friendliness stars display
- Success rate display
- Active deals badge

### What moves to client components

| Component file | Props it receives | Interactive state |
|---|---|---|
| `brand-claim-button.tsx` | `slug: string` | `useAuth()`, `useState` for claim status, `useEffect` to check existing claims, `useCallback` for claim action |
| `skill-preview-panel.tsx` | `skillMd: string`, `slug: string` | `useState` for `showSkillPreview` toggle, `handleDownload` function (blob + anchor click) |
| `copy-skill-url.tsx` | `url: string` | `useState` for `copied` feedback, `navigator.clipboard.writeText` |

All props are serializable strings — no functions, no objects with methods, no React nodes passed from server to client.

### Layout metadata precedence

Both `app/skills/page.tsx` (catalog) and `app/skills/[vendor]/page.tsx` (brand detail) now have their own `generateMetadata()`. The catalog page generates filter-aware titles (e.g., "Office Supplies Procurement Skills" for `?sector=office`). The layout's static metadata is no longer needed and should be removed to avoid confusion. Page-level metadata always overrides layout metadata in Next.js.

### `data-testid` preservation

All `data-testid` attributes from the current page must be preserved:
- Static-content testids (e.g., `badge-maturity`, `score-agent-friendliness`, `link-vendor-url`, `link-back-catalog`) stay in the server component
- Interactive testids (e.g., `button-claim-brand`, `button-toggle-preview`, `button-download-skill`, `button-copy-skill-url`) move to their respective client components

---

## Files touched (summary)

| Operation | File | Description |
|---|---|---|
| Refactor | `app/skills/[vendor]/page.tsx` | Remove `"use client"`, add `generateMetadata`, server render |
| Create | `app/skills/[vendor]/brand-claim-button.tsx` | Client component: claim button |
| Create | `app/skills/[vendor]/skill-preview-panel.tsx` | Client component: skill preview + download |
| Create | `app/skills/[vendor]/copy-skill-url.tsx` | Client component: copy URL |
| Refactor | `app/skills/page.tsx` | Remove `"use client"`, server-render brand grid, `generateMetadata()` with filter-aware titles |
| Edit | `app/skills/layout.tsx` | Remove static metadata (now superseded by page's `generateMetadata`) |
| Create | `app/skills/vendor-card.tsx` | Shared VendorCard component (no `"use client"`, plain JSX) |
| Create | `app/skills/catalog-search.tsx` | Client component: debounced search input, updates `?q=` URL param |
| Create | `app/skills/catalog-filters.tsx` | Client component: filter sidebar + mobile drawer, updates URL params via `useTransition` |
| Create | `app/skills/catalog-load-more.tsx` | Client component: "Load more" pagination, fetches from internal API |
| Edit | `app/sitemap.ts` | Add brand detail pages |
| Edit | `shared/schema.ts` | Add `brand_feedback` table + rating columns on `brand_index` |
| Create | `server/storage/brand-feedback.ts` | Feedback CRUD methods |
| Edit | `server/storage/types.ts` | Add feedback methods to IStorage |
| Edit | `server/storage/index.ts` | Compose feedback methods |
| Create | `app/api/v1/bot/skills/[slug]/feedback/route.ts` | Feedback submission endpoint |
| Edit | `lib/procurement-skills/generator.ts` | Append feedback section to SKILL.md |
| Create | `lib/feedback/aggregate.ts` | Rating aggregation logic |
| Create | `app/api/internal/feedback/aggregate/route.ts` | Aggregation trigger endpoint |
| Edit | `app/api/v1/bot/skills/route.ts` | Include ratings in bot API response |
| Edit | `server/storage/brand-index.ts` | Add rating-based filters/sorting |
| Create | `components/dashboard/purchase-feedback-prompt.tsx` | Human feedback UI |
| Create | `app/skills/[vendor]/not-found.tsx` | Custom 404 for missing brands |

---

## Part B verification checklist (Feedback Loop)

Issues identified during plan review, verified against the codebase:

### Issue 1: Checkout method enum mismatch (FIXED in plan)

**Problem:** The original plan used `"x402_protocol"` in the Zod validation schema. The actual `CheckoutMethod` type in `lib/procurement-skills/taxonomy/checkout-methods.ts` uses `"x402"`. The value `"x402_protocol"` only exists in planning documents, never in code.

**Also missing:** `"crossmint_world"` was not in the original enum list.

**Fix:** Updated the `insertBrandFeedbackSchema` enum to: `["native_api", "browser_automation", "x402", "acp", "self_hosted_card", "crossmint_world"]`

### Issue 2: Auth approach — `withBotApi` would reject anonymous feedback (FIXED in plan)

**Problem:** The plan said "Optional auth" but didn't specify the implementation. Every existing bot API endpoint uses `withBotApi()` middleware, which returns 401 for unauthenticated requests. If the feedback endpoint used this pattern, anonymous feedback would be rejected.

**Fix:** Use `authenticateBot(request)` directly (from `lib/agent-management/auth.ts`) which returns `null` for missing/invalid tokens instead of throwing. The endpoint gracefully handles both authenticated and anonymous submissions.

**Additional concern for B9:** Human feedback needs Firebase session auth (not bot API keys). The endpoint must check for both auth types: Bearer token for bots, session cookie for humans via `getCurrentUser()`.

### Issue 3: API body key format mismatch (FIXED in plan)

**Problem:** The Zod schema uses camelCase (`searchAccuracy`) because Drizzle maps to snake_case columns. But the SKILL.md example showed snake_case keys (`search_accuracy`), and the entire bot API convention uses snake_case (see `app/api/v1/bot/skills/route.ts` response).

**Fix:** The endpoint accepts snake_case keys in the request body and normalizes to camelCase before Zod validation. Both formats are accepted for compatibility.

### Issue 4: `numeric` column type returns strings (noted in plan)

**Problem:** The rating columns (`ratingSearchAccuracy`, etc.) use `numeric()` type. Drizzle returns PostgreSQL `NUMERIC` values as JavaScript strings, not numbers. Without explicit conversion, consumers would display `"4.2"` instead of `4.2`, or worse, string comparisons would break sorting.

**Affected steps:** B7 (detail page display), B8 (catalog card display), B10 (bot API response). All must use `Number()` or `parseFloat()`.

**Not affected:** `ratingCount` uses `integer()` which returns a proper JS number.

### Issue 5: `sortBy` type extension (noted in plan)

**Problem:** Current `BrandSearchFilters.sortBy` is typed as `"readiness" | "name" | "created_at"`. Adding `"rating"` requires extending the union, not replacing it.

**Impact:** Any code that exhaustively switches on `sortBy` values would need updating. Currently `searchBrands()` uses an if/else chain, so adding a new case is straightforward.

### Issue 6: Generator insertion point

**Verified:** The feedback section goes after the Metadata section in `generator.ts` (line ~200), inside the template literal, before the closing backtick. The Metadata section is currently the last section generated.

### Issue 7: Seed script exists

**Verified:** `scripts/seed-brand-index.ts` exists and handles regeneration of `skill_md` in `brand_index`. No new seed script needed.

### Issue 8: No existing feedback infrastructure

**Verified:** No `feedbackSubmitted` field exists on any transaction/order table. No feedback UI exists in the dashboard. Step B9 will need to either:
- Add a `feedbackSubmitted` boolean column to the relevant order table(s), OR
- Query `brand_feedback` for `reviewerUid` + `brandSlug` within the time window

The second approach is simpler (no schema changes to order tables) but slightly slower for frequent queries. Recommendation: use the query approach initially, add a column only if performance becomes an issue.

### Issue 9: Rate limiting for anonymous submissions

**Verified:** The existing `checkBotRateLimit` (from `lib/agent-management/rate-limit.ts`) is tied to `botId` and endpoint. For anonymous feedback, a separate IP-based rate limiter is needed. A simple in-memory Map with `{ip}:{brandSlug}` keys and timestamp arrays would suffice (similar to the existing rate limit implementation).

### Things verified as safe

| Concern | Status | Notes |
|---|---|---|
| `brand_feedback` table — no conflicts | ✅ | No existing table with this name |
| Rating columns — nullable, no existing data affected | ✅ | New columns with defaults, existing rows get `null` |
| Bot API response — additive field | ✅ | Adding `ratings` to response doesn't break existing consumers |
| Generator change — template literal, not string concat | ✅ | Safe to append section before closing backtick |
| Aggregation endpoint — internal, no auth needed | ✅ | Follows same pattern as other internal endpoints (e.g., `/api/internal/brands/[slug]`) |
| `brand_index.updatedAt` — `notNull`, type `timestamp` | ✅ | Safe for `lastModified` in sitemap and aggregation timestamps |
