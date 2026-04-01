# Phase 3: Unified Scan API — Technical Plan

**Status:** Planning  
**Depends on:** Phase 0 (complete), Phase 2 (complete)  
**Outcome:** `POST /api/v1/scan` — a public endpoint that deeply scans a merchant domain and returns an ASX Score, signal breakdown, recommendations, and SKILL.md

---

## First Principles: What Should the Scan Actually Do?

The original plan treated the scan as a quick regex check against a single homepage fetch. But the scan is the **first impression** of CreditClaw — it's the lead gen tool. A shallow scan produces shallow results that don't impress merchants or give them actionable insight. The scan should be as deep and valuable as we can make it while staying under ~15-20 seconds.

### What a merchant wants to know from a scan:

1. **How visible are my products to AI agents?** (Can they find and understand my catalog?)
2. **How easily can an AI agent search my store?** (APIs, search forms, protocols)
3. **Can an AI agent actually buy something?** (Checkout flow, guest access, payment methods)
4. **What should I fix first?** (Prioritized, specific recommendations)
5. **How do I compare to others in my sector?** (Context for the score)

### What CreditClaw wants from every scan:

1. A rich `brand_index` entry (name, sector, capabilities, checkout methods — not "uncategorized" stubs)
2. A SKILL.md file ready for agent consumption
3. Lead qualification data (what tier of CreditClaw service could help this merchant?)
4. Growing the index — every scan makes the platform more valuable

---

## The Unified Scan Pipeline

One scan, one pipeline, maximum depth. No separate "score-only" and "skill-only" passes.

### Data Collection Layer

The scan fetches data from three sources in parallel:

#### Source 1: Multi-page crawl (homepage + key pages)

| Page | Why |
|---|---|
| `/` (homepage) | JSON-LD, meta tags, search forms, structured data, overall site structure |
| `/cart` | Cart management patterns, add-to-cart flows |
| `/checkout` | Guest checkout, payment methods, PO/tax fields, shipping options |
| `/business` or `/b2b` | Business features (bulk pricing, invoicing, tax exemption) |
| `/about` | Brand name, description, company info |
| `/sitemap.xml` | Product URL structure, catalog size, feed availability |
| `/robots.txt` | Bot tolerance, crawl rules, AI-specific blocks |

**Two versions of homepage HTML are needed:**
- **Raw HTML** (with scripts) — for ASX Score signals that detect JSON-LD `<script type="application/ld+json">` blocks, CAPTCHA scripts, and other script-embedded signals
- **Stripped HTML** (no scripts/styles/SVGs) — for LLM analysis to reduce tokens

All other pages only need stripped HTML (they go to the LLM, not the score engine).

#### Source 2: Protocol and API probes (existing `probeForAPIs`)

- x402 detection (402 responses, x-402 headers)
- ACP manifest (`.well-known/acp.json`)
- Public API endpoints (`/api/v1`, `/api-docs`, `/developers`, etc.)
- MCP endpoint (`.well-known/mcp.json`)
- Business feature pages (`/tax-exempt`, `/purchase-orders`, `/bulk-orders`, etc.)

These are lightweight HEAD/GET requests that run in parallel.

#### Source 3: LLM analysis (existing `analyzeCheckoutFlow`)

Claude receives the stripped HTML from all fetched pages and extracts:
- Brand name, slug, sector classification
- Search URL templates and product ID formats
- Guest checkout availability (confirmed from actual checkout page)
- Payment methods accepted
- Shipping thresholds and delivery estimates
- Tax exemption and PO number support
- Capabilities (from actual page evidence, not homepage guessing)
- Actionable tips for AI agents

### Scoring Layer

`computeASXScore()` runs on the raw data and produces the 0-100 score across 10 signals / 3 pillars.

**Key improvement:** After the regex-based score runs, the LLM findings can **boost** signals where the LLM has stronger evidence. This is a one-way enhancement — the LLM can upgrade a signal, never downgrade it (the regex-based score is the floor).

| Signal | Regex detects from homepage | LLM can upgrade from |
|---|---|---|
| Access & Auth | "guest checkout" text patterns | Actual checkout page confirms guest flow |
| Order Management | "add to cart" buttons, cart URLs | Cart page structure, variant selectors |
| Checkout Flow | Payment method text/icons | Checkout page payment options, shipping fields |
| Search API / MCP | `/api/v` URLs, MCP references | LLM extracts actual search URL template |

Signals that are regex-only (JSON-LD, Sitemap, Clean HTML, Page Load, Bot Tolerance) stay unchanged — the LLM doesn't add value there.

