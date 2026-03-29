# Agentic Shopping Score — Technical Build Plan

## Related Documents

| Document | What It Covers |
|---|---|
| `agent-readiness-and-product-index-service.md` | Full service vision, three tiers, gateway, schema |
| `scan-page-ux-design.md` | Page layouts, UX wireframes, SEO meta tags |
| `product-index-taxonomy-plan.md` | Google Product Taxonomy adoption |
| `shopy-sh-commerce-skill-standard.md` | shopy.sh SKILL.md commerce format |
| `agentic-shopping-score-build-plan.md` | This document — technical implementation plan for Tier 1 |

---

## Overview

Build the `/agentic-shopping-score` page and supporting backend — CreditClaw's free, public-facing tool that scans any merchant domain and produces an **ASX Score** (Agent Shopping Experience Score), a breakdown across 8 signals, actionable recommendations, a side-by-side comparison with one similar brand, and a downloadable SKILL.md file.

### Naming

| What | Value |
|---|---|
| Page URL | `/agentic-shopping-score` |
| Results URL | `/agentic-shopping-score/[domain]` |
| History URL | `/agentic-shopping-score/[domain]/history` (future) |
| Score name (full) | Agent Shopping Experience Score |
| Score name (short) | ASX Score |
| Page title | Agentic Shopping Score |

---

## What Already Exists

### Skill Builder Pipeline (`lib/procurement-skills/builder/`)

The existing skill builder is the foundation. It already does most of what Tier 1 needs:

| File | What It Does | Reuse for Tier 1? |
|---|---|---|
| `fetch.ts` | Fetches pages with SSRF protection, strips scripts/styles, handles redirects | Yes — use as-is |
| `probes.ts` | Probes for x402, ACP, public APIs, MCP, business features | Yes — these feed directly into ASX Score signals |
| `llm.ts` | Sends page HTML to Claude, extracts structured e-commerce data | Yes — extend prompt to also return score-relevant signals |
| `analyze.ts` | Orchestrates fetch → probe → LLM → assemble VendorSkill draft | Yes — extend to also produce ASX Score + breakdown |
| `types.ts` | TypeScript types for pages, probes, analysis results | Yes — extend with score types |

**Decision: One skill builder function.** The scan endpoint will call the existing `analyzeVendor()` function (or a thin wrapper around it) and derive the ASX Score from the same data it already collects. No separate "light" pipeline.

### Database (`shared/schema.ts`)

The `brand_index` table already has:
- `agentReadiness` (integer, 0–100) — rename conceptually to ASX Score
- `skillMd` (text) — stores generated SKILL.md
- `brandData` (JSONB) — can store score breakdown
- `sector`, `subSectors` — for brand comparison matching
- AXS Rating fields (`ratingSearchAccuracy`, `ratingStockReliability`, `ratingCheckoutCompletion`, `axsRating`)
- All capability flags (`hasMcp`, `hasApi`, `siteSearch`, `productFeed`, etc.)

### Storage Methods (`server/storage/types.ts`)

Already available:
- `searchBrands(filters)` — can query by sector for comparison
- `getBrandBySlug(slug)` / `getBrandById(id)` — fetch results
- `upsertBrandIndex(data)` — save scan results
- `recomputeReadiness(slug)` — update score

---

## Build Phases

### Phase 1: Database — `scan_history` Table + Score Breakdown

**Goal:** Add the `scan_history` table and a `score_breakdown` storage pattern so we can track scores over time and show signal-level detail.

**Schema addition (`shared/schema.ts`):**

```sql
CREATE TABLE scan_history (
  id              SERIAL PRIMARY KEY,
  brand_id        INTEGER REFERENCES brand_index(id),
  domain          TEXT NOT NULL,
  scan_tier       TEXT NOT NULL DEFAULT 'free',
  overall_score   INTEGER NOT NULL,
  score_breakdown JSONB NOT NULL,
  skill_md        TEXT,
  scanned_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  scanned_by      TEXT DEFAULT 'system'
);

CREATE INDEX scan_history_domain_idx ON scan_history(domain);
CREATE INDEX scan_history_brand_id_idx ON scan_history(brand_id);
```

**`score_breakdown` JSONB shape:**

```typescript
interface ASXScoreBreakdown {
  structuredData:       { score: number; max: 20; details: string };
  sitemapQuality:       { score: number; max: 10; details: string };
  searchFunctionality:  { score: number; max: 15; details: string };
  checkoutAccessibility:{ score: number; max: 15; details: string };
  apiAvailability:      { score: number; max: 15; details: string };
  botFriendliness:      { score: number; max: 10; details: string };
  mobileResponsive:     { score: number; max: 5;  details: string };
  mcpUcpSupport:        { score: number; max: 10; details: string };
}
```

