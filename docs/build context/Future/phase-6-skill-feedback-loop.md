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

1. Calls `storage.getBrandBySlug(slug)` directly (no API fetch needed — server components can access the DB)
2. Casts `brand.brandData` to `VendorSkill` for display
3. Returns `notFound()` if the brand doesn't exist
4. Renders all static content server-side (name, description, capabilities, checkout methods, taxonomy, search/shipping/deals panels, metadata sidebar)
5. Renders interactive pieces as imported client components

```tsx
import { notFound } from "next/navigation";
import { storage } from "@/server/storage";
import type { Metadata } from "next";
import type { BrandIndex } from "@/shared/schema";
import type { VendorSkill } from "@/lib/procurement-skills/types";
import { BrandClaimButton } from "./brand-claim-button";
import { SkillPreviewPanel } from "./skill-preview-panel";
import { CopySkillUrl } from "./copy-skill-url";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";

interface Props {
  params: Promise<{ vendor: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vendor: slug } = await params;
  const brand = await storage.getBrandBySlug(slug);
  if (!brand) return {};

  const vendor = brand.brandData as unknown as VendorSkill;
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
  const brand = await storage.getBrandBySlug(slug);
  if (!brand) notFound();

  const vendor = brand.brandData as unknown as VendorSkill;
  const friendliness = Math.min(Math.floor((brand.agentReadiness ?? 0) / 20) + 1, 5);
  // ... render all static panels server-side
  // ... render <BrandClaimButton slug={brand.slug} /> (client component)
  // ... render <SkillPreviewPanel skillMd={skillMd} slug={brand.slug} /> (client component)
  // ... render <CopySkillUrl url={skillUrl} /> (client component)
}
```

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

### Step A2: Convert catalog page for SEO metadata

**Edit:** `app/skills/page.tsx` (600+ lines)

The catalog page is trickier because it's highly interactive (filters, search, pagination). Two approaches:

**Recommended approach — hybrid:** Keep the page as a client component for interactivity, but wrap it in a server layout that provides metadata.

Create `app/skills/layout.tsx` (server component):

```tsx
import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";

export const metadata: Metadata = {
  title: "Vendor Skills Library — AI Agent Procurement Intelligence | CreditClaw",
  description: "Curated procurement skills that teach AI agents how to shop at 50+ vendors. Search by sector, tier, payment method, or capability. Download SKILL.md files for your agent.",
  openGraph: {
    title: "Vendor Skills Library — CreditClaw",
    description: "AI agent procurement skills for 50+ vendors. Search, filter, and download SKILL.md files.",
    type: "website",
    url: `${BASE_URL}/skills`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Vendor Skills Library — CreditClaw",
    description: "AI agent procurement skills for 50+ vendors.",
  },
  alternates: {
    canonical: `${BASE_URL}/skills`,
  },
};

export default function SkillsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

This gives the catalog page proper metadata without refactoring the entire interactive page. The `metadata` export from a layout is picked up by Next.js automatically.

**Alternative approach (future):** Full SSR with URL-based filter state (query params) and server-side initial data load. This is more work but gives crawlers a rendered grid of brands. Can be done in a later iteration.

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

Add brand detail pages to the sitemap so search engines discover them:

```tsx
const brands = await storage.searchBrands({
  maturities: ["verified", "official"],
  limit: 500,
  sortBy: "name",
  sortDir: "asc",
});

const brandUrls = brands.map(b => ({
  url: `${BASE_URL}/skills/${b.slug}`,
  lastModified: b.updatedAt,
  changeFrequency: "weekly" as const,
  priority: 0.7,
}));
```

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
  checkoutMethod: z.enum(["native_api", "browser_automation", "x402_protocol", "acp", "self_hosted_card"]),
  outcome: z.enum(["success", "checkout_failed", "search_failed", "out_of_stock", "price_mismatch", "flow_changed"]),
  comment: z.string().max(500).optional(),
});
```

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

**Auth:** Optional. Check for `Authorization: Bearer <key>` header. If present, validate against bot API keys. If valid, mark `authenticated: true` and extract `botId`. If absent or invalid, accept as anonymous (`authenticated: false`).

**Request body:** As defined in the insert schema (Step B1).

**Logic:**
1. Validate `slug` exists in `brand_index`
2. Validate request body with `insertBrandFeedbackSchema`
3. Rate limit: if authenticated, check `getRecentFeedbackByBot(slug, botId, 1)` — max 1 per brand per bot per hour
4. Insert into `brand_feedback`
5. Return `{ received: true, brand_slug: slug, message: "Thanks — this feedback improves the skill for all agents." }`

### Step B5: Feedback section in `generateVendorSkill()`

**Edit:** `lib/procurement-skills/generator.ts`

Append a feedback section at the end of every generated SKILL.md:

```markdown
---

## Feedback

After your purchase attempt (successful or not), help improve this skill:

POST https://creditclaw.com/api/v1/bot/skills/{slug}/feedback
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

Ratings are 1-5. Outcome is one of: success, checkout_failed, search_failed, out_of_stock, price_mismatch.
This is optional but helps other agents find reliable vendors.
```

After updating the generator, re-run the seed script to regenerate `skill_md` in `brand_index` for all brands:
```bash
npx tsx scripts/seed-brand-index.ts
```

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

**Edit:** `app/api/v1/bot/skills/route.ts`

When the bot API returns brand data, include the ratings if they exist:

```tsx
{
  // ... existing fields
  ratings: brand.ratingOverall ? {
    overall: Number(brand.ratingOverall),
    search_accuracy: Number(brand.ratingSearchAccuracy),
    stock_reliability: Number(brand.ratingStockReliability),
    checkout_completion: Number(brand.ratingCheckoutCompletion),
    count: brand.ratingCount,
  } : null,
}
```

This lets agents sort and filter by real-world performance, not just static capabilities.

### Step B11: Add rating-based search filters

**Edit:** `server/storage/brand-index.ts` — `BrandSearchFilters`

Add:
```tsx
minRatingOverall?: number;
minRatingSearch?: number;
minRatingStock?: number;
minRatingCheckout?: number;
sortBy?: "readiness" | "name" | "created_at" | "rating";
```

Update `searchBrands` to support filtering and sorting by ratings.

**Edit:** `app/api/v1/bot/skills/route.ts` — accept the new filter params.

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
1. A1 + A2 + A4 (SSR — immediate SEO value, no new tables)
2. B1 + B2 (schema changes — both migrations at once)
3. B3 + B4 (storage + API — feedback can start being collected)
4. B5 (generator update — agents start seeing feedback instructions)
5. A3 (structured data — builds on A1)
6. B6 (aggregation — ratings become visible)
7. B7 + B8 + B10 (display ratings everywhere)
8. B11 (rating filters — agents can use ratings in search)
9. B9 (human feedback UI — can happen any time after B4)

Steps 1-4 can be done as a single task. Steps 5-8 as a second task. Step 9 is independent.

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

## Files touched (summary)

| Operation | File | Description |
|---|---|---|
| Refactor | `app/skills/[vendor]/page.tsx` | Remove `"use client"`, add `generateMetadata`, server render |
| Create | `app/skills/[vendor]/brand-claim-button.tsx` | Client component: claim button |
| Create | `app/skills/[vendor]/skill-preview-panel.tsx` | Client component: skill preview + download |
| Create | `app/skills/[vendor]/copy-skill-url.tsx` | Client component: copy URL |
| Create | `app/skills/layout.tsx` | Server component: catalog metadata |
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
