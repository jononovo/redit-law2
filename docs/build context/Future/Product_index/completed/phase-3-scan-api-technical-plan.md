# Phase 3: Enhanced Scan Pipeline — Technical Plan

**Status:** Planning (updated April 2026)
**Depends on:** Tier 1 Scanner (COMPLETE — see "What Already Exists" below)
**Outcome:** Upgrade the scan pipeline with Firecrawl JS rendering, Claude-powered taxonomy classification, LLM score enhancement, and SKILL.md generation

---

## What Already Exists (Tier 1 — Complete)

The Tier 1 ASX Score Scanner is live. Here's what's built and working:

### Current Architecture

```
lib/agentic-score/
├── types.ts              ScoreInput, ASXScoreResult, ASXScoreBreakdown, SignalScore, etc.
├── fetch.ts              Raw fetch() with SSRF protection — homepage + sitemap.xml + robots.txt
├── compute.ts            computeASXScore() — regex-only, takes ScoreInput, returns ASXScoreResult
├── extract-meta.ts       extractMeta() — title/description from HTML
├── recommendations.ts    generateRecommendations() — prioritized by score gap
├── domain-utils.ts       domainToSlug() — client-safe, no Node deps
├── index.ts              Barrel exports
└── signals/
    ├── clarity.ts         3 signals: JSON-LD (max 20), Product Feed (max 10), Clean HTML (max 10)
    ├── speed.ts           3 signals: Search API (max 10), Site Search (max 10), Page Load (max 5)
    └── reliability.ts     4 signals: Access & Auth (max 10), Order Mgmt (max 10), Checkout Flow (max 10), Bot Tolerance (max 5)
```

**10 signals, 3 pillars, 100 points total:**
- Clarity: 40 points (3 signals)
- Speed: 25 points (3 signals)
- Reliability: 35 points (4 signals)

### Current Pipeline (`POST /api/v1/scan` — `app/api/v1/scan/route.ts`)

```
1. Parse body (Zod: { domain: string })
2. Rate limit (in-memory, 5/min per IP via x-forwarded-for)
3. normalizeDomain() → clean domain or 400
4. getBrandByDomain() → cache check (30-day window, requires existing overallScore)
5. If cached → return { domain, slug, name, score, label, cached: true, breakdown, recommendations }
6. fetchScanInputs(domain) → ScoreInput (homepage + sitemap.xml + robots.txt via raw fetch)
7. computeASXScore(input) → ASXScoreResult (regex-only)
8. extractMeta(html, domain) → { name, description }
9. Persist via upsertBrandIndex() — conflict on domain column, slug + curated fields never overwritten
10. Return { domain, slug, name, score, label, cached: false, breakdown, recommendations }
```

### Current Storage Model

Scores are stored directly on `brand_index` — there is NO `scan_history` table:

| Column | Type | Purpose |
|---|---|---|
| `domain` | TEXT NOT NULL UNIQUE | Primary identifier for scans |
| `slug` | TEXT UNIQUE | URL slug — never overwritten by scans |
| `overallScore` | INTEGER | 0-100 ASX Score |
| `scoreBreakdown` | JSONB | Per-pillar and per-signal scores |
| `recommendations` | JSONB | Prioritized improvement suggestions |
| `scanTier` | TEXT | "free" for Tier 1 |
| `lastScannedAt` | TIMESTAMP | When last scanned |
| `lastScannedBy` | TEXT | "public" for scanner |
| `skillMd` | TEXT | Generated SKILL.md content (currently unused by Tier 1) |

**Persistence rules:**
- `upsertBrandIndex()` conflicts on `domain` column
- `slug` is excluded from the update set — curated slugs (e.g., `bh-photo`) are never overwritten
- Score fields (`overallScore`, `scoreBreakdown`, `recommendations`, `lastScannedAt`, `lastScannedBy`, `scanTier`) are always refreshed
- Curated fields (`name`, `capabilities`, `checkoutMethods`, `submittedBy`, `submitterType`, `claimedBy`, `maturity`) are never overwritten on existing brands

### Current Frontend