**Storage methods to add:**
- `createScanHistory(data: InsertScanHistory): Promise<ScanHistory>`
- `getScanHistoryByDomain(domain: string): Promise<ScanHistory[]>`
- `getLatestScanByDomain(domain: string): Promise<ScanHistory | null>`

**Files to modify:**
- `shared/schema.ts` — add `scanHistory` table, types, insert schema
- `server/storage/types.ts` — add scan history methods to `IStorage`
- `server/storage/` — new `scan-history.ts` module
- `server/storage/index.ts` — register new module
- Run migration

---

### Phase 2: ASX Score Calculation Engine

**Goal:** Take the data the existing skill builder already collects and compute the 8-signal ASX Score from it.

**New file: `lib/procurement-skills/builder/score.ts`**

This module takes the output of the existing `analyzeVendor()` pipeline and computes the ASX Score. It doesn't fetch or crawl anything — it just scores the data that's already been collected.

**Input:** The existing `BuilderOutput` from `analyze.ts` (contains the `VendorSkill` draft, evidence array, probe results)

**Scoring logic:**

| Signal (8 total) | Max | How It's Scored | Data Source |
|---|---|---|---|
| **Structured Product Data** | 20 | JSON-LD Product schema detected? Open Graph tags? Meta tags? Schema.org markup? | `evidence[]` from page crawl (look for `structured_data` source entries) + LLM analysis |
| **Sitemap Quality** | 10 | Does `/sitemap.xml` exist? Is it parseable? Does it contain product URLs? | New: fetch `{baseUrl}/sitemap.xml` in the page list |
| **Search Functionality** | 15 | Is there a site search? Does the LLM find a `searchUrlTemplate`? Is there a search API? | `draft.search.urlTemplate` + `siteSearch` flag + LLM `searchPattern` |
| **Checkout Accessibility** | 15 | Guest checkout available? Predictable cart/checkout URLs? How many required fields? | `draft.checkout.guestCheckout` + page fetch results for `/cart`, `/checkout` |
| **API Availability** | 15 | Public REST/GraphQL API detected? OpenAPI docs? Documented endpoints? | `probeForAPIs()` results + `hasApi` + `apiEndpoint` |
| **Bot Friendliness** | 10 | `robots.txt` allows crawling? No CAPTCHA on landing? No aggressive bot blocking? | New: fetch and parse `{baseUrl}/robots.txt` |
| **Mobile/Responsive** | 5 | Viewport meta tag present? Responsive CSS detected? | Page HTML analysis (check for `<meta name="viewport">`) |
| **MCP/UCP Support** | 10 | Shopify MCP endpoint? UCP integration? A2A protocol? | `probeForAPIs()` results (already checks for MCP, x402, ACP) |

**Additional pages to fetch (extend the page list in `analyze.ts`):**
- `{baseUrl}/sitemap.xml` — for sitemap quality signal
- `{baseUrl}/robots.txt` — for bot friendliness signal
- Already fetches: homepage, `/cart`, `/checkout`, `/business`, `/about`

**Output:**

```typescript
interface ASXScoreResult {
  overallScore: number;        // 0-100
  breakdown: ASXScoreBreakdown;
  recommendations: ASXRecommendation[];
  label: string;               // "Poor" | "Needs Work" | "Fair" | "Good" | "Excellent"
}

interface ASXRecommendation {
  signal: string;
  impact: "high" | "medium" | "low";
  title: string;
  description: string;
  potentialGain: number;       // how many points this could add
}
```

**Files to create:**
- `lib/procurement-skills/builder/score.ts` — scoring engine
- `lib/procurement-skills/builder/recommendations.ts` — generates recommendations from score gaps

**Files to modify:**
- `lib/procurement-skills/builder/analyze.ts` — add sitemap.xml and robots.txt to the page fetch list
- `lib/procurement-skills/builder/types.ts` — add ASX score types

---

### Phase 3: Scan API Endpoint

**Goal:** A public API endpoint that accepts a domain, runs the full pipeline, and returns the ASX Score + SKILL.md + comparison brand.

**New file: `app/api/v1/scan/route.ts`**

```
POST /api/v1/scan
Content-Type: application/json

{ "domain": "staples.com" }
```

**Pipeline:**

