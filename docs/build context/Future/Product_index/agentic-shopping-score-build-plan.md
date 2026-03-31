# Agentic Shopping Score — Technical Build Plan

## Related Documents

| Document | What It Covers |
|---|---|
| `agentic-commerce-standard.md` | **Master standard** — metadata format, ASX Score pillars/signals/weights, AXS Rating algorithm |
| `creditclaw-agentic-commerce-strategy.md` | Go-to-market strategy, service tiers, revenue model, competitive positioning |
| `agent-readiness-and-product-index-service.md` | Three-tier service technical details, agent gateway |
| `scan-page-ux-design.md` | Page layouts, UX wireframes, SEO meta tags |
| `product-index-taxonomy-plan.md` | Google Product Taxonomy adoption |

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
| `fetch.ts` | Fetches pages with SSRF protection, strips scripts/styles, handles redirects | Yes — call as-is for supplementary fetches |
| `probes.ts` | Probes for x402, ACP, public APIs, MCP, business features | Yes — these feed directly into ASX Score signals via `analyzeVendor()` output |
| `llm.ts` | Sends page HTML to Claude, extracts structured e-commerce data | **DO NOT MODIFY** — existing callers depend on the current prompt and output shape |
| `analyze.ts` | Orchestrates fetch → probe → LLM → assemble VendorSkill draft | **DO NOT MODIFY** — existing callers (`/api/v1/skills/analyze`, `/api/v1/skills/submissions`) depend on current behavior |
| `types.ts` | TypeScript types for pages, probes, analysis results | Yes — extend with ASX score types (additive only) |

### Existing Callers of `analyzeVendor()` — DO NOT BREAK

| Endpoint | File | Uses `analyzeVendor()` |
|---|---|---|
| `POST /api/v1/skills/analyze` | `app/api/v1/skills/analyze/route.ts` | Yes — skill builder |
| `POST /api/v1/skills/submissions` | `app/api/v1/skills/submissions/route.ts` | Yes — community submissions |

Both callers depend on `analyzeVendor()` returning the current `BuilderOutput` shape. Modifying the fetch list adds latency to all callers. Modifying the LLM prompt risks changing the output structure.

### Database (`shared/schema.ts`)

The `brand_index` table already has:
- `agentReadiness` (integer, 0–100) — **DO NOT repurpose** — this is computed by `computeReadinessScore()` on every `upsertBrandIndex()` call using a different formula (hasMcp +25, hasApi +20, etc.). Catalog pages display it as 1-5 stars. Overwriting it with ASX Score would be immediately overwritten back by the next `upsertBrandIndex()` call.
- `skillMd` (text) — stores generated SKILL.md
- `brandData` (JSONB) — stores full VendorSkill data
- `sector`, `subSectors` — for brand comparison matching
- All capability flags (`hasMcp`, `hasApi`, `siteSearch`, `productFeed`, etc.)

### Storage Methods (`server/storage/types.ts`)

Already available:
- `searchBrands(filters)` — can query by sector for comparison
- `getBrandBySlug(slug)` / `getBrandById(id)` — fetch results
- `upsertBrandIndex(data)` — save brand data (auto-computes `agentReadiness` via `computeReadinessScore()`)
- `recomputeReadiness(slug)` — recomputes `agentReadiness` using the static formula

---

## Key Design Decisions (from self-review)

### 1. Do NOT modify `analyzeVendor()` or `llm.ts`

The scan endpoint calls `analyzeVendor()` **unchanged** to get the `BuilderOutput` (VendorSkill draft, evidence, probe results). It then does its own **supplementary fetches** (sitemap.xml, robots.txt) using the existing `fetchPage()` function from `fetch.ts`. The score engine takes both inputs.

**Why:** Two existing endpoints call `analyzeVendor()`. Changing the fetch list adds latency to all callers. Changing the LLM prompt risks altering the JSON structure they depend on.

### 2. Do NOT overwrite `agentReadiness`

