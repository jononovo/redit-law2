# Phase 3: Unified Scan API — Technical Plan

**Status:** Planning
**Depends on:** Phase 0 (complete), Phase 2 (complete)
**Outcome:** `POST /api/v1/scan` — a public endpoint that deeply scans a merchant domain and returns an ASX Score, signal breakdown, recommendations, standardized taxonomy, and SKILL.md

---

## First Principles

The scan is CreditClaw's first impression — the lead gen tool. It needs to be as deep and valuable as possible while completing in ~15 seconds. One scan, one pipeline, everything gathered once and saved once.

**What a merchant wants:**
1. How visible are my products to AI agents?
2. How easily can an AI agent search my store?
3. Can an AI agent actually buy something?
4. What should I fix first?

**What CreditClaw wants from every scan:**
1. A rich `brand_index` entry (name, sector, sub-sectors, capabilities — not stubs)
2. Standardized taxonomy so agents can discover vendors by category
3. A SKILL.md file ready for agent consumption — with correct metadata categories
4. Every scan grows the index — a data flywheel

---

## Two External Services

The scan uses two external services. Each does one thing that the other can't.

### Firecrawl (`firecrawl.dev`) — Page Rendering

**What it does:** Renders JavaScript-heavy pages and returns the real DOM. Replaces raw `fetch()`.

**Why we need it:** ~40% of e-commerce sites (Shopify, WooCommerce, modern SPAs) return empty HTML shells to raw `fetch()`. Without JS rendering, the score engine sees almost nothing — no products, no JSON-LD, no search forms. The score would be artificially low for what are actually well-built stores. Every signal in our scoring engine depends on HTML content. If the HTML is empty, the score is wrong.

**How it fits:** Replaces the fetch layer in `lib/scan/fetch.ts`. Instead of `fetch(url)`, we call Firecrawl's `/v1/scrape` endpoint. Same `ScanPages` output shape, dramatically richer content. The rest of the pipeline (scoring, LLM analysis, probes) doesn't change — it just gets better input.

**API used:** `POST /v1/scrape` — 1 credit per page, returns rendered HTML + markdown.

**Cost:** ~5-7 credits per scan (homepage + cart + checkout + business + about + sitemap check + robots.txt). At Standard plan ($83/mo for 100k credits), that's ~$0.006 per scan. We also need the JSON extraction format for Firecrawl's schema-based extraction on the homepage (+4 credits), bringing per-scan cost to ~$0.01.

**Fallback:** If Firecrawl is unavailable, fall back to raw `fetch()`. Score may be lower for JS-heavy sites, but the scan still completes. Set `partial: true` with a note.

### Claude (Anthropic) — Checkout Flow Analysis + Taxonomy Classification

**What it does:** Analyzes rendered page content for two purposes:
1. **Checkout flow analysis:** Understands checkout flows, payment methods, cart behavior, guest checkout availability. Already exists in `lib/procurement-skills/builder/llm.ts`.
2. **Taxonomy classification:** Maps the merchant to Google Product Taxonomy categories (L2 and L3) by examining navigation menus, breadcrumbs, product sections, and page structure.

**Why Claude handles taxonomy (not Exa):** Claude already sees the Firecrawl-rendered DOM — navigation menus, product sections, breadcrumbs. By providing Claude with the 192 L2 Google Product Taxonomy categories as a fixed option list, it can map the merchant to multiple categories with high accuracy. This is more grounded than entity-level classification because it's based on what the store actually displays. The CreditClaw sector mapping then derives automatically from the `sector_slug` column on the `ucp_categories` table — no guessing needed.

**Decision rationale (April 2026):** Exa was evaluated for taxonomy classification but deferred. Exa's strength is merchant *discovery* (finding unknown sites by category), not classifying a known site whose pages we've already rendered. For classification of a single known URL, Claude with a fixed category list is more accurate, more deterministic, and eliminates an external dependency. If taxonomy results prove insufficient, Exa can be added later specifically for this purpose.

