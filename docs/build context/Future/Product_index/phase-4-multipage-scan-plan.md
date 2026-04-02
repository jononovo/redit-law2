# Phase 4: Multi-Page Crawling + Brand Data Enrichment

## Objective

Upgrade the ASX scan pipeline from single-page (homepage only) to multi-page crawling. 
One scan produces everything — score, SKILL.md, vendor profile — eliminating the need 
for a separate skill builder pass. Also merge existing curated `brandData` into the 
SKILL.md so brands that already have detailed data produce richer agent instructions.

---

## Part 1: Multi-Page Crawling

### Current state

`fetchScanInputs()` fetches three things in parallel:
1. Homepage HTML (via Firecrawl → raw fetch fallback)
2. `/sitemap.xml` (raw fetch, 8s timeout)
3. `/robots.txt` (raw fetch, 8s timeout)

All signal scoring and Claude analysis happens against the homepage HTML only. Product 
pages, cart, checkout, and search pages are never seen. This means:
- `json_ld` signal scores 0 for most sites (JSON-LD Product markup lives on product pages)
- Checkout flow details are guessed from homepage hints (footer links, nav text)
- Product variant structure is invisible
- Search functionality is inferred from `<form>` elements, not verified

### Proposed state

`fetchScanInputs()` returns an expanded `ScoreInput` with additional page content:

```typescript
export interface ScoreInput {
  domain: string;
  homepageHtml: string;
  sitemapContent: string | null;
  robotsTxtContent: string | null;
  pageLoadTimeMs: number | null;
  // NEW — additional pages for deeper analysis
  additionalPages: PageFetch[];
}

export interface PageFetch {
  url: string;
  pageType: "product" | "cart" | "search" | "category";
  html: string;
  statusCode: number;
}
```

### Page discovery strategy (executed in `fetch.ts`)

After fetching homepage + sitemap + robots, discover and fetch up to 4 additional pages:

**Step 1: Extract candidate URLs (no network calls)**

From the sitemap XML, extract product page URLs using patterns:
- URLs containing `/p/`, `/product/`, `/products/`, `/dp/`, `/item/`, `/ip/`
- URLs that look like deep paths (3+ segments, not category-level)
- Pick 2 candidates, prefer diverse URL patterns

From the homepage HTML, extract candidate URLs as fallback:
- Parse `<a href="...">` links on the same domain
- Match product URL patterns (same as above)
- Also look for cart/checkout links: `/cart`, `/bag`, `/basket`, `/checkout`
- Pick 2 product candidates + 1 cart candidate

**Step 2: Build the fetch list**

Priority order (stop at 4 total):
1. 2 product pages (from sitemap if available, homepage links as fallback)
2. 1 cart page (`/cart` or detected cart link)
3. 1 search results page (`/s/test` or `/search?q=test` — use `searchUrlTemplate` from 
   homepage if detectable, otherwise try common patterns)

**Step 3: Fetch additional pages in parallel**

- Product pages: Firecrawl (JS rendering matters for product pages) → raw fetch fallback
- Cart page: raw fetch (usually server-rendered, may return empty cart or redirect)
- Search page: raw fetch (need to see search results structure)
- All fetches: 10s timeout, SSRF validation, non-blocking (use `Promise.allSettled`)
- Each page HTML trimmed to 100,000 characters

**Step 4: Return enriched ScoreInput**

`additionalPages` array contains only successful fetches. Failed fetches are silently 
dropped — the pipeline works with whatever pages it gets.

### Timing impact

Current: ~2-8s (1 Firecrawl + 2 raw fetches in parallel)
Proposed: ~5-12s (1 Firecrawl + 2 raw + up to 4 more fetches, mostly parallel)

Firecrawl calls are the bottleneck. With 3 Firecrawl calls (homepage + 2 product pages), 
they can run concurrently. Total Firecrawl time should be similar to 1 call since they 
run in parallel on Firecrawl's infrastructure.

### Files to modify

| File | Change |
|---|---|
| `lib/agentic-score/types.ts` | Add `PageFetch` interface, add `additionalPages` to `ScoreInput` |
| `lib/agentic-score/fetch.ts` | Add page discovery logic (sitemap parsing, link extraction), fetch additional pages, return enriched `ScoreInput` |