The ASX Score is stored in `scan_history` only, not in `agentReadiness`. The `agentReadiness` field is auto-computed by `computeReadinessScore()` on every `upsertBrandIndex()` call using a completely different formula. These measure different things:

| Score | What It Measures | Formula | Where Stored |
|---|---|---|---|
| `agentReadiness` | Static technical capabilities (has API? has MCP? guest checkout?) | Additive checklist in `computeReadinessScore()` | `brand_index.agent_readiness` |
| ASX Score | How well a domain is optimized for AI shopping agents (8 crawl-based signals) | Weighted signals in `computeASXScore()` | `scan_history.overall_score` |

### 3. Do NOT auto-create `brand_index` entries from scans

The scan saves to `scan_history` only. If the scanned domain already matches an existing `brand_index` entry (by domain), the scan links to it via `brand_id`. The `brand_index` is the curated catalog — random scanned domains (personal blogs, non-commerce sites) should not create entries.

### 4. Score engine takes two inputs

The `computeASXScore()` function takes:
1. `BuilderOutput` from `analyzeVendor()` — provides capabilities, checkout data, LLM analysis, probe results, evidence
2. `SupplementaryCrawlData` — sitemap.xml content, robots.txt content, additional meta tag checks — fetched by the scan endpoint separately

This keeps the score engine decoupled from the skill builder pipeline.

### 5. Domain-based cooldown instead of IP-based rate limiting

Rather than implementing IP-based rate limiting (which requires an in-memory store or Redis), use domain-based cooldown via `scan_history`: can't re-scan the same domain within 1 hour. The caller can pass `force: true` to bypass. IP-based limits can be added later.

---

## Build Phases

### Phase 1: Database — `scan_history` Table

**Goal:** Add the `scan_history` table so we can store scan results separately from the brand catalog.

**Schema addition (`shared/schema.ts`):**

```sql
CREATE TABLE scan_history (
  id              SERIAL PRIMARY KEY,
  brand_id        INTEGER REFERENCES brand_index(id),   -- nullable, only set if domain matches existing brand
  domain          TEXT NOT NULL,
  domain_name     TEXT,                                  -- display name from LLM (e.g., "Staples")
  sector          TEXT,                                  -- sector detected by LLM
  scan_tier       TEXT NOT NULL DEFAULT 'free',          -- 'free' | 'premium' | 'full'
  overall_score   INTEGER NOT NULL,                      -- 0-100 ASX Score
  score_breakdown JSONB NOT NULL,                        -- 8-signal breakdown
  recommendations JSONB,                                 -- generated recommendations
  skill_md        TEXT,                                  -- generated SKILL.md content
  builder_output  JSONB,                                 -- raw BuilderOutput for debugging/reprocessing
  scanned_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  scanned_by      TEXT DEFAULT 'anonymous'               -- user ID or 'anonymous'
);

CREATE INDEX scan_history_domain_idx ON scan_history(domain);
CREATE INDEX scan_history_brand_id_idx ON scan_history(brand_id);
CREATE INDEX scan_history_scanned_at_idx ON scan_history(scanned_at DESC);
```

**`score_breakdown` JSONB shape:**

```typescript
interface ASXScoreBreakdown {
  structuredData:        { score: number; max: 20; details: string };
  sitemapQuality:        { score: number; max: 10; details: string };
  searchFunctionality:   { score: number; max: 15; details: string };
  checkoutAccessibility: { score: number; max: 15; details: string };
  apiAvailability:       { score: number; max: 15; details: string };
  botFriendliness:       { score: number; max: 10; details: string };
  mobileResponsive:      { score: number; max: 5;  details: string };
  mcpUcpSupport:         { score: number; max: 10; details: string };
}
```

**Storage methods to add:**
- `createScanHistory(data: InsertScanHistory): Promise<ScanHistory>`
- `getScanHistoryByDomain(domain: string): Promise<ScanHistory[]>`
- `getLatestScanByDomain(domain: string): Promise<ScanHistory | null>`
- `getRecentScans(limit: number): Promise<ScanHistory[]>`