**How it fits:** Called in parallel with probes after Firecrawl fetches pages. Receives stripped HTML (scripts/styles removed for token efficiency). Output feeds into:
1. Score enhancement (floor principle: can only boost signals)
2. SKILL.md vendor data
3. Taxonomy categories → `brand_categories` junction table + `brand_index.sector`/`subSectors`

**Taxonomy standard:** Google Product Taxonomy, 3 levels deep for merchants.
- **Layer 1:** CreditClaw's 21 sectors (retail, office, fashion, etc.) — derived from `ucp_categories.sector_slug`
- **Layer 2:** ~192 Google L2 categories (Audio, Computers, Shoes, Power Tools, etc.)
- **Layer 3:** ~1,349 Google L3 categories (Headphones, Laptops, Athletic Shoes, etc.)
- A merchant can belong to **multiple** sectors and categories (e.g., Home Depot → construction + home, with Hardware > Power Tools, Home & Garden > Bathroom Accessories, etc.)
- See `merchant-taxonomy-schema-note.md` for full schema and `ucp_categories` / `brand_categories` table design

**No changes to the existing checkout analysis prompt or logic.** Taxonomy classification is an additional task in the same Claude call or a separate parallel call, depending on implementation.

**Cost:** ~$0.01 per scan (Claude call for checkout + taxonomy combined). No additional external service cost.

**Fallback:** If Claude is unavailable, regex-only score with `partial: true` and sector set to "uncategorized". Taxonomy can be populated on next successful scan.

---

## Two Modules, Clear Responsibilities

### `lib/scan/` — Data Gathering + Scoring

Owns ALL data collection: Firecrawl page rendering, API probing, Claude analysis (checkout + taxonomy), and scoring. This is the intelligence step. It gathers everything once, scores it, saves everything, and passes the results forward.

### `lib/procurement-skills/` — Skill Transformation (unchanged)

A pure transformer. Takes structured data that the scan already gathered and formats it into a SKILL.md. No fetching, no analyzing, no LLM calls. Data in, skill file out.

`lib/procurement-skills/types.ts` stays where it is — it's imported across 12+ files in the app (label maps, type definitions, UI rendering). This is a shared type library, not a scan dependency.

### The Flow

```
lib/scan/run.ts                     → gathers all data (Firecrawl + Claude + probes), scores, saves to DB
  ↓ passes BuilderOutput (with Claude-classified taxonomy in metadata)
lib/procurement-skills/generator.ts → transforms into SKILL.md string (metadata categories are already correct)
  ↓ returns skillMd
lib/scan/run.ts                     → saves skillMd to brand_index, returns everything
```

If skill generation needs to run again later (format update, re-generation), it reads `brandData` from the DB — no re-scan needed.

---

## `lib/scan/` — File Structure

```
lib/scan/
├── types.ts              All scan-specific types (ScoreInput, ScanResult, SignalKey, TaxonomyResult, etc.)
├── fetch.ts              Firecrawl-powered fetching — rendered HTML + stripped HTML + sitemap + robots.txt
├── probes.ts             API/protocol detection (x402, ACP, MCP, business features)
├── llm.ts                Claude analysis of page content → structured vendor data + taxonomy classification
├── score.ts              computeASXScore() — regex signals + LLM enhancement in one place
├── signals/
│   ├── clarity.ts        3 signals: JSON-LD, Sitemap, Clean HTML
│   ├── speed.ts          3 signals: Search API, Site Search, Page Load
│   └── reliability.ts    4 signals: Access, Order, Checkout, Bot Tolerance
├── recommendations.ts    Generate prioritized recommendations from signal scores
├── run.ts                runScan() — the single entry point, orchestrates everything
└── index.ts              Barrel exports
```

**11 files. Each file does exactly one thing. The name tells you what it does.**

### What happens to existing code