### Backward compatibility

- `computeASXScore()` currently only reads `homepageHtml`, `sitemapContent`, `robotsTxtContent`, `pageLoadTimeMs` — it will continue to work unchanged
- Signal functions that currently only look at homepage will be updated to also check `additionalPages` for relevant markup (see "Signal improvements" below)
- Claude analysis will receive all pages instead of just homepage

---

## Part 2: Signal Improvements from Multi-Page Data

With product pages and cart available, several signals can score much more accurately:

### `json_ld` (max 20pts, currently scores 0 for most sites)
- Check product pages for `<script type="application/ld+json">` with `@type: "Product"`
- This is the single biggest scoring improvement — most sites have JSON-LD on product 
  pages but not on the homepage

### `clean_html` (max 10pts)
- Check product pages for semantic markup: `<main>`, `<article>`, proper heading hierarchy
- Product pages tend to have better semantic structure than homepages

### `order_management` (max 10pts)
- Check product pages for variant selectors, add-to-cart forms, quantity inputs
- Check cart page for cart management (remove item, update quantity)

### `checkout_flow` (max 10pts)
- Check cart page for checkout link, payment method indicators
- Check if cart page reveals guest checkout option

### `access_auth` (max 10pts)
- Check cart page: does it redirect to login? → requires auth
- Check cart page: does it load directly? → guest-friendly

### `site_search` (max 10pts)
- Check search results page: does it return structured results?
- Verify the search URL pattern actually works

### Files to modify

| File | Change |
|---|---|
| `lib/agentic-score/signals/clarity.ts` | `scoreJsonLd` and `scoreCleanHtml` also check `additionalPages` |
| `lib/agentic-score/signals/speed.ts` | `scoreSiteSearch` verifies search URL works via search page |
| `lib/agentic-score/signals/reliability.ts` | `scoreAccessAuth`, `scoreOrderManagement`, `scoreCheckoutFlow` check cart + product pages |
| `lib/agentic-score/compute.ts` | Pass full `ScoreInput` (including `additionalPages`) to signal functions |

### Signal function signature change

Currently all signal functions take individual fields:
```typescript
scoreJsonLd(homepageHtml: string): SignalScore
```

Proposed: they take the full `ScoreInput`:
```typescript
scoreJsonLd(input: ScoreInput): SignalScore
```

This is a clean refactor since `ScoreInput` already contains all fields they currently 
receive individually. The `compute.ts` caller just passes `input` instead of 
destructured fields.

---

## Part 3: Unified Claude Analysis (Multi-Page)

### Current state

`analyzeScanWithClaude()` receives only `homepageHtml` and strips it to 30,000 chars.
The prompt says "analyze this vendor's homepage."

### Proposed state

`analyzeScanWithClaude()` receives the full `ScoreInput` (homepage + additional pages).
Pages are formatted using the labeled separator pattern already proven in `builder/llm.ts`:

```
--- Page 1: Homepage (https://homedepot.com) ---
Title: The Home Depot
[stripped HTML, up to 15,000 chars]

=== NEXT PAGE ===

--- Page 2: Product Page (https://homedepot.com/p/dewalt-drill/12345) ---
Title: DEWALT 20V MAX Drill
[stripped HTML, up to 15,000 chars]

=== NEXT PAGE ===

--- Page 3: Cart Page (https://homedepot.com/cart) ---
Title: Shopping Cart
[stripped HTML, up to 15,000 chars]

=== NEXT PAGE ===

--- Page 4: Search Results (https://homedepot.com/s/drill) ---
Title: Search Results for "drill"
[stripped HTML, up to 15,000 chars]
```

### Prompt restructuring

Current prompt is a flat list of fields. New prompt organized around the three agent 
workflows:

```
You are analyzing an e-commerce website for CreditClaw, an AI procurement platform.
You are given HTML from multiple pages of the same site. Analyze them to determine how 
an AI shopping agent would interact with this store.

Focus on three workflows:

1. PRODUCT DISCOVERY
   How would an agent find products on this site?
   - searchUrlTemplate: URL pattern for search (use {q} as placeholder)
   - searchPattern: Description of how search works
   - productIdFormat: How products are identified (SKU, Item Number, ASIN, etc.)
   - hasApi: Does the site expose a public product API?
   - hasMcp: Does the site support MCP protocol?
   - jsonLdTypes: What Schema.org types are present? (Product, Offer, BreadcrumbList, etc.)

2. PRODUCT UNDERSTANDING
   How are products structured on this site?
   - variantSelectors: What options exist? (size, color, quantity, etc.)
   - priceFormat: How is pricing displayed? (currency, sale/original, bulk tiers)
   - productIdFormat: Format of the main product identifier
   - imagePattern: How are product images structured?

3. CHECKOUT FLOW
   How would an agent complete a purchase?
   - guestCheckout: boolean
   - taxExemptField: boolean
   - poNumberField: boolean
   - checkoutProviders: Payment processors (stripe, shopify_payments, paypal, etc.)
   - paymentMethods: Accepted methods (credit_card, purchase_order, wire, etc.)
   - cartUrl: Direct URL to cart page
   - freeShippingThreshold: number|null
   - estimatedDeliveryDays: string
   - businessShipping: boolean

Also extract:
   - name: Store name
   - sector: One of: [list]
   - subSectors: More specific categories
   - tier: One of: [list]
   - capabilities: From: [list]
   - tips: 3-5 practical tips for an AI agent shopping here

Return ONLY valid JSON.
```

### New LLMScanFindings fields

```typescript
export interface LLMScanFindings {
  // existing fields...
  
  // NEW from multi-page analysis
  jsonLdTypes?: string[];        // Schema.org types found on product pages
  variantSelectors?: string[];   // e.g., ["size", "color", "quantity"]
  priceFormat?: string;          // e.g., "USD with sale/original pricing"
  cartUrl?: string;              // Direct cart URL
  imagePattern?: string;         // How product images are structured
}
```

### Token budget

- Homepage: ~15,000 chars stripped
- Product pages: ~15,000 chars each × 2 = 30,000
- Cart page: ~10,000 chars (usually simpler)
- Search page: ~10,000 chars
- Total input: ~65,000 chars ≈ ~16,000 tokens
- Output: ~2,000 tokens
- Total per scan: ~18,000 tokens ≈ $0.03-0.05 per scan

### Files to modify

| File | Change |
|---|---|
| `lib/agentic-score/llm.ts` | Accept `ScoreInput` instead of just `homepageHtml`. Format multi-page content. Update prompt to workflow-focused structure. Add new fields to `LLMScanFindings`. |

---

## Part 4: Brand Data Enrichment for SKILL.md

### Current state

`buildVendorSkillDraft()` in the scan route constructs a `VendorSkill` from Claude 
findings only. For brands that already have rich curated data in `brandData` JSONB 
(e.g., Staples with checkout config, taxonomy, deals, search URLs), that data is 
completely ignored.

### Proposed state

`buildVendorSkillDraft()` merges three sources in priority order:

1. **Existing `brandData`** (highest priority — human-curated)
2. **Claude findings** (fills gaps not covered by curated data)
3. **Hardcoded defaults** (last resort)

### Merge rules (per field)

For each field in `VendorSkill`:

| Field | Source priority |
|---|---|
| `slug` | scan route (always) |
| `name` | brandData > Claude > extractMeta > capitalize(domain) |
| `url` | existing.url > `https://${domain}` |
| `sector` | existing (if not "uncategorized") > Claude > "uncategorized" |
| `checkoutMethods` | brandData.checkoutMethods > ["browser_automation"] |
| `capabilities` | set-union(brandData.capabilities, Claude.capabilities) |
| `maturity` | existing.maturity > "draft" |
| `methodConfig` | brandData.methodConfig > Claude-derived default |
| `search.pattern` | brandData.search.pattern > Claude.searchPattern > default |
| `search.urlTemplate` | brandData.search.urlTemplate > Claude.searchUrlTemplate |
| `search.productIdFormat` | brandData.search.productIdFormat > Claude.productIdFormat |
| `checkout.*` | brandData.checkout.* > Claude.* > false |
| `shipping.*` | brandData.shipping.* > Claude.* > defaults |
| `tips` | brandData.tips > Claude.tips > generic defaults |
| `taxonomy` | brandData.taxonomy (sector/subSectors/tier from existing) |
| `searchDiscovery` | brandData.searchDiscovery (if present) |
| `buying` | brandData.buying (if present) |
| `deals` | brandData.deals (if present) |