| Page | File | Purpose |
|---|---|---|
| `/agentic-shopping-score` | `app/agentic-shopping-score/page.tsx` | Scanner landing page with domain input |
| `/brands/[slug]` | `app/brands/[slug]/page.tsx` | SSR results page with score gauge, breakdown, recommendations |
| `GET /api/v1/brands/[slug]` | `app/api/v1/brands/[slug]/route.ts` | Public brand data API |

Results page features: SSR with `generateMetadata()`, dynamic OG/Twitter/canonical tags, score gauge, pillar breakdown, signal detail, recommendations, copy URL, scan/re-scan trigger.

### Existing Skill Builder Pipeline (Separate System)

The skill builder in `lib/procurement-skills/builder/` is a separate system used for deep brand onboarding:

| File | What It Does |
|---|---|
| `builder/fetch.ts` | Fetches pages with SSRF protection, strips scripts/styles |
| `builder/probes.ts` | Probes for x402, ACP, public APIs, MCP, business features |
| `builder/llm.ts` | Sends page HTML to Claude, extracts structured e-commerce data |
| `builder/analyze.ts` | Orchestrates fetch → probe → LLM → assemble VendorSkill draft |
| `builder/types.ts` | TypeScript types for pages, probes, analysis results |

**Callers:** `app/api/v1/skills/submissions/route.ts` and `app/api/v1/skills/analyze/route.ts` both import `analyzeVendor()` from `builder/analyze`.

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

## Three Enhancements

### Phase 3a: Firecrawl Integration — JS Rendering

**What it does:** Renders JavaScript-heavy pages and returns the real DOM. Replaces raw `fetch()` in `lib/agentic-score/fetch.ts`.

**Why we need it:** ~40% of e-commerce sites (Shopify, WooCommerce, modern SPAs) return empty HTML shells to raw `fetch()`. Without JS rendering, the score engine sees almost nothing — no products, no JSON-LD, no search forms. The score would be artificially low for what are actually well-built stores. Every signal in our scoring engine depends on HTML content. If the HTML is empty, the score is wrong.

**How it fits:** Replaces the fetch layer in `lib/agentic-score/fetch.ts`. Instead of `fetch(url)`, we call Firecrawl's `/v1/scrape` endpoint. The `fetchScanInputs()` function keeps the same `ScoreInput` return type — downstream scoring is untouched. Optionally, we also fetch additional pages (cart, checkout, about) for Claude analysis.

**API used:** `POST /v1/scrape` — 1 credit per page, returns rendered HTML + markdown.

**Minimum viable integration — homepage only:**