**Files to modify:**
- `shared/schema.ts` — add `scanHistory` table, types, insert schema
- `server/storage/types.ts` — add scan history methods to `IStorage`
- `server/storage/` — new `scan-history.ts` module
- `server/storage/index.ts` — register new module
- Run migration

---

### Phase 2: ASX Score Calculation Engine

**Goal:** Build a self-contained scoring module that fetches a domain's public surface and produces a 0-100 ASX Score with breakdown across 3 pillars and 10 signals.

**New directory: `lib/agentic-score/`**

This is NOT inside `lib/procurement-skills/builder/`. The score engine is completely independent of `analyzeVendor()` — it does its own fetching and analysis. See "Future: Skill Builder / analyzeVendor() Improvements" section at the bottom of this document for how these two systems relate.

**Input:**

```typescript
interface ScoreInput {
  domain: string;                     // e.g. "staples.com"
  homepageHtml: string;              // raw HTML (including <script> tags for JSON-LD)
  sitemapContent: string | null;      // raw sitemap.xml content
  robotsTxtContent: string | null;    // raw robots.txt content
  pageLoadTimeMs: number | null;      // time to fetch homepage in ms
}
```

The scanner fetches all inputs itself (homepage, /sitemap.xml, /robots.txt) in parallel before calling the score engine. No dependency on `analyzeVendor()`, `fetchPage()`, or `BuilderOutput`.

**Scoring logic — 3 Pillars, 10 Signals, 100 Points:**

#### Clarity (40 points) — "Can agents find your products?"

| Signal | Max | How It's Scored | Data Source |
|---|---|---|---|
| **JSON-LD / Structured Data** | 20 | JSON-LD Product schema present? Open Graph product tags? Schema.org markup? Multiple product types detected? | Parse `<script type="application/ld+json">` from raw homepage HTML, check for OG tags |
| **Product Feed / Sitemap** | 10 | Does `/sitemap.xml` exist? Valid XML? Contains product URLs (not just pages)? Linked from robots.txt? | `sitemapContent` fetch |
| **Clean HTML / Semantic Markup** | 10 | Well-structured DOM? Semantic HTML5 elements? Reasonable tag nesting? Accessible landmarks? | Parse homepage HTML structure |

#### Speed (25 points) — "Can agents search and navigate quickly?"

| Signal | Max | How It's Scored | Data Source |
|---|---|---|---|
| **Search API / MCP** | 10 | Programmatic search API detected? MCP endpoint? OpenAPI/Swagger docs? x402/ACP/A2A protocol? | Check for `/api/`, `/.well-known/mcp.json`, OpenAPI links in HTML, MCP/protocol headers |
| **Internal Site Search** | 10 | On-site search form present? Search URL template discoverable? Returns structured results? | Parse homepage HTML for search forms, `<link rel="search">`, opensearch.xml |
| **Page Load Performance** | 5 | Homepage load time under thresholds (< 1s = full, < 2s = partial, > 3s = 0) | `pageLoadTimeMs` from fetch timing |

#### Reliability (35 points) — "Can agents complete a purchase?"

| Signal | Max | How It's Scored | Data Source |
|---|---|---|---|
| **Access & Authentication** | 10 | Guest checkout available? No mandatory registration? Clear auth paths? No phone verification walls? | Check for guest checkout indicators, account-wall detection in HTML |
| **Order Management** | 10 | Can an agent select product variants (size/color/qty)? Predictable cart URLs? Clear add-to-cart flows? Editable shipping address forms? | Parse product pages for variant selectors, cart URL patterns, form structures |
| **Checkout Flow** | 10 | Discount/voucher fields discoverable? Payment methods clearly labeled? Shipping options described with enough detail for agent comprehension? If programmatic checkout exists (MCP/CLI/API), does it include these options? | Analyze checkout URL patterns, payment/shipping option markup |
| **Bot Tolerance** | 5 | robots.txt allows crawling? No CAPTCHA on landing pages? No aggressive bot-blocking? Reasonable crawl-delay? | `robotsTxtContent` analysis |