### How brandData is structured

The `brandData` JSONB column stores the full `VendorSkill`-shaped object for curated 
brands. Example from Staples:

```json
{
  "name": "Staples",
  "slug": "staples",
  "url": "https://www.staples.com",
  "search": {
    "pattern": "Search on staples.com by product name or SKU...",
    "urlTemplate": "https://www.staples.com/search?query={q}",
    "productIdFormat": "SKU / Item number"
  },
  "checkout": {
    "guestCheckout": true,
    "poNumberField": true,
    "taxExemptField": true
  },
  "shipping": {
    "estimatedDays": "1-5 business days",
    "freeThreshold": 49.99,
    "businessShipping": true
  },
  "checkoutMethods": ["self_hosted_card"],
  "capabilities": ["price_lookup", "stock_check", ...],
  "tips": ["Guest checkout available but business accounts get better pricing", ...],
  "taxonomy": { "sector": "office", "subSectors": [...], "tier": "mid_range" },
  "buying": { ... },
  "deals": { ... },
  "searchDiscovery": { ... }
}
```

When this data exists, the generated SKILL.md should be rich and actionable — not a 
skeleton with defaults.

### Implementation

Modify `buildVendorSkillDraft()` to accept an optional `brandData` parameter:

```typescript
function buildVendorSkillDraft(
  slug: string,
  domain: string,
  name: string,
  sector: string,
  findings: Record<string, unknown>,
  brandData?: Record<string, unknown>,  // NEW
): VendorSkill
```

Inside, each field uses the merge priority: `brandData.field ?? findings.field ?? default`.

### Files to modify

| File | Change |
|---|---|
| `app/api/v1/scan/route.ts` | Pass `existing?.brandData` to `buildVendorSkillDraft()`. Also persist enriched brandData back (merge Claude findings into existing brandData for future scans). |

---

## Execution Order

These four parts have dependencies:

```
Part 1 (Multi-page fetch)
  ↓
Part 2 (Signal improvements)  ←  depends on new ScoreInput shape
  ↓
Part 3 (Unified Claude)       ←  depends on new ScoreInput shape
  ↓
Part 4 (Brand data enrichment) ← independent, but benefits from richer Claude output
```

Parts 2 and 3 can be done in parallel after Part 1. Part 4 is independent and can be 
done at any point.

### Recommended build sequence

1. **Part 1** — Expand `ScoreInput`, add page discovery + fetching to `fetch.ts`
2. **Part 3** — Update Claude prompt to multi-page format (biggest quality jump)
3. **Part 2** — Update signal functions to check additional pages
4. **Part 4** — Merge brandData into SKILL.md generation

### Risk assessment

| Risk | Mitigation |
|---|---|
| Firecrawl rate limits (3 calls/scan vs 1) | Firecrawl free tier is 500 pages/month. At 5 pages/scan, that's 100 scans/month. For higher volume, raw fetch fallback still works. |
| Scan takes too long (>15s) | Set hard timeout at 12s for additional page fetches. Pipeline continues with whatever pages succeeded. |
| Claude token cost increases ~3x | Still ~$0.03-0.05/scan. Acceptable for the quality improvement. |
| Signal function refactor breaks existing scores | Backward compatible: new `ScoreInput.additionalPages` defaults to `[]`, existing logic runs unchanged on homepage, additional pages only add points (floor principle). |
| Cart/checkout pages require login | Expected behavior. A redirect to `/login` is itself useful signal for `access_auth`. Empty/redirect responses are scored as "auth required." |

### What we do NOT change

- `analyzeVendor()` in `lib/procurement-skills/builder/` — untouched
- `generateVendorSkill()` in `lib/procurement-skills/generator.ts` — untouched
- `computeASXScore()` internal logic — only its signal functions get richer input
- AXS Rating system — untouched
- Existing signal max point values — same 100-point scale