| Current file | What happens | Why |
|---|---|---|
| `lib/agentic-score/types.ts` | → `lib/scan/types.ts` | Rename + add Firecrawl/taxonomy types |
| `lib/agentic-score/fetch.ts` | → `lib/scan/fetch.ts` | Rewrite: Firecrawl replaces raw fetch, merge with builder/fetch.ts |
| `lib/agentic-score/compute.ts` | → `lib/scan/score.ts` | Rename + add LLM enhancement logic |
| `lib/agentic-score/recommendations.ts` | → `lib/scan/recommendations.ts` | Move, unchanged |
| `lib/agentic-score/signals/*` | → `lib/scan/signals/*` | Move, unchanged |
| `lib/agentic-score/index.ts` | → `lib/scan/index.ts` | Updated exports |
| `lib/procurement-skills/builder/fetch.ts` | Absorbed into `lib/scan/fetch.ts` | Firecrawl replaces both fetch modules |
| `lib/procurement-skills/builder/probes.ts` | → `lib/scan/probes.ts` | Move — probing is data collection, belongs in scan |
| `lib/procurement-skills/builder/llm.ts` | → `lib/scan/llm.ts` | Move — LLM analysis is data collection, belongs in scan |
| `lib/procurement-skills/builder/analyze.ts` | Absorbed into `lib/scan/run.ts` | The orchestration logic becomes part of the scan orchestrator |
| `lib/procurement-skills/builder/types.ts` | Absorbed into `lib/scan/types.ts` | BuilderOutput, PageContent, LLMCheckoutAnalysis merge into scan types |
| `lib/procurement-skills/generator.ts` | Stays | Pure transformer, no changes |
| `lib/procurement-skills/types.ts` | Stays | Shared types used across 12+ app files |
| (no separate taxonomy file) | Taxonomy classification handled by Claude in `lib/scan/llm.ts` | Simpler — one LLM call handles both checkout analysis and taxonomy |

**After the move:**
```
lib/procurement-skills/
├── types.ts              Shared types (VendorSkill, CheckoutMethod, labels, etc.) — UNCHANGED
├── generator.ts          generateVendorSkill() — pure data→SKILL.md transformer — UNCHANGED
└── builder/              EMPTY — delete directory
```

### Callers that need import updates

| File | Current import | New import |
|---|---|---|
| `app/api/v1/skills/submissions/route.ts` | `analyzeVendor` from `builder/analyze` | `runScan` from `lib/scan` (or keep analyzeVendor as re-export) |
| `app/api/v1/skills/analyze/route.ts` | `analyzeVendor` from `builder/analyze` | Same |

Only 2 files import from `builder/`. We can either update them or add a re-export in `lib/scan/index.ts` for backward compatibility.

---

## `lib/scan/fetch.ts` — Firecrawl-Powered Fetching

This is where raw `fetch()` gets replaced with Firecrawl. One file handles all page rendering with SSRF protection as a secondary fallback.

**Exports:**

```typescript
normalizeDomain(input: string): string
fetchScanPages(domain: string): Promise<ScanPages>
```

**`ScanPages` contains everything, fetched once:**

```typescript
interface ScanPages {
  domain: string;
  homepageRaw: string;           // Full rendered HTML with scripts — for score signals (JSON-LD, CAPTCHA detection)
  homepageStripped: string;      // Stripped HTML — for LLM token efficiency
  cartPage: PageContent | null;  // /cart — stripped
  checkoutPage: PageContent | null; // /checkout — stripped
  businessPage: PageContent | null; // /business — stripped
  aboutPage: PageContent | null; // /about — stripped
  sitemapContent: string | null; // /sitemap.xml
  robotsTxtContent: string | null; // /robots.txt
  pageLoadTimeMs: number;        // Time to fetch homepage
  fetchMethod: "firecrawl" | "raw"; // Which method was used
}
```

**How it works:**
1. Normalize domain
2. Call Firecrawl `/v1/scrape` for each URL in parallel (homepage, cart, checkout, business, about)
   - Homepage uses `formats: ["html", "rawHtml"]` — `rawHtml` keeps scripts for score engine, `html` is cleaned for LLM
   - Other pages use `formats: ["html"]` — stripped only, they're for LLM consumption
   - `onlyMainContent: true` for non-homepage pages to reduce noise