### Output Layer

The pipeline produces:

1. **ASXScoreResult** — overall score, label, per-signal breakdown, recommendations
2. **BuilderOutput** — structured vendor data (name, sector, capabilities, checkout methods, etc.)
3. **SKILL.md** — generated from BuilderOutput via `generateVendorSkill()`
4. **brand_index row** — upserted with real data, not stubs

---

## Future: Firecrawl + Exa Integration

The pipeline above uses our existing fetch infrastructure. Two external tools would dramatically improve depth:

### Firecrawl (`firecrawl.dev`)

**What it does:** Multi-page crawling with JavaScript rendering, structured content extraction, and markdown conversion. Handles SPAs, infinite scroll, and JS-heavy sites that our basic `fetch()` misses entirely.

**Where it helps the scan:**
- **Category detection:** Crawl product listing pages to understand the actual product taxonomy, not just what the homepage says
- **Checkout flow discovery:** Render JS-heavy checkout flows (Shopify, WooCommerce) that are invisible to raw HTML fetch
- **Capability identification:** Crawl `/returns`, `/track-order`, `/business` pages even when they redirect or require JS rendering
- **Richer HTML for score signals:** JS-rendered DOM gives the JSON-LD and Clean HTML signals much more to work with

**Integration point:** Replace `fetchPages()` with a Firecrawl crawl call. The crawl returns rendered HTML + extracted content for each URL. Our scoring and LLM analysis consume the output the same way.

**Cost model:** Per-page pricing. A 7-page scan would cost ~$0.007-0.01 per scan. At scale (10K scans/month), ~$70-100/month.

### Exa Web Sets (`exa.ai`)

**What it does:** Web-scale entity matching and semantic search. Can find pages that match a concept ("product listing pages on staples.com") rather than exact URL patterns.

**Where it helps the scan:**
- **Product taxonomy:** Match a merchant against Google Product Taxonomy categories using semantic understanding, not LLM guessing. Consistent taxonomy across the entire index.
- **Competitor discovery:** Find similar merchants in the same sector for comparison scoring
- **Catalog intelligence:** Understand what product categories a merchant carries without crawling their entire catalog

**Integration point:** After the crawl + LLM analysis, call Exa to:
1. Classify the merchant into standardized product categories
2. Find comparison brands in the same sector
3. Estimate catalog breadth

**Cost model:** Per-query pricing. 1-2 queries per scan. At scale, ~$20-50/month.

### When to add these

**Phase 3a (now):** Build the pipeline with existing fetch infrastructure. This works today and produces good results.

**Phase 3c (post-launch):** Add Firecrawl for JS rendering and multi-page depth. Biggest impact: sites that currently score poorly because their homepage is a JS shell.

**Phase 3d (post-launch):** Add Exa for taxonomy standardization and competitor discovery. Biggest impact: consistent sector/category data across the index + the comparison feature on the results page.

Both are additive — they slot into the pipeline without changing the scoring or output format. The scan gets deeper, the data gets richer, but the API contract stays the same.

---

## Phase 3a: Build the Unified Pipeline

### Architecture

```
app/api/v1/scan/route.ts          → Thin route handler (validate, cache check, orchestrate, respond)
lib/agentic-score/scan.ts         → NEW: Unified scan orchestrator
lib/agentic-score/fetch.ts        → Existing: fetchScanInputs() — raw HTML fetch for score engine
lib/agentic-score/compute.ts      → Existing: computeASXScore() — regex-based scoring
lib/agentic-score/enhance.ts      → NEW: LLM-based signal enhancement
lib/agentic-score/extract-meta.ts → NEW: HTML metadata extraction (title, description)
lib/procurement-skills/builder/   → Existing: analyzeVendor() — LLM analysis + probes (NOT MODIFIED)
lib/procurement-skills/generator.ts → Existing: generateVendorSkill() — SKILL.md generation (NOT MODIFIED)
server/storage/brand-index.ts     → Add getBrandByDomain(), updateBrandScore()
server/storage/types.ts           → Add method signatures
```

### New file: `lib/agentic-score/scan.ts` — The Orchestrator

This is the single entry point. It coordinates everything and returns a unified result.

```typescript
interface ScanResult {
  domain: string;
  name: string;
  sector: string;
  score: ASXScoreResult;           // overall score + breakdown + recommendations
  builderOutput: BuilderOutput;    // structured vendor data from LLM
  skillMd: string;                 // generated SKILL.md
  scannedAt: Date;
}

async function runScan(domain: string): Promise<ScanResult>
```

