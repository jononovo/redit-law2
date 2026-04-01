# Phase 3: Unified Scan API — Technical Plan

**Status:** Planning
**Depends on:** Phase 0 (complete), Phase 2 (complete)
**Outcome:** `POST /api/v1/scan` — a public endpoint that deeply scans a merchant domain and returns an ASX Score, signal breakdown, recommendations, and SKILL.md

---

## First Principles

The scan is CreditClaw's first impression — the lead gen tool. It needs to be as deep and valuable as possible while completing in ~15 seconds. One scan, one pipeline, everything gathered once and saved once.

**What a merchant wants:**
1. How visible are my products to AI agents?
2. How easily can an AI agent search my store?
3. Can an AI agent actually buy something?
4. What should I fix first?

**What CreditClaw wants from every scan:**
1. A rich `brand_index` entry (name, sector, capabilities — not stubs)
2. A SKILL.md file ready for agent consumption
3. Every scan grows the index — a data flywheel

---

## Two Modules, Clear Responsibilities

### `lib/scan/` — Data Gathering + Scoring

Owns ALL data collection: page fetching, API probing, LLM analysis, and scoring. This is the intelligence step. It gathers everything once, scores it, saves everything, and passes the results forward.

### `lib/procurement-skills/` — Skill Transformation (unchanged)

A pure transformer. Takes structured data that the scan already gathered and formats it into a SKILL.md. No fetching, no analyzing, no LLM calls. Data in, skill file out.

`lib/procurement-skills/types.ts` stays where it is — it's imported across 12+ files in the app (label maps, type definitions, UI rendering). This is a shared type library, not a scan dependency.

### The Flow

```
lib/scan/run.ts                     → gathers all data, scores, saves to DB
  ↓ passes BuilderOutput
lib/procurement-skills/generator.ts → transforms into SKILL.md string
  ↓ returns skillMd
lib/scan/run.ts                     → saves skillMd to brand_index, returns everything
```

If skill generation needs to run again later (format update, re-generation), it reads `brandData` from the DB — no re-scan needed.

---

## `lib/scan/` — File Structure