**Note on Reliability:** These are proxy measurements from a scan. True reliability is measured through the crowd-sourced AXS Rating system (search accuracy, stock reliability, checkout completion) — which is a separate, untouched system.

**Note on Checkout Flow vs programmatic checkout:** If a site has MCP, CLI, or API-based checkout that includes product selection, cart management, discount application, and payment — the browser-control assessment of Order Management and Checkout Flow becomes less relevant. The score engine should give full or near-full marks on those signals when programmatic checkout is detected.

**Output:**

```typescript
interface ASXScoreResult {
  overallScore: number;           // 0-100
  breakdown: ASXScoreBreakdown;   // per-pillar and per-signal scores
  recommendations: ASXRecommendation[];
  label: "Poor" | "Needs Work" | "Fair" | "Good" | "Excellent";
}

interface ASXScoreBreakdown {
  clarity: { score: number; max: 40; signals: SignalScore[] };
  speed: { score: number; max: 25; signals: SignalScore[] };
  reliability: { score: number; max: 35; signals: SignalScore[] };
}

interface SignalScore {
  key: string;               // e.g. "json_ld", "bot_tolerance"
  label: string;             // e.g. "JSON-LD / Structured Data"
  score: number;
  max: number;
  detail: string;            // human-readable explanation of what was found
}

interface ASXRecommendation {
  signal: string;
  impact: "high" | "medium" | "low";
  title: string;
  description: string;
  potentialGain: number;          // how many points this could add
}
```

**Label thresholds:**
- 0–20: "Poor"
- 21–40: "Needs Work"
- 41–60: "Fair"
- 61–80: "Good"
- 81–100: "Excellent"

**Files to create:**
- `lib/agentic-score/types.ts` — ASX score types (ScoreInput, ASXScoreResult, ASXScoreBreakdown, SignalScore, ASXRecommendation)
- `lib/agentic-score/compute.ts` — scoring engine (takes ScoreInput, returns ASXScoreResult)
- `lib/agentic-score/signals/` — individual signal detection modules (one per signal or grouped by pillar)
- `lib/agentic-score/recommendations.ts` — generates recommendations from score gaps

**Files to modify:** None. This is fully self-contained.

---

### Phase 3: Scan API Endpoint

**Goal:** A public API endpoint that accepts a domain, runs the pipeline, and returns ASX Score + SKILL.md + comparison brand.

**New file: `app/api/v1/scan/route.ts`**

```
POST /api/v1/scan
Content-Type: application/json

{ "domain": "staples.com" }
```

**Pipeline:**

```
1. Validate + normalize domain (strip protocol, www, trailing paths)
2. Check scan_history for recent scan (< 1 hour) → return cached result if not force
3. Call analyzeVendor(`https://${normalizedDomain}`) — UNCHANGED function
4. Fetch supplementary data in parallel:
   a. fetchPage(`https://${normalizedDomain}/sitemap.xml`)
   b. fetchPage(`https://${normalizedDomain}/robots.txt`)