**Pipeline inside `runScan()`:**

```
1. Normalize domain

2. Parallel fetch (all at once):
   ├── fetchScanInputs(domain)        → raw homepage + sitemap + robots.txt + pageLoadTime
   └── analyzeVendor(https://{domain}) → BuilderOutput (fetches 5 pages + probes + LLM)

3. Sequential processing:
   a. computeASXScore(scanInputs)     → base ASXScoreResult (regex-only)
   b. enhanceWithLLM(score, builderOutput) → boosted ASXScoreResult
   c. extractMeta(rawHtml, domain)    → { name, description } (fallback if LLM missed)
   d. generateVendorSkill(builderOutput.draft) → SKILL.md string

4. Merge name/sector: prefer LLM name > extractMeta name > domain
   Merge sector: prefer LLM sector > "uncategorized"

5. Return ScanResult
```

Step 2 runs both fetches in parallel. `analyzeVendor()` takes ~10-15s (dominated by LLM). `fetchScanInputs()` takes ~2-5s. Total wall-clock time ≈ 10-15s.

The homepage is fetched twice (once raw by `fetchScanInputs`, once stripped by `analyzeVendor`). This is intentional — they need different HTML versions, and the parallel execution means no time penalty.

### New file: `lib/agentic-score/enhance.ts` — LLM Signal Enhancement

Takes the base `ASXScoreResult` and the `BuilderOutput`, returns an enhanced `ASXScoreResult` with boosted signals.

Rules:
- **Floor principle:** Enhancement can only increase signal scores, never decrease them
- Only enhances signals where the LLM has concrete evidence from non-homepage pages
- Updates the signal `detail` string to note what the LLM confirmed

Enhancement map:

| Signal | LLM field | Boost condition | Max boost |
|---|---|---|---|
| `access_auth` | `draft.checkout.guestCheckout` | LLM confirms guest checkout from /checkout page | Up to +5 pts |
| `order_management` | `draft.checkout`, `draft.capabilities` | LLM found variant selection, cart management | Up to +4 pts |
| `checkout_flow` | `draft.checkout`, `draft.shipping` | LLM found payment methods, shipping options | Up to +4 pts |
| `search_api` | `draft.search.urlTemplate` | LLM extracted actual search URL template | Up to +3 pts |
| `site_search` | `draft.search.pattern` | LLM confirmed search functionality | Up to +2 pts |

Signals NOT enhanced (regex is definitive for these):
- `json_ld` — requires raw HTML with `<script>` tags; LLM never sees these
- `product_feed` — binary: sitemap exists or it doesn't
- `clean_html` — structural analysis of raw DOM
- `page_load` — timing measurement
- `bot_tolerance` — robots.txt rules + CAPTCHA script detection

### New file: `lib/agentic-score/extract-meta.ts` — Metadata Extraction

Simple regex extraction from raw homepage HTML. Used as fallback when LLM doesn't provide name/description.

```typescript
function extractMeta(html: string, domain: string): { name: string; description: string }
```

- Extracts `<title>` tag, strips common suffixes (" | Official Site", " - Home", etc.)
- Extracts `<meta name="description" content="...">` 
- Fallback name: capitalize first segment of domain
- Fallback description: "Online store at {domain}"
- ~30 lines, pure regex, no dependencies

### Modified: `lib/agentic-score/fetch.ts`

- Export `normalizeDomain()` (currently private)
- No other changes

### Modified: `lib/agentic-score/index.ts`

- Add exports for `runScan`, `normalizeDomain`, `extractMeta`, `enhanceWithLLM`

### New storage methods

**`server/storage/types.ts`** — add:
```typescript
getBrandByDomain(domain: string): Promise<BrandIndex | null>;
updateBrandScore(domain: string, data: Partial<InsertBrandIndex>): Promise<BrandIndex | null>;
```

**`server/storage/brand-index.ts`** — implement:

`getBrandByDomain`: Simple `WHERE domain = $1 LIMIT 1`. Index already exists.

`updateBrandScore`: Targeted partial update that only writes the fields we pass. Does NOT overwrite existing rich data.
- If row exists by domain: update only the provided fields (score, breakdown, recommendations, lastScannedAt, skillMd, etc.)
- If row doesn't exist: return null (caller handles insert via upsertBrandIndex)

### New file: `app/api/v1/scan/route.ts` — The API Route

```
POST /api/v1/scan
Content-Type: application/json
{ "domain": "staples.com" }
```

**Route logic:**