```typescript
// In lib/agentic-score/fetch.ts
async function fetchWithFirecrawl(url: string): Promise<string> {
  const res = await firecrawlClient.scrapeUrl(url, {
    formats: ["html", "rawHtml"],
    waitFor: 3000,
  });
  return res.rawHtml ?? res.html ?? "";
}

export async function fetchScanInputs(rawDomain: string): Promise<ScoreInput> {
  const domain = normalizeDomain(rawDomain);
  const baseUrl = `https://${domain}`;
  const startTime = Date.now();

  const [homepageResult, sitemapResult, robotsResult] = await Promise.allSettled([
    fetchWithFirecrawl(baseUrl),    // Firecrawl for JS rendering
    safeFetch(`${baseUrl}/sitemap.xml`, 8000),  // Raw fetch (plain XML)
    safeFetch(`${baseUrl}/robots.txt`, 8000),    // Raw fetch (plain text)
  ]);

  // ... same shape as current, same error handling
}
```

**Cost:** 1 credit per scan (homepage only). At Standard plan ($83/mo for 100k credits), that's $0.0008 per scan. If we add cart + checkout + about pages: ~5 credits = $0.004 per scan.

**Fallback:** If Firecrawl is unavailable or `FIRECRAWL_API_KEY` is not set, fall back to raw `fetch()`. Score may be lower for JS-heavy sites, but the scan still completes. The response can include a `fetchMethod: "firecrawl" | "raw"` field.

**Extended fetch (for Claude analysis — Phase 3b):**

If Claude analysis is enabled, fetch additional pages for richer context:

```typescript
interface ScanPages extends ScoreInput {
  homepageStripped: string;          // HTML with scripts/styles removed — for LLM
  cartPage: string | null;           // /cart — stripped
  checkoutPage: string | null;       // /checkout — stripped
  aboutPage: string | null;          // /about — stripped
  fetchMethod: "firecrawl" | "raw";
}
```

Additional pages use `formats: ["html"]` and `onlyMainContent: true` for token efficiency.

**Environment variable:** `FIRECRAWL_API_KEY`

---

### Phase 3b: Claude Analysis — Score Enhancement + Taxonomy Classification + SKILL.md Generation

**What it does:** After Firecrawl renders the pages, Claude analyzes the content for two purposes:
1. **Checkout flow analysis + score enhancement:** Understands checkout flows, payment methods, cart behavior, guest checkout availability. Boosts regex-based signal scores where LLM finds additional evidence.
2. **Taxonomy classification:** Maps the merchant to Google Product Taxonomy categories (L2 and L3) by examining navigation menus, breadcrumbs, product sections, and page structure.
3. **SKILL.md generation:** Uses the enriched vendor data (Claude + probes + score) to generate a SKILL.md file.

**Why Claude handles taxonomy (not Exa):** Claude already sees the Firecrawl-rendered DOM — navigation menus, product sections, breadcrumbs. By providing Claude with the 192 L2 Google Product Taxonomy categories as a fixed option list, it can map the merchant to multiple categories with high accuracy. This is more grounded than entity-level classification because it's based on what the store actually displays. The CreditClaw sector mapping then derives automatically from the `sector_slug` column on the `ucp_categories` table — no guessing needed.

**Decision rationale (April 2026):** Exa was evaluated for taxonomy classification but deferred. Exa's strength is merchant *discovery* (finding unknown sites by category), not classifying a known site whose pages we've already rendered. For classification of a single known URL, Claude with a fixed category list is more accurate, more deterministic, and eliminates an external dependency. If taxonomy results prove insufficient, Exa can be added later specifically for this purpose.

#### Score Enhancement (Floor Principle)

After the existing 10 regex signals run against Firecrawl-rendered HTML, Claude's analysis can boost scores where it finds additional evidence. Enhancement can only increase scores, never decrease.

| Signal | What Claude checks | Max boost |
|---|---|---|
| `access_auth` | Confirms guest checkout from rendered /checkout page | +5 pts |
| `order_management` | Found cart management, variant selection in rendered DOM | +4 pts |
| `checkout_flow` | Found payment methods, shipping options on rendered checkout page | +4 pts |
| `search_api` | Extracted actual search URL template from rendered page | +3 pts |
| `site_search` | Confirmed search functionality in rendered DOM | +2 pts |

Signals that stay regex-only (LLM doesn't help):
- `json_ld` — requires raw `<script>` tags (Firecrawl's `rawHtml` preserves these)
- `product_feed` — binary: sitemap exists or doesn't
- `clean_html` — DOM structure analysis
- `page_load` — timing measurement
- `bot_tolerance` — robots.txt rules + CAPTCHA script detection

#### Taxonomy Classification

Claude receives stripped homepage HTML (navigation menus, breadcrumbs, product sections) plus the ~192 L2 Google Product Taxonomy categories as a fixed option list.

**Output type:**

```typescript
interface TaxonomyResult {
  sectors: string[];              // CreditClaw sectors (derived from ucp_categories.sector_slug)
  googleL2Categories: string[];   // Google L2 category names matched
  googleL3Categories: string[];   // Google L3 category names matched (optional)
  confidence: number;             // 0-1 confidence score
  source: "claude";
}
```

**How it works:**

1. Claude receives stripped homepage HTML (navigation menus, breadcrumbs, product sections)
2. Claude is given the ~192 L2 Google Product Taxonomy categories as a fixed option list
3. Claude selects all matching L2 categories (a merchant can span multiple)
4. CreditClaw sectors are derived via database lookup: `SELECT DISTINCT sector_slug FROM ucp_categories WHERE name IN (...matched categories)`
5. No separate API call needed — taxonomy is part of the same Claude analysis that handles checkout flow

**Taxonomy standard:** Google Product Taxonomy, 3 levels deep for merchants.
- **Layer 1:** CreditClaw's 21 sectors (retail, office, fashion, etc.) — derived from `ucp_categories.sector_slug`
- **Layer 2:** ~192 Google L2 categories (Audio, Computers, Shoes, Power Tools, etc.)
- **Layer 3:** ~1,349 Google L3 categories (Headphones, Laptops, Athletic Shoes, etc.)
- A merchant can belong to **multiple** sectors and categories (e.g., Home Depot → construction + home, with Hardware > Power Tools, Home & Garden > Bathroom Accessories, etc.)
- See `merchant-taxonomy-schema-note.md` for full schema and `ucp_categories` / `brand_categories` table design

**Prerequisite:** The `ucp_categories` table must be seeded with Google's taxonomy file before taxonomy classification can produce sector mappings. Until seeded, scans set `sector: "uncategorized"`.

**Fallback:** If Claude is unavailable, regex-only score with `partial: true` and sector stays "uncategorized". Taxonomy can be populated on next successful scan.

#### SKILL.md Generation

After Claude analysis + scoring, generate a SKILL.md for the brand using the existing `generateVendorSkill()` transformer from `lib/procurement-skills/generator.ts`.

**What's needed:**
1. Assemble a `Partial<VendorSkill>` from Claude analysis + probes + extractMeta
2. Call `generateVendorSkill(vendorDraft)` → SKILL.md string
3. Save to `brand_index.skillMd` (column already exists)
4. Serve at a public URL (see Phase 3c)

The generator is a pure transformer — data in, SKILL.md out. No fetching, no LLM calls. The metadata `categories` section will be correct because Claude's taxonomy result feeds directly into the vendor draft.

**Cost:** ~$0.01 per scan (Claude call for checkout analysis + taxonomy combined, ~4k input tokens). No additional external service cost.

---

### Phase 3c: SKILL.md Serving

**What it does:** Makes generated SKILL.md files publicly accessible for AI agents.

**Endpoint:** `GET /brands/[slug]/skill` — returns the raw SKILL.md text content with `Content-Type: text/markdown`.

**Why `/skill` not `/skill.md`:** Next.js route segments are folder names. A folder literally named `skill.md` (with a dot) is an uncommon pattern that may behave unpredictably across deployments and edge runtimes. Using `/skill` as the route segment avoids this risk entirely — the `Content-Type: text/markdown` header tells clients and agents it's markdown regardless of URL extension.

**Implementation:** `app/brands/[slug]/skill/route.ts`

```typescript
export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const brand = await storage.getBrandBySlug(params.slug);
  if (!brand?.skillMd) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(brand.skillMd, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
   ```

**Trigger:** SKILL.md can be generated:
- Automatically during scan (Phase 3b, requires Claude)
- On-demand via `POST /api/v1/scan/skill` with `{ domain: string }` (future)
- Regenerated when the generator template changes (read `brandData` from DB, no re-scan)

**On-demand generation:** If `skillMd` is null but the brand has score data, the GET handler can generate it on the fly using the existing `brandData` JSONB + `generateVendorSkill()`, then cache the result to `brand_index.skillMd`.

**Response:** Raw markdown text, `Content-Type: text/markdown; charset=utf-8`, 24-hour cache via `Cache-Control: public, max-age=86400`.

---

## Enhanced Pipeline (After Phase 3a + 3b)

```
1. Parse + validate + rate limit (unchanged)
2. Cache check: getBrandByDomain() → 30-day window (unchanged)
3. fetchScanInputs(domain)                    → ScoreInput via Firecrawl (NEW)
   └── Optional: fetch additional pages for Claude (cart, checkout, about)
4. computeASXScore(input)                     → ASXScoreResult (regex signals — unchanged)
5. In parallel (NEW):
   ├── Claude analysis (checkout + taxonomy)  → LLM findings + TaxonomyResult
   └── Probes (API/protocol detection)        → capabilities, checkout methods
6. LLM score enhancement (floor principle)    → boosted ASXScoreResult (NEW)
7. Merge into vendorDraft (Partial<VendorSkill>):
   - sector + subSectors from taxonomy
   - capabilities from probes
   - checkoutMethods from probes + Claude
   - name from Claude > extractMeta > capitalize(domain)
8. generateVendorSkill(vendorDraft)           → SKILL.md string (NEW)
9. Persist via upsertBrandIndex():
   - Score fields always refreshed (including enhanced scores)
   - sector/subSectors updated if "uncategorized"/empty
   - skillMd saved
   - Curated fields never overwritten

   ⚠ IMPORTANT: Taxonomy guard pattern — `upsertBrandIndex()` excludes only `slug`
   and `domain` from the update set. All other passed fields (including `sector`)
   WILL overwrite existing values on conflict. The scan route must preserve
   curated sectors at the CALLER level, not rely on the storage layer:
   ```typescript
   sector: existing?.sector && existing.sector !== "uncategorized"
     ? existing.sector
     : taxonomyResult?.sectors[0] ?? "uncategorized",
   ```
   The current Tier 1 scan route already uses this pattern (`existing?.sector ?? "uncategorized"`).
   Phase 3b must extend it — never pass Claude's taxonomy directly without checking first.
10. Return response (includes slug, enhanced score, taxonomy info)
```

**Timing estimate:**
```
Step 3: Firecrawl fetch             3-5s   (homepage + optional pages in parallel)
Steps 4: Regex scoring              <10ms
Step 5: Claude + probes              5-10s  (parallel, Claude dominates)
Steps 6-9: computation + persist    <100ms

Total: ~8-15 seconds (steps 3 and 5 are sequential; within each, everything is parallel)
```

**Enhanced response shape:**

```json
{
  "domain": "staples.com",
  "slug": "staples",
  "name": "Staples",
  "score": 72,
  "label": "Good",
  "cached": false,
  "partial": false,
  "fetchMethod": "firecrawl",
  "sector": "Office Supplies",
  "subSectors": ["Printers", "Paper Products", "Desk Accessories"],
  "taxonomySource": "claude",
  "scannedAt": "2026-04-01T12:00:00.000Z",
  "breakdown": {
    "clarity": { "score": 30, "max": 40, "signals": [...] },
    "speed": { "score": 17, "max": 25, "signals": [...] },
    "reliability": { "score": 25, "max": 35, "signals": [...] }
  },
  "recommendations": [...],
  "skillMdUrl": "/brands/staples/skill"
}
```

**Graceful degradation:**

| Service down | Impact | Fallback |
|---|---|---|
| Firecrawl unavailable | JS-heavy sites score lower | Raw `fetch()` (current behavior), `fetchMethod: "raw"` |
| Claude unavailable | No LLM enhancement, no taxonomy, no SKILL.md | Regex-only score (current behavior), `partial: true`, `skillMd: null`, sector stays "uncategorized" |
| Both down | Minimal scan | Raw fetch + regex scoring only (identical to current Tier 1). Still produces a score and recommendations. |

The scan never fails completely. Every degradation level still returns a usable score.

---

## Code Changes

### Phase 3a (Firecrawl) — Files to modify

| File | Change |
|---|---|
| `lib/agentic-score/fetch.ts` | Add Firecrawl integration with raw `fetch()` fallback. `fetchScanInputs()` keeps same `ScoreInput` return type. Add optional `fetchScanPages()` that returns extended `ScanPages` for Claude. |

No other files change. Score engine, signals, recommendations, frontend — all untouched. The upgrade is transparent.

### Phase 3b (Claude + SKILL.md) — Files to create/modify

| File | Change |
|---|---|
| `lib/agentic-score/llm.ts` | NEW — Claude analysis: checkout flow + taxonomy classification. Takes stripped HTML, returns structured findings + taxonomy. |
| `lib/agentic-score/enhance.ts` | NEW — Applies LLM findings to boost regex signal scores (floor principle). |
| `app/api/v1/scan/route.ts` | Add Claude analysis step after scoring, apply enhancement, persist taxonomy + skillMd. |
| `server/storage/brand-index.ts` | No structural changes needed — taxonomy guard logic is in the scan route caller (see pipeline step 9 note). |

### Phase 3c (SKILL.md Serving) — Files to create

| File | Change |
|---|---|
| `app/brands/[slug]/skill/route.ts` | NEW — GET handler returning raw SKILL.md text from `brand_index.skillMd` with `Content-Type: text/markdown`. |

### Future: Code Consolidation (Optional)

The plan originally called for merging `lib/agentic-score/` and `lib/procurement-skills/builder/` into a single `lib/scan/` directory. This is still a valid cleanup but is NOT a prerequisite for Phase 3a/3b/3c. The enhancements can be added incrementally to the existing `lib/agentic-score/` directory.

If consolidation happens later:

| Current file | Destination | Notes |
|---|---|---|
| `lib/agentic-score/*` | `lib/scan/*` | Rename directory |
| `lib/agentic-score/domain-utils.ts` | `lib/scan/domain-utils.ts` | Update 1 import in `lib/agentic-score/fetch.ts` |
| `lib/procurement-skills/builder/probes.ts` | `lib/scan/probes.ts` | Move — probing is data collection |
| `lib/procurement-skills/builder/llm.ts` | `lib/scan/llm.ts` | Move — or merge with new `lib/agentic-score/llm.ts` |
| `lib/procurement-skills/builder/analyze.ts` | Absorbed into scan orchestrator | Only 2 callers need import updates |
| `lib/procurement-skills/generator.ts` | Stays | Pure transformer, no changes |
| `lib/procurement-skills/types.ts` | Stays | Shared types used across 12+ app files |

**Callers that would need import updates:** Only `app/api/v1/skills/submissions/route.ts` and `app/api/v1/skills/analyze/route.ts`.

---

## Per-Scan Cost Breakdown (Phase 3a + 3b)

| Service | Credits/Calls | Cost per scan |
|---|---|---|
| Firecrawl — homepage only | 1 credit | ~$0.0008 |
| Firecrawl — homepage + cart + checkout + about | ~5 credits | ~$0.004 |
| Claude (checkout + taxonomy) | 1 call (~4k input tokens) | ~$0.01 |
| **Total (minimum — homepage only)** | | **~$0.011** |
| **Total (full — 5 pages + Claude)** | | **~$0.014** |

At 1,000 scans/month: ~$11-14. At 10,000 scans/month: ~$110-140.

---

## Environment Variables Required

| Key | Service | Notes |
|---|---|---|
| `FIRECRAWL_API_KEY` | Firecrawl | For page rendering. Optional — falls back to raw fetch if missing. |
| `ANTHROPIC_API_KEY` | Anthropic | Already configured via Replit integration. Used for checkout analysis + taxonomy. |

---

## Implementation Order

### Step 1: Firecrawl setup (Phase 3a)
Install Firecrawl SDK package. Get API key. Update `lib/agentic-score/fetch.ts` to use Firecrawl with raw fallback. Same `ScoreInput` output, transparent to scoring.

### Step 2: Claude analysis (Phase 3b — checkout + taxonomy)
Create `lib/agentic-score/llm.ts` with checkout flow analysis + taxonomy classification. Wire into scan route after scoring. Persist taxonomy to `brand_index.sector`/`subSectors`.

### Step 3: Score enhancement (Phase 3b — LLM boost)
Create `lib/agentic-score/enhance.ts`. Apply floor-based boosts from Claude findings to applicable signals. Run after regex scoring, before persistence.

### Step 4: SKILL.md generation (Phase 3b — skill output)
Assemble `Partial<VendorSkill>` from Claude + probes + meta. Call `generateVendorSkill()`. Save to `brand_index.skillMd`.

### Step 5: SKILL.md serving (Phase 3c)
Create `app/brands/[slug]/skill.md/route.ts`. Serve raw markdown with proper content type and caching headers.

### Step 6: Update brand results page
Show SKILL.md preview + download button on `/brands/[slug]` when `skillMd` is available. Add taxonomy/sector display.

---

## Dependency Order

```
Step 1 (Firecrawl)     — independent, can ship alone for better scores immediately
Step 2 (Claude)        — depends on Step 1 (needs rendered pages for better analysis)
Step 3 (Enhancement)   — depends on Step 2 (needs Claude output)
Step 4 (SKILL.md gen)  — depends on Step 2 (needs Claude vendor data for rich skills)
Step 5 (SKILL.md serve)— depends on Step 4 (needs generated content)
Step 6 (UI update)     — depends on Step 5 (needs serving endpoint)
```

Steps 1 and 2 are sequential. Steps 3, 4, 5 can be built together after Step 2. Step 6 follows at the end.