5. Call computeASXScore({ builderOutput, sitemapContent, robotsTxtContent, homepageHtml })
6. Generate SKILL.md using existing generateVendorSkill() from the BuilderOutput draft
7. Look up existing brand_index entry by domain (if exists, get brand_id for linking)
8. Create scan_history record (link to brand_id if found, store score + breakdown + recommendations + skillMd)
9. Find comparison brand: query brand_index for same sector, exclude self domain, order by agentReadiness DESC, limit 1
10. Return response
```

**Response shape:**

```typescript
{
  domain: string;
  name: string;                     // detected store name
  score: number;
  label: string;
  sector: string | null;
  breakdown: ASXScoreBreakdown;
  recommendations: ASXRecommendation[];
  skillMd: string;
  comparison: {
    brand: { name: string; slug: string; domain: string; sector: string };
    agentReadiness: number;         // their agentReadiness score (different scale, but shows relative position)
  } | null;
  scanId: number;
  scannedAt: string;
  cached: boolean;                  // true if returned from cache
}
```

**Note on comparison:** The comparison brand uses `agentReadiness` (the existing static score), not ASX Score. This is intentional — the comparison shows "here's a brand in the same sector that's already in our curated catalog." The comparison is informational, not a direct score-to-score matchup. We can enhance this later by re-scanning comparison brands.

**Domain-based cooldown:** If the same domain was scanned in the last hour, return the cached result from `scan_history`. The caller can pass `{ "domain": "...", "force": true }` to bypass.

**Files to create:**
- `app/api/v1/scan/route.ts`

**Files to modify:**
- `server/storage/types.ts` — add `findComparisonBrand(sector, excludeDomain)` method
- `server/storage/brand-index.ts` — implement comparison query (simple: same sector, highest agentReadiness, exclude the scanned domain)

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
- "How It Works" — 3-5 steps
- "Recently Scanned" — last 5-10 scanned domains with scores (query `scan_history` via `getRecentScans()`)

**Loading state:** After submit, show animated progress steps (fetching homepage → checking structured data → analyzing search → evaluating checkout → detecting APIs → calculating score) with a progress bar. This is a client-side animation — the actual scan is a single API call that takes 5-15 seconds.

**On complete:** Redirect to `/agentic-shopping-score/[domain]`

**Components to create:**
- `app/agentic-shopping-score/page.tsx` — scanner page
- `components/agentic-score/domain-input.tsx` — the big input + button + validation
- `components/agentic-score/scan-progress.tsx` — animated loading state
- `components/agentic-score/signal-cards.tsx` — "What We Check" grid

---

### Phase 5: Frontend — Results Page

**Goal:** Build `/agentic-shopping-score/[domain]` — the results page showing ASX Score, breakdown, recommendations, comparison, and SKILL.md preview.

**New file: `app/agentic-shopping-score/[domain]/page.tsx`**

**Sections:**
1. **Score header** — domain name, ASX Score in a circular gauge (color-coded), label ("Fair"), sector, scan date
2. **Score breakdown** — 8 horizontal bars, each showing signal name, score/max, filled bar, tooltip with details
3. **Recommendations** — grouped by impact (High / Medium / Quick Wins), each showing title, description, potential point gain. Summary: "If you implement all: 67 → 91 (+24 pts)"
4. **Brand comparison** — two-column table (your domain vs. one peer brand from curated catalog), key signals as rows, summary line. Omitted if no comparable brand exists.
5. **SKILL.md preview + download** — code block showing first 15 lines, "Download SKILL.md" and "Copy to clipboard" buttons
6. **Premium upsell** — card promoting Tier 2 premium scan
7. **Re-scan button** — "Scan Again" button that forces a fresh scan

**SSR:** The results page is server-side rendered. When a user or search engine hits `/agentic-shopping-score/staples.com`, the page queries `scan_history` for the latest scan of that domain and renders the full results. If no scan exists for the domain, show a "Not yet scanned" state with a CTA to scan it.

**Components to create:**
- `app/agentic-shopping-score/[domain]/page.tsx` — results page (SSR)
- `components/agentic-score/score-gauge.tsx` — circular gauge component
- `components/agentic-score/score-breakdown.tsx` — 8-signal breakdown bars
- `components/agentic-score/recommendations.tsx` — grouped recommendation cards
- `components/agentic-score/brand-comparison.tsx` — comparison with curated catalog brand
- `components/agentic-score/skill-preview.tsx` — SKILL.md preview + download/copy

---

### Phase 6: Polish & SEO

**Goal:** Meta tags, sharing features, mobile polish, error handling.

**Tasks:**
- Dynamic `<title>` and `og:` meta tags on results pages (include domain name and score)
- Mobile responsive layout for both pages
- Error states: invalid domain, unreachable site, timeout, scan in progress
- Loading skeleton while results load
- "Share your score" buttons with pre-filled text
- Validate domain input client-side (strip protocol, www, trailing paths, reject non-domains)

---

## File Summary

### New Files

| File | Purpose |
|---|---|
| `lib/agentic-score/compute.ts` | ASX Score calculation engine (8 signals → 0-100) |
| `lib/agentic-score/recommendations.ts` | Generate recommendations from score gaps |
| `lib/agentic-score/types.ts` | ASX score types (breakdown, recommendation, result) |
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
| `components/agentic-score/brand-comparison.tsx` | Comparison with curated catalog brand |
| `components/agentic-score/skill-preview.tsx` | SKILL.md preview + download/copy |

### Modified Files

| File | Change |
|---|---|
| `shared/schema.ts` | Add `scanHistory` table definition, types, insert schema |
| `server/storage/types.ts` | Add scan history + comparison brand methods to `IStorage` |
| `server/storage/index.ts` | Register scan-history module |
| `server/storage/brand-index.ts` | Add `findComparisonBrand(sector, excludeDomain)` method |

### Files NOT Modified

| File | Why |
|---|---|
| `lib/procurement-skills/builder/analyze.ts` | Existing callers depend on current fetch list and behavior |
| `lib/procurement-skills/builder/llm.ts` | Existing callers depend on current prompt and output format |
| `server/storage/brand-index.ts` `computeReadinessScore()` | Separate scoring system, different purpose |
| `brand_index.agentReadiness` column | Different score, different formula, auto-computed on upsert |

### Migration

One migration to add the `scan_history` table.

---

## Dependency Order

```
Phase 1 (Database)
  └─→ Phase 2 (Score Engine)
        └─→ Phase 3 (API Endpoint)
              └─→ Phase 4 (Scanner Page) ─┐
              └─→ Phase 5 (Results Page) ──┤ (can run in parallel after Phase 3)
                                           └─→ Phase 6 (Polish)