```
1. Validate + normalize domain (strip protocol, www, trailing paths)
2. Check if we've scanned this domain recently (< 24 hours) → return cached result
3. Call analyzeVendor(normalizedUrl)
4. Call computeASXScore(builderOutput)
5. Generate SKILL.md using existing skill builder (same function, one pipeline)
6. Upsert into brand_index (domain, score, breakdown, skillMd, sector, capabilities)
7. Create scan_history record
8. Find one comparison brand: query brand_index for same sector, nearest score, exclude self
9. Return: { score, breakdown, recommendations, skillMd, comparison, domain }
```

**Response shape:**

```typescript
{
  domain: string;
  score: number;
  label: string;
  breakdown: ASXScoreBreakdown;
  recommendations: ASXRecommendation[];
  skillMd: string;
  brand: {
    name: string;
    slug: string;
    sector: string;
    subSectors: string[];
  };
  comparison: {
    brand: { name: string; slug: string; domain: string; sector: string };
    score: number;
    breakdown: ASXScoreBreakdown;
  } | null;
  scannedAt: string;
}
```

**Rate limiting:** Basic IP-based rate limit — max 5 scans per IP per hour. Prevent abuse without requiring login.

**Caching:** If the same domain was scanned in the last 24 hours, return the cached result from `scan_history` instead of re-scanning. User can force a re-scan with `{ "domain": "...", "force": true }`.

**Files to create:**
- `app/api/v1/scan/route.ts`

**Files to modify:**
- `server/storage/types.ts` — add `findComparisonBrand(sector, excludeSlug, score)` method
- `server/storage/brand-index.ts` — implement comparison query

---

### Phase 4: Frontend — Scanner Page

**Goal:** Build `/agentic-shopping-score` — the public landing page with the big domain input.

**New file: `app/agentic-shopping-score/page.tsx`**

**Sections (above the fold):**
- Headline: "Can AI Shopping Agents Buy From Your Store?"
- Subhead: "Check how easily ChatGPT, Claude, and Gemini can find your products, search your catalog, and complete a purchase."
- Domain input field (full-width, prominent) with "Check Score" button
- Trust line: "No login required · Free · Results in seconds"

**Sections (below the fold):**
- "What We Check" — 8 signal cards in a grid
- "How It Works" — 5 steps
- "Recently Scanned" — last 5-10 scanned domains with scores (query scan_history)

**Loading state:** After submit, show animated progress steps (fetching homepage, checking structured data, analyzing search, evaluating checkout, detecting APIs, calculating score) with a progress bar. This is a client-side animation — the actual scan is a single API call that takes 5-15 seconds.

**On complete:** Redirect to `/agentic-shopping-score/[domain]`

**Components to create:**
- `app/agentic-shopping-score/page.tsx` — scanner page
- `components/agentic-score/domain-input.tsx` — the big input + button + validation
- `components/agentic-score/scan-progress.tsx` — animated loading state
- `components/agentic-score/signal-cards.tsx` — "What We Check" grid

**Files to modify:**
- `client/index.html` (or equivalent `app/layout.tsx`) — add meta tags for the scanner page

---

### Phase 5: Frontend — Results Page

**Goal:** Build `/agentic-shopping-score/[domain]` — the results page showing ASX Score, breakdown, recommendations, comparison, and SKILL.md preview.

**New file: `app/agentic-shopping-score/[domain]/page.tsx`**

**Sections:**
1. **Score header** — domain name, ASX Score in a circular gauge (color-coded), label ("Fair"), sector, scan date
2. **Score breakdown** — 8 horizontal bars, each showing signal name, score/max, filled bar, tooltip with details
3. **Recommendations** — grouped by impact (High / Medium / Quick Wins), each showing title, description, potential point gain. Summary: "If you implement all: 67 → 91 (+24 pts)"
4. **Brand comparison** — two-column table (your domain vs. one peer brand), all 8 signals as rows, color indicators (ahead/tied/behind), summary line. Omitted if no comparable brand exists.
5. **SKILL.md preview + download** — code block showing first 15 lines, "Download SKILL.md" and "Copy to clipboard" buttons
6. **Premium upsell** — card promoting Tier 2 premium scan

**Components to create:**
- `app/agentic-shopping-score/[domain]/page.tsx` — results page (SSR — fetch data server-side for SEO)
- `components/agentic-score/score-gauge.tsx` — circular gauge component
- `components/agentic-score/score-breakdown.tsx` — 8-signal breakdown bars
- `components/agentic-score/recommendations.tsx` — grouped recommendation cards
- `components/agentic-score/brand-comparison.tsx` — two-column comparison table
- `components/agentic-score/skill-preview.tsx` — SKILL.md preview + download