```
1. Parse + validate body (Zod: { domain: z.string().min(3) })
2. Rate limit check (in-memory, 5 scans/min per IP)
3. normalizeDomain(domain) — clean domain or throw → 400
4. getBrandByDomain(domain) — cache check
5. If cached AND lastScannedAt < 30 days AND overallScore exists:
   → Return cached result with { cached: true }
6. runScan(domain) → ScanResult
7. Persist to brand_index:
   a. getBrandByDomain again (may exist without score)
   b. If exists: updateBrandScore() — partial update, preserve existing rich data
   c. If not exists: upsertBrandIndex() — full insert with LLM-enriched data
   d. Fields written:
      - Always: overallScore, scoreBreakdown, recommendations, scanTier, lastScannedAt, lastScannedBy, skillMd
      - Only on insert (new brand): slug, name, domain, url, description, sector, capabilities, checkoutMethods, brandData, submittedBy, submitterType, maturity
      - Only if currently null (existing brand): name, sector (don't overwrite curated data)
8. Return response
```

**Response shape:**

```json
{
  "domain": "staples.com",
  "name": "Staples",
  "score": 72,
  "label": "Good",
  "sector": "office",
  "cached": false,
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

**Error handling:**

| Status | Condition | Response |
|---|---|---|
| 400 | Invalid domain format | `{ error: "invalid_domain", message: "..." }` |
| 422 | Domain unreachable / DNS failure | `{ error: "unreachable", message: "..." }` |
| 429 | Rate limit exceeded | `{ error: "rate_limited", message: "Try again in X seconds" }` |
| 500 | Internal error (LLM failure, etc.) | `{ error: "scan_failed", message: "..." }` |

**Rate limiter:** In-memory `Map<string, number[]>` tracking request timestamps per IP. 5 requests per minute per IP. Cleaned on access (remove entries older than 60 seconds). Simple, no dependencies, works for single-process. Swap for Redis later if needed.

**LLM failure handling:** If `analyzeVendor()` fails (API error, timeout), the scan still returns a result — just the regex-based score without LLM enhancement, and no SKILL.md. The response includes a `partial: true` flag and the `skillMd` field is null. This is a graceful degradation, not a 500.

---

## Phase 3b: SKILL.md as Part of the Unified Scan

In the unified pipeline, SKILL.md generation is NOT a separate step — it happens inside `runScan()` as step 3d. The `BuilderOutput.draft` from `analyzeVendor()` feeds directly into `generateVendorSkill()`.

**What Phase 3b actually covers:**

The SKILL.md generation already works via `generateVendorSkill()`. Phase 3b is about making sure:

1. The generated SKILL.md includes the ASX Score (the current `asx_score` field in the SKILL.md frontmatter uses the old `friendliness * 20` calculation — needs to use the actual ASX score)
2. The SKILL.md is stored in `brand_index.skillMd` and returned in the API response
3. The SKILL.md is regenerated on re-scan (if score changed) but NOT if the brand has a manually curated skill (check `submitterType !== "auto_scan"`)

**What needs to change in `generateVendorSkill()`:**

Nothing — we said DO NOT MODIFY. Instead, the scan orchestrator passes the correct data:
- `BuilderOutput.draft` gets the ASX score injected before being passed to `generateVendorSkill()`
- The `vendor.feedbackStats` can be populated from existing AXS rating data if available

---

## File Summary

### New files (4):
| File | Purpose | Lines (est.) |
|---|---|---|
| `lib/agentic-score/scan.ts` | Unified scan orchestrator | ~80 |
| `lib/agentic-score/enhance.ts` | LLM-based signal enhancement | ~100 |
| `lib/agentic-score/extract-meta.ts` | HTML metadata extraction | ~40 |
| `app/api/v1/scan/route.ts` | API route handler | ~120 |

### Modified files (4):
| File | Change |
|---|---|
| `lib/agentic-score/fetch.ts` | Export `normalizeDomain()` |
| `lib/agentic-score/index.ts` | Add new exports |
| `server/storage/types.ts` | Add `getBrandByDomain`, `updateBrandScore` |
| `server/storage/brand-index.ts` | Implement new storage methods |

### Untouched files (existing, called but not modified):
| File | Role |
|---|---|
| `lib/agentic-score/compute.ts` | Regex-based scoring engine |
| `lib/agentic-score/signals/*` | Individual signal scorers |
| `lib/agentic-score/recommendations.ts` | Recommendation generator |
| `lib/procurement-skills/builder/analyze.ts` | `analyzeVendor()` — LLM + probes |
| `lib/procurement-skills/builder/llm.ts` | Claude analysis |
| `lib/procurement-skills/builder/probes.ts` | API/protocol probes |
| `lib/procurement-skills/builder/fetch.ts` | Page fetcher (strips HTML) |
| `lib/procurement-skills/generator.ts` | `generateVendorSkill()` — SKILL.md |

---

## Timing Budget

```
Parallel block (wall-clock ~12-15s):
├── fetchScanInputs()              2-5s   (homepage + sitemap + robots.txt)
└── analyzeVendor()               10-15s
    ├── fetchPages (5 pages)       3-5s   (parallel)
    ├── probeForAPIs               2-3s   (parallel with fetchPages)
    ├── detectBusinessFeatures     2-3s   (parallel with fetchPages)
    └── LLM call (Claude)          5-10s  (sequential after fetches)

Sequential block (wall-clock ~50-100ms):
├── computeASXScore()              <10ms  (pure computation)
├── enhanceWithLLM()               <10ms  (pure computation)
├── extractMeta()                  <5ms   (regex)
├── generateVendorSkill()          <10ms  (string concatenation)
└── DB upsert                      20-50ms

Total: ~12-15 seconds
```

---

## Data Flow: Never Overwrite, Always Enrich

### When brand_index row does NOT exist (new domain):

Full insert with all available data:
- `slug`: from LLM or domain-derived (`staples-com` pattern using full domain)
- `name`: from LLM (fallback: extractMeta)
- `domain`: normalized domain
- `url`: `https://{domain}`
- `description`: from LLM tips or extractMeta
- `sector`: from LLM (fallback: "uncategorized")
- `capabilities`: from LLM + probes
- `checkoutMethods`: from probes
- `overallScore`, `scoreBreakdown`, `recommendations`: from score engine
- `skillMd`: from generator
- `scanTier`: "free"
- `lastScannedAt`: now
- `lastScannedBy`: "public-scanner"
- `submittedBy`: "asx-scanner"
- `submitterType`: "auto_scan"
- `maturity`: "draft"
- `brandData`: full BuilderOutput.draft as JSON

### When brand_index row ALREADY exists (re-scan or existing curated brand):

Partial update — only refresh what the scan provides, never erase curated data:

**Always update** (scan data is fresher):
- `overallScore`, `scoreBreakdown`, `recommendations`
- `lastScannedAt`, `lastScannedBy`, `scanTier`

**Update only if currently null/empty** (don't overwrite curation):
- `skillMd` (if null → generate; if present and `submitterType` is "auto_scan" → regenerate; if present and curated → keep)
- `sector` (if "uncategorized" → update from LLM; if already classified → keep)

**Never overwrite** (curated data is more valuable):
- `name` (if set by human/community publish)
- `capabilities`, `checkoutMethods` (if set by skill builder)
- `brandData` (if populated by full skill publish)
- `submittedBy`, `submitterType` (preserves provenance)
- `claimedBy`, `claimId` (ownership data)
- `maturity` (if "verified" or "beta", don't downgrade to "draft")
- AXS Rating fields (`axsRating`, `ratingSearchAccuracy`, etc.)

### Slug strategy for scan-created entries:

Use full domain to avoid collisions: `staples.com` → `staples-com`, `staples.co.uk` → `staples-co-uk`.

This differs from skill builder slugs (which use brand name like `staples`). But since the scan looks up by **domain** (not slug), this doesn't cause conflicts. If a curated skill already exists for the domain, the scan finds it by domain and does a partial update — no new row, no slug collision.

---

## Open Questions

1. **Firecrawl/Exa API keys:** Neither is integrated yet. Need API keys configured as environment secrets before Phase 3c/3d. Should we set these up now or defer?

2. **LLM cost per scan:** Each scan calls Claude (~2K input tokens, ~500 output tokens). At Sonnet pricing, ~$0.01-0.02 per scan. At 1000 scans/month (early stage), ~$10-20/month. Acceptable for lead gen ROI. At scale, consider caching LLM results separately or reducing token usage.

3. **Comparison brand feature:** The original plan included finding a comparison brand in the same sector. Deferred from 3a — the sector data from LLM makes this possible, but it requires enough brands in the index to be useful. Can add as a follow-up once the index has ~50+ scanned brands.

4. **Re-scan policy:** Currently 30-day cache for free users. Should paid users be able to force re-scan? Should re-scan regenerate SKILL.md if the curated one hasn't changed? Need to define re-scan behavior for different user tiers.