```
lib/scan/
├── types.ts              All scan-specific types (ScoreInput, ScanResult, SignalKey, etc.)
├── fetch.ts              SSRF-protected fetching — raw HTML + stripped HTML + sitemap + robots.txt
├── probes.ts             API/protocol detection (x402, ACP, MCP, business features)
├── llm.ts                Claude analysis of page content → structured vendor data
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
| `lib/agentic-score/types.ts` | → `lib/scan/types.ts` | Rename, same content |
| `lib/agentic-score/fetch.ts` | → `lib/scan/fetch.ts` | Merge with builder/fetch.ts — one fetch module, both raw + stripped HTML |
| `lib/agentic-score/compute.ts` | → `lib/scan/score.ts` | Rename + add LLM enhancement logic (was planned as separate `enhance.ts`) |
| `lib/agentic-score/recommendations.ts` | → `lib/scan/recommendations.ts` | Move, unchanged |
| `lib/agentic-score/signals/*` | → `lib/scan/signals/*` | Move, unchanged |
| `lib/agentic-score/index.ts` | → `lib/scan/index.ts` | Updated exports |
| `lib/procurement-skills/builder/fetch.ts` | Absorbed into `lib/scan/fetch.ts` | Eliminates SSRF duplication (~100 lines) |
| `lib/procurement-skills/builder/probes.ts` | → `lib/scan/probes.ts` | Move — probing is data collection, belongs in scan |
| `lib/procurement-skills/builder/llm.ts` | → `lib/scan/llm.ts` | Move — LLM analysis is data collection, belongs in scan |
| `lib/procurement-skills/builder/analyze.ts` | Absorbed into `lib/scan/run.ts` | The orchestration logic becomes part of the scan orchestrator |
| `lib/procurement-skills/builder/types.ts` | Absorbed into `lib/scan/types.ts` | BuilderOutput, PageContent, LLMCheckoutAnalysis merge into scan types |
| `lib/procurement-skills/generator.ts` | Stays | Pure transformer, no changes |
| `lib/procurement-skills/types.ts` | Stays | Shared types used across 12+ app files |

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

## The Unified Fetch Module: `lib/scan/fetch.ts`

This is where the duplication gets eliminated. One file handles all fetching with SSRF protection.

**Exports:**

```typescript
normalizeDomain(input: string): string
fetchScanPages(domain: string): Promise<ScanPages>
```

**`ScanPages` contains everything, fetched once:**

```typescript
interface ScanPages {
  domain: string;
  homepageRaw: string;           // Raw HTML with scripts — for score signals (JSON-LD, CAPTCHA detection)
  homepageStripped: string;      // Stripped HTML — for LLM token efficiency
  cartPage: PageContent | null;  // /cart — stripped
  checkoutPage: PageContent | null; // /checkout — stripped
  businessPage: PageContent | null; // /business — stripped
  aboutPage: PageContent | null; // /about — stripped
  sitemapContent: string | null; // /sitemap.xml
  robotsTxtContent: string | null; // /robots.txt
  pageLoadTimeMs: number;        // Time to fetch homepage
}
```

**How it works:**
1. Normalize domain
2. Fetch all 7 URLs in parallel (homepage, cart, checkout, business, about, sitemap, robots.txt)
3. Homepage gets TWO versions: raw (keep scripts for score engine) and stripped (remove scripts/styles/SVGs for LLM)
4. All other pages get stripped only (they're for LLM consumption)
5. Return everything in one object

**One fetch, two HTML versions, no duplication.** The score engine reads `homepageRaw`. The LLM reads `homepageStripped` + the other stripped pages.

SSRF protection, redirect handling, timeouts — all in one place.

---

## `lib/scan/score.ts` — Scoring + LLM Enhancement

Combines what was `compute.ts` and the planned `enhance.ts` into one file. The score computation and LLM enhancement are one concern: "what's the ASX score?"

```typescript
function computeASXScore(pages: ScanPages, llmFindings: LLMCheckoutAnalysis | null): ASXScoreResult
```

**How it works:**

1. Run all 10 regex-based signal scorers against the raw data (unchanged from current implementation)
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
- `json_ld` — requires raw `<script>` tags the LLM never sees
- `product_feed` — binary: sitemap exists or doesn't
- `clean_html` — DOM structure analysis
- `page_load` — timing measurement
- `bot_tolerance` — robots.txt rules + CAPTCHA script detection

---

## `lib/scan/run.ts` — The Orchestrator

Single entry point. Coordinates fetch → probe → LLM → score → skill generation.

```typescript
interface ScanResult {
  domain: string;
  name: string;
  sector: string;
  score: ASXScoreResult;
  vendorDraft: Partial<VendorSkill>;  // Structured vendor data from LLM + probes
  skillMd: string | null;             // null if LLM failed (graceful degradation)
  scannedAt: Date;
  partial: boolean;                   // true if LLM failed and results are regex-only
}

async function runScan(domain: string): Promise<ScanResult>
```

**Pipeline:**

```
1. fetchScanPages(domain)                    → ScanPages (all 7 pages, ~3-5s)

2. In parallel:
   ├── probeForAPIs(domain)                  → checkout methods, API endpoints (~2-3s)
   ├── detectBusinessFeatures(domain)        → capabilities (~2-3s)
   └── analyzeCheckoutFlow(strippedPages)    → LLM structured data (~5-10s)

3. Merge probe + LLM results into vendorDraft (Partial<VendorSkill>)

4. computeASXScore(pages, llmFindings)       → ASXScoreResult (<10ms)

5. generateVendorSkill(vendorDraft)          → SKILL.md string (<10ms)

6. Extract name/sector:
   - name: LLM name > <title> tag > capitalize(domain)
   - sector: LLM sector > "uncategorized"

7. Return ScanResult
```

**Timing:**
```
Step 1: fetchScanPages              3-5s   (7 URLs in parallel)
Step 2: probes + LLM               5-10s  (parallel, LLM dominates)
Steps 3-7: computation             <100ms

Total: ~8-15 seconds (steps 1 and 2 are sequential; within each, everything is parallel)
```

**Graceful degradation:** If the LLM call fails (API error, timeout), the scan still completes with regex-only scores. `partial: true` is set, `skillMd` is null, and name/sector fall back to HTML extraction. The user gets a score and recommendations — just without the LLM-enhanced depth.

---

## `lib/scan/llm.ts` — LLM Analysis

Moved from `lib/procurement-skills/builder/llm.ts`. Same Claude call, same prompt, same output. The only change: it receives `PageContent[]` from the new unified fetch module instead of the old builder fetch.

```typescript
function analyzeCheckoutFlow(pages: PageContent[], baseUrl: string): Promise<{
  analysis: Partial<LLMCheckoutAnalysis>;
  confidence: Record<string, number>;
  evidence: AnalysisEvidence[];
}>
```

No changes to the prompt or logic. Just a new home.

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
- `name`, `sector`, `capabilities`, `checkoutMethods`: from LLM + probes
- `overallScore`, `scoreBreakdown`, `recommendations`: from score engine
- `skillMd`: from generator
- `brandData`: full vendorDraft as JSON (preserves all gathered data for future use)
- `scanTier`: "free", `submittedBy`: "asx-scanner", `submitterType`: "auto_scan", `maturity`: "draft"
- `lastScannedAt`: now

**Existing row (re-scan or curated brand):** Partial update:

| Category | Fields | Rule |
|---|---|---|
| Always update | `overallScore`, `scoreBreakdown`, `recommendations`, `lastScannedAt`, `lastScannedBy`, `scanTier` | Scan data is fresher |
| Update if null/empty | `skillMd` (if null or `submitterType` is "auto_scan"), `sector` (if "uncategorized") | Don't overwrite curation |
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
  "sector": "office",
  "cached": false,
  "partial": false,
  "scannedAt": "2026-04-01T12:00:00.000Z",
  "breakdown": {
    "clarity": { "score": 30, "max": 40, "signals": [...] },
    "speed": { "score": 17, "max": 25, "signals": [...] },
    "reliability": { "score": 25, "max": 35, "signals": [...] }
  },
  "recommendations": [...],
  "skillMd": "---\nname: creditclaw-shop-staples\n...",
  "capabilities": ["price_lookup", "stock_check", "order_tracking"],
  "checkoutMethods": ["self_hosted_card", "browser_automation"]
}
```

**Errors:** 400 (bad domain), 422 (unreachable), 429 (rate limit), 500 (internal).

**LLM failure:** Returns regex-only score with `partial: true`, `skillMd: null`. Not a 500.

---

## Future: Firecrawl + Exa Integration

Both slot into the pipeline without changing the architecture:

### Firecrawl (`firecrawl.dev`) — Phase 3c

Replaces the fetch layer in `lib/scan/fetch.ts`. Instead of raw `fetch()` calls, use Firecrawl for JS rendering and multi-page crawling. Same `ScanPages` output shape, richer content.

Biggest impact: JS-heavy SPAs (Shopify, WooCommerce) that return empty HTML shells to raw fetch.

### Exa Web Sets (`exa.ai`) — Phase 3d

Adds a post-analysis step in `lib/scan/run.ts`. After LLM analysis, call Exa to standardize the sector/taxonomy against Google Product Taxonomy and find comparison brands.

Biggest impact: consistent categorization across the index + competitor comparison on results page.

Both are additive. The API contract stays the same.

---

## Migration Checklist

### Files to create:
| File | Lines (est.) | Purpose |
|---|---|---|
| `lib/scan/types.ts` | ~80 | Merged types from agentic-score + builder |
| `lib/scan/fetch.ts` | ~180 | Unified fetch — raw + stripped HTML, SSRF protection |
| `lib/scan/probes.ts` | ~230 | Moved from builder — API/protocol detection |
| `lib/scan/llm.ts` | ~120 | Moved from builder — Claude analysis |
| `lib/scan/score.ts` | ~120 | Merged compute + LLM enhancement |
| `lib/scan/signals/clarity.ts` | ~196 | Moved unchanged |
| `lib/scan/signals/speed.ts` | ~148 | Moved unchanged |
| `lib/scan/signals/reliability.ts` | ~306 | Moved unchanged |
| `lib/scan/recommendations.ts` | ~96 | Moved unchanged |
| `lib/scan/run.ts` | ~100 | New orchestrator |
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

### Step 1: Create `lib/scan/` module
Move and merge files. Get everything compiling with the new structure. No new functionality yet — just reorganization.

### Step 2: Unified fetch
Merge the two fetch modules. One SSRF-protected fetcher that returns `ScanPages` with both raw and stripped HTML.

### Step 3: Score + LLM enhancement
Merge `compute.ts` + enhancement logic into `score.ts`. Accept LLM findings as optional input.

### Step 4: Orchestrator (`run.ts`)
Wire everything together: fetch → probes + LLM (parallel) → score → skill generation.

### Step 5: Storage methods
Add `getBrandByDomain()` and `updateBrandScore()`.

### Step 6: API route
Build the thin `POST /api/v1/scan` handler with cache check, rate limiting, persistence.

### Step 7: Update imports + cleanup
Update the 2 routes that import from `builder/`. Delete old directories.