```

Phases 1–3 are backend, phases 4–5 are frontend (can be built in parallel once the API exists), phase 6 is cleanup.

---

## Future: Skill Builder / analyzeVendor() Improvements

The existing `analyzeVendor()` function (in `lib/procurement-skills/builder/analyze.ts`) powers the skill builder pipeline — it fetches a homepage, sends cleaned HTML to an LLM, and extracts a full `VendorSkill` object (sector, sub-sectors, checkout methods, capabilities, payment methods, etc.). It works but has known limitations:

- **Single-page analysis** — Only looks at the homepage (and sometimes linked pages). Misses API docs, product feeds in sitemaps, and deep category structures.
- **LLM-only taxonomy** — Categories are inferred by the LLM from page content, leading to inconsistent taxonomy across brands.
- **No structured crawling** — Can't handle JavaScript-heavy SPAs or sites that require rendering.

### Tools to Investigate

| Tool | What It Could Improve |
|---|---|
| **Firecrawl** (`github.com/mendableai/firecrawl`) | Multi-page crawling, JS rendering, structured content extraction. Would dramatically improve category detection, checkout flow discovery, and capability identification. Could replace the basic `fetchPage()` with a much richer crawl. |
| **Exa Web Sets** (`exa.ai`) | Pre-built category taxonomies and web-scale entity matching. Could provide a standardized product taxonomy (aligned with Google Product Taxonomy) that we match brands against, rather than asking the LLM to invent categories each time. Would make taxonomy consistent across the entire index. |

### How This Relates to the ASX Score Scanner

The ASX Score scanner (this build plan) and `analyzeVendor()` are intentionally separate:

- **ASX Score scanner** = lightweight, fast, public-facing. Runs 8 signal checks on a single homepage fetch. Does NOT call `analyzeVendor()`.
- **`analyzeVendor()`** = deep, rich, used when onboarding brands to the index. Builds full procurement skills.

Future opportunity: after a free scan, offer to run the full `analyzeVendor()` pipeline as an upsell ("Want us to build a complete procurement skill for your store?"). But the two should remain separate functions with separate fetch paths.

### Priority

This is a **post-launch improvement** — not blocking the ASX Score Scanner build. Revisit once the scanner is live and generating leads.