**SSR:** The results page should be server-side rendered. When a user or search engine hits `/agentic-shopping-score/staples.com`, the page fetches the latest scan from `brand_index` / `scan_history` and renders the full results. This makes results pages indexable by Google.

---

### Phase 6: Polish & SEO

**Goal:** Meta tags, sharing features, mobile polish, error handling.

**Tasks:**
- Dynamic `<title>` and `og:` meta tags on results pages (include domain name and score)
- Auto-generated OG image showing the score (optional — can defer)
- Mobile responsive layout for both pages
- Error states: invalid domain, unreachable site, timeout, scan in progress
- Loading skeleton while results load
- "Share your score" buttons with pre-filled text
- Validate domain input (strip protocol, www, trailing paths, reject non-domains)

---

## Technical Decisions

### One Pipeline, One Function

The scan uses the same `analyzeVendor()` function from the existing skill builder. The ASX Score is computed as a post-processing step on the same data. This means:

- One set of probes, one LLM call, one set of fetched pages
- The SKILL.md generated for the scan is identical in quality to the skill builder's output
- If the skill builder improves, the scan automatically improves
- No code duplication

### Extending the Existing Pipeline

The only changes to the existing pipeline are:

1. **Add two pages to the fetch list:** `sitemap.xml` and `robots.txt` (currently fetches homepage, /cart, /checkout, /business, /about)
2. **Extend the LLM prompt:** Ask Claude to also flag structured data types found (JSON-LD, Open Graph, microdata), whether the site appears mobile-responsive, and whether the robots.txt is bot-friendly. These feed into score signals.
3. **New post-processing module:** `score.ts` takes the `BuilderOutput` and computes the 8-signal breakdown

### SSR for Results Pages

Results pages (`/agentic-shopping-score/[domain]`) are server-rendered for SEO. Each scanned domain gets an indexable page with unique meta tags. This builds organic traffic over time as more domains get scanned.

### No Auth Required

The scanner page and results pages are fully public. No login, no account. The scan API has basic IP-rate limiting (5/hour) to prevent abuse.

### Score Stored in `brand_index`

The ASX Score goes into the existing `agentReadiness` field. The score breakdown goes into `brandData` JSONB (under a `scoreBreakdown` key). The full scan record (including historical scores) goes into the new `scan_history` table.

---

## File Summary

### New Files

| File | Purpose |
|---|---|
| `lib/procurement-skills/builder/score.ts` | ASX Score calculation engine (8 signals → 0-100) |
| `lib/procurement-skills/builder/recommendations.ts` | Generate recommendations from score gaps |
| `server/storage/scan-history.ts` | Storage methods for scan_history table |
| `app/api/v1/scan/route.ts` | Public scan API endpoint |
| `app/agentic-shopping-score/page.tsx` | Scanner landing page |
| `app/agentic-shopping-score/[domain]/page.tsx` | Results page (SSR) |
| `components/agentic-score/domain-input.tsx` | Domain input + validation + CTA |
| `components/agentic-score/scan-progress.tsx` | Animated loading state |
| `components/agentic-score/signal-cards.tsx` | "What We Check" grid |
| `components/agentic-score/score-gauge.tsx` | Circular score gauge |
| `components/agentic-score/score-breakdown.tsx` | 8-signal breakdown bars |
| `components/agentic-score/recommendations.tsx` | Grouped recommendation cards |
| `components/agentic-score/brand-comparison.tsx` | Side-by-side brand comparison table |
| `components/agentic-score/skill-preview.tsx` | SKILL.md preview + download/copy |

### Modified Files

| File | Change |
|---|---|
| `shared/schema.ts` | Add `scanHistory` table definition, types, insert schema |
| `server/storage/types.ts` | Add scan history + comparison brand methods to `IStorage` |
| `server/storage/index.ts` | Register scan-history module |
| `lib/procurement-skills/builder/analyze.ts` | Add sitemap.xml + robots.txt to page fetch list |
| `lib/procurement-skills/builder/llm.ts` | Extend prompt to extract score-relevant signals |
| `lib/procurement-skills/builder/types.ts` | Add ASX score types |

### Migration

One migration to add the `scan_history` table.

---

## Dependency Order

```
Phase 1 (Database)
  └─→ Phase 2 (Score Engine)
        └─→ Phase 3 (API Endpoint)
              └─→ Phase 4 (Scanner Page)
                    └─→ Phase 5 (Results Page)
                          └─→ Phase 6 (Polish)
```

Phases 1–3 are backend, phases 4–5 are frontend, phase 6 is cleanup. Phases 4 and 5 could be built in parallel if the API endpoint (Phase 3) is done, since they're independent pages.