3. Fetch sitemap.xml and robots.txt with raw `fetch()` (no JS rendering needed — they're plain text/XML)
4. If Firecrawl is unavailable, fall back to raw `fetch()` with SSRF protection for all URLs. Set `fetchMethod: "raw"`.
5. Return everything in one object

**Firecrawl credit cost per scan:** ~9 credits (5 pages at 1 credit each + homepage JSON extraction at 4 credits)

**SSRF protection stays** — used for the raw `fetch()` fallback path and for sitemap/robots.txt which don't need rendering.

---

## Taxonomy Classification — Claude + `ucp_categories` Table

Taxonomy classification is handled by Claude as part of the LLM analysis step (in `lib/scan/llm.ts`), not as a separate service. Claude receives the Firecrawl-rendered DOM and the list of ~192 L2 Google Product Taxonomy categories, and returns which categories the merchant sells in.

**Output type:**

```typescript
interface TaxonomyResult {
  sectors: string[];       // CreditClaw sectors (derived from ucp_categories.sector_slug)
  googleL2Categories: string[];  // Google L2 category names matched
  googleL3Categories: string[];  // Google L3 category names matched (optional, for richer data)
  confidence: number;      // 0-1 confidence score
  source: "claude";        // Classification method
}
```

**How it works:**

1. Claude receives stripped homepage HTML (navigation menus, breadcrumbs, product sections)
2. Claude is given the ~192 L2 Google Product Taxonomy categories as a fixed option list
3. Claude selects all matching L2 categories (a merchant can span multiple)
4. CreditClaw sectors are derived via database lookup: `SELECT DISTINCT sector_slug FROM ucp_categories WHERE name IN (...matched categories)`
5. No separate API call needed — taxonomy is part of the same Claude analysis that handles checkout flow

**Prerequisite:** The `ucp_categories` table must be seeded with Google's taxonomy file before taxonomy classification can produce sector mappings. Until seeded, scans set `sector: "uncategorized"`.

**Google Product Taxonomy reference:** See `merchant-taxonomy-schema-note.md` for the full 21 root categories, CreditClaw sector mappings, and the `ucp_categories` / `brand_categories` schema.

**Fallback:** If Claude is unavailable, sector stays "uncategorized" and taxonomy is populated on next successful scan.

---

## `lib/scan/score.ts` — Scoring + LLM Enhancement

Combines what was `compute.ts` and the planned `enhance.ts` into one file. The score computation and LLM enhancement are one concern: "what's the ASX score?"

```typescript
function computeASXScore(pages: ScanPages, llmFindings: LLMCheckoutAnalysis | null): ASXScoreResult
```

**How it works:**

1. Run all 10 regex-based signal scorers against the raw rendered data (unchanged logic, but now operating on Firecrawl-rendered DOM instead of server HTML)
2. If LLM findings are available, apply floor-based enhancement to applicable signals:

| Signal | LLM can upgrade from | Max boost |
|---|---|---|
| `access_auth` | LLM confirms guest checkout from /checkout page | +5 pts |
| `order_management` | LLM found cart management, variant selection | +4 pts |
| `checkout_flow` | LLM found payment methods, shipping options on checkout page | +4 pts |
| `search_api` | LLM extracted actual search URL template | +3 pts |
| `site_search` | LLM confirmed search functionality | +2 pts |

3. Enhancement can only increase scores, never decrease (floor principle)
4. Generate recommendations from final signal scores
5. Return `ASXScoreResult`

Signals that stay regex-only (LLM doesn't help):
- `json_ld` — requires raw `<script>` tags (Firecrawl's `rawHtml` preserves these)
- `product_feed` — binary: sitemap exists or doesn't
- `clean_html` — DOM structure analysis
- `page_load` — timing measurement
- `bot_tolerance` — robots.txt rules + CAPTCHA script detection

---

## `lib/scan/run.ts` — The Orchestrator

Single entry point. Coordinates Firecrawl → (Claude + Exa + probes in parallel) → score → skill generation.

```typescript
interface ScanResult {
  domain: string;
  name: string;
  sector: string;                    // From Claude taxonomy (mapped via ucp_categories)
  subSectors: string[];              // From Claude taxonomy (Google L2/L3 categories)
  score: ASXScoreResult;
  vendorDraft: Partial<VendorSkill>; // Structured vendor data from Claude + probes
  skillMd: string | null;            // null if Claude failed (graceful degradation)
  scannedAt: Date;
  partial: boolean;                  // true if Claude failed and results are regex-only
  fetchMethod: "firecrawl" | "raw";  // How pages were fetched
}

async function runScan(domain: string): Promise<ScanResult>
```

**Pipeline:**

```
1. fetchScanPages(domain)                    → ScanPages via Firecrawl (all 7 pages, ~3-5s)

2. In parallel:
   ├── probeForAPIs(domain)                  → checkout methods, API endpoints (~2-3s)
   ├── detectBusinessFeatures(domain)        → capabilities (~2-3s)
   └── analyzeCheckoutFlow(strippedPages)    → Claude structured data + taxonomy (~5-10s)

3. Merge all results into vendorDraft (Partial<VendorSkill>):
   - sector + subSectors from Claude taxonomy classification (mapped via ucp_categories)
   - capabilities from probes
   - checkoutMethods from probes + Claude
   - name from Claude > Firecrawl extraction > <title> tag > capitalize(domain)
   - All other vendor fields from Claude analysis

4. computeASXScore(pages, llmFindings)       → ASXScoreResult (<10ms)

5. generateVendorSkill(vendorDraft)          → SKILL.md string (<10ms)
   (metadata section already has correct categories from Claude taxonomy)

6. Return ScanResult
```

**Timing:**
```
Step 1: Firecrawl fetch             3-5s   (7 URLs in parallel via Firecrawl)
Step 2: probes + Claude              5-10s  (all parallel, Claude dominates)
Steps 3-6: computation             <100ms

Total: ~8-15 seconds (steps 1 and 2 are sequential; within each, everything is parallel)
```

**Graceful degradation layers:**

| Service down | Impact | Fallback |
|---|---|---|
| Firecrawl unavailable | JS-heavy sites score lower | Raw `fetch()`, `fetchMethod: "raw"` |
| Claude unavailable | No LLM score enhancement, no checkout analysis, no taxonomy | Regex-only score, `partial: true`, `skillMd: null`, `sector: "uncategorized"` |
| Both down | Minimal scan | Raw fetch + regex scoring only. Still produces a score. |

The scan never fails completely. Every degradation level still returns a usable score and recommendations.

---

## `lib/scan/llm.ts` — Claude Analysis

Moved from `lib/procurement-skills/builder/llm.ts`. Same Claude call, same prompt, same output. The only change: it receives `PageContent[]` from Firecrawl-rendered content instead of raw HTML — which means it sees the actual page content for JS-heavy sites.

```typescript
function analyzeCheckoutFlow(pages: PageContent[], baseUrl: string): Promise<{
  analysis: Partial<LLMCheckoutAnalysis>;
  confidence: Record<string, number>;
  evidence: AnalysisEvidence[];
}>
```

No changes to the prompt or logic. Just a new home and better input.

---

## `lib/scan/probes.ts` — API/Protocol Detection

Moved from `lib/procurement-skills/builder/probes.ts`. Same probe logic.

**One change:** Currently uses its own `probeUrl()` and `fetchPage()` from `builder/fetch.ts`. After the move, it imports from `lib/scan/fetch.ts` instead. Same SSRF protection, same behavior, no duplication.

```typescript
function probeForAPIs(baseUrl: string): Promise<{ methods: CheckoutMethod[]; evidence: AnalysisEvidence[] }>
function detectBusinessFeatures(baseUrl: string): Promise<{ capabilities: string[]; evidence: AnalysisEvidence[] }>
function checkProtocolSupport(baseUrl: string, methods: string[]): Promise<{ methodConfig: Record<string, {...}>; evidence: AnalysisEvidence[] }>
```

---

## Storage Layer

### New methods in `server/storage/`

**`getBrandByDomain(domain: string): Promise<BrandIndex | null>`**

Simple lookup. Index already exists (`brand_index_domain_idx`).

**`updateBrandScore(domain: string, data: Partial<InsertBrandIndex>): Promise<BrandIndex | null>`**

Targeted partial update. Only writes the fields passed in. Returns null if no row exists for that domain (caller falls back to full insert).

### Data Persistence Rules: Never Overwrite, Always Enrich

**New domain (no existing row):** Full insert with all scan data:
- `slug`: domain-derived (`staples-com`)
- `name`, `sector`, `subSectors`, `capabilities`, `checkoutMethods`: from Claude + probes
- `overallScore`, `scoreBreakdown`, `recommendations`: from score engine
- `skillMd`: from generator
- `brandData`: full vendorDraft as JSON (preserves all gathered data for future use)
- `scanTier`: "free", `submittedBy`: "asx-scanner", `submitterType`: "auto_scan", `maturity`: "draft"
- `lastScannedAt`: now

**Existing row (re-scan or curated brand):** Partial update:

| Category | Fields | Rule |
|---|---|---|
| Always update | `overallScore`, `scoreBreakdown`, `recommendations`, `lastScannedAt`, `lastScannedBy`, `scanTier` | Scan data is fresher |
| Update if null/empty | `skillMd` (if null or `submitterType` is "auto_scan"), `sector` (if "uncategorized"), `subSectors` (if empty array) | Don't overwrite curation |
| Never overwrite | `name`, `capabilities`, `checkoutMethods`, `brandData`, `submittedBy`, `submitterType`, `claimedBy`, `maturity`, AXS Rating fields | Curated data is more valuable |

---

## API Route: `app/api/v1/scan/route.ts`

Thin handler. Validates, checks cache, calls `runScan()`, persists, responds.

```
POST /api/v1/scan
Content-Type: application/json
{ "domain": "staples.com" }
```

**Route logic:**

```
1. Parse body (Zod: { domain: z.string().min(3) })
2. Rate limit (in-memory, 5/min per IP)
3. normalizeDomain() → clean domain or 400
4. getBrandByDomain() → cache check
5. If cached AND lastScannedAt < 30 days AND overallScore exists → return with cached: true
6. runScan(domain) → ScanResult
7. Persist:
   - If brand exists: updateBrandScore() (partial update)
   - If new: upsertBrandIndex() (full insert)
8. Return response
```

**Response:**

```json
{
  "domain": "staples.com",
  "name": "Staples",
  "score": 72,
  "label": "Good",
  "sector": "Office Supplies",
  "subSectors": ["Printers", "Paper Products", "Desk Accessories", "Office Furniture"],
  "taxonomySource": "claude",
  "cached": false,
  "partial": false,
  "fetchMethod": "firecrawl",
  "scannedAt": "2026-04-01T12:00:00.000Z",
  "breakdown": {
    "clarity": { "score": 30, "max": 40, "signals": [...] },
    "speed": { "score": 17, "max": 25, "signals": [...] },
    "reliability": { "score": 25, "max": 35, "signals": [...] }
  },
  "recommendations": [...],
  "skillMd": "---\nname: creditclaw-shop-staples\ncategories:\n  - Office Supplies > Printers\n  - Office Supplies > Paper Products\n...",
  "capabilities": ["price_lookup", "stock_check", "order_tracking"],
  "checkoutMethods": ["self_hosted_card", "browser_automation"]
}
```

**Errors:** 400 (bad domain), 422 (unreachable), 429 (rate limit), 500 (internal).

**LLM failure:** Returns regex-only score with `partial: true`, `skillMd: null`. Not a 500.

---

## Per-Scan Cost Breakdown

| Service | Credits/Calls | Cost per scan |
|---|---|---|
| Firecrawl (Standard plan) | ~9 credits (5 pages + JSON extraction) | ~$0.008 |
| Claude (Anthropic) | 1 call (~4k input tokens, checkout + taxonomy) | ~$0.01 |
| **Total** | | **~$0.018 per scan** |

At 1,000 scans/month: ~$18. At 10,000 scans/month: ~$180. Negligible for a lead gen tool.

---

## Environment Variables Required

| Key | Service | Notes |
|---|---|---|
| `FIRECRAWL_API_KEY` | Firecrawl | For page rendering |
| `ANTHROPIC_API_KEY` | Anthropic | Already configured (used by existing Claude calls, now also taxonomy) |

---

## Migration Checklist

### Files to create:
| File | Lines (est.) | Purpose |
|---|---|---|
| `lib/scan/types.ts` | ~100 | Merged types from agentic-score + builder + taxonomy types |
| `lib/scan/fetch.ts` | ~200 | Firecrawl-powered fetching with raw fallback |
| `lib/scan/probes.ts` | ~230 | Moved from builder — API/protocol detection |
| `lib/scan/llm.ts` | ~150 | Moved from builder — Claude analysis + taxonomy classification |
| `lib/scan/score.ts` | ~120 | Merged compute + LLM enhancement |
| `lib/scan/signals/clarity.ts` | ~196 | Moved unchanged |
| `lib/scan/signals/speed.ts` | ~148 | Moved unchanged |
| `lib/scan/signals/reliability.ts` | ~306 | Moved unchanged |
| `lib/scan/recommendations.ts` | ~96 | Moved unchanged |
| `lib/scan/run.ts` | ~120 | New orchestrator (Firecrawl + Claude + probes) |
| `lib/scan/index.ts` | ~15 | Barrel exports |
| `app/api/v1/scan/route.ts` | ~120 | API route handler |

### Files to modify:
| File | Change |
|---|---|
| `server/storage/types.ts` | Add `getBrandByDomain`, `updateBrandScore` |
| `server/storage/brand-index.ts` | Implement new storage methods |
| `app/api/v1/skills/submissions/route.ts` | Update import: `analyzeVendor` → `runScan` from `lib/scan` |
| `app/api/v1/skills/analyze/route.ts` | Update import: same |

### Files to delete (after migration):
| File | Reason |
|---|---|
| `lib/agentic-score/` (entire directory) | Absorbed into `lib/scan/` |
| `lib/procurement-skills/builder/` (entire directory) | Absorbed into `lib/scan/` |

### Files that stay unchanged:
| File | Why |
|---|---|
| `lib/procurement-skills/types.ts` | Shared types, imported by 12+ app files |
| `lib/procurement-skills/generator.ts` | Pure transformer, called by scan + 2 other routes |

---

## Implementation Order

### Step 1: Environment setup
Get Firecrawl API key. Install SDK package (`firecrawl-js` or direct HTTP). `ANTHROPIC_API_KEY` already configured.

### Step 2: Create `lib/scan/` module
Move and merge files. Get everything compiling with the new structure. No new functionality yet — just reorganization.

### Step 3: Firecrawl fetch
Replace raw `fetch()` with Firecrawl `/v1/scrape`. Implement fallback path. Same `ScanPages` output shape.

### Step 4: Claude taxonomy classification
Add taxonomy classification to the Claude analysis step in `lib/scan/llm.ts`. Provide the ~192 L2 Google Product Taxonomy categories as a fixed option list. Claude returns matched categories; CreditClaw sectors derived via `ucp_categories.sector_slug` lookup.

### Step 5: Score + LLM enhancement
Merge `compute.ts` + enhancement logic into `score.ts`. Accept LLM findings as optional input.

### Step 6: Orchestrator (`run.ts`)
Wire everything together: Firecrawl fetch → (probes + Claude in parallel) → score → skill generation.

### Step 7: Storage methods
Add `getBrandByDomain()` and `updateBrandScore()`.

### Step 8: API route
Build the thin `POST /api/v1/scan` handler with cache check, rate limiting, persistence.

### Step 9: Update imports + cleanup
Update the 2 routes that import from `builder/`. Delete old directories.
