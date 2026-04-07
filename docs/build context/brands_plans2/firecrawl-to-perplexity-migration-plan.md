# Firecrawl → Perplexity Migration Plan

## Goal
Remove Firecrawl entirely. Replace with Perplexity Sonar for the technical site audit. Keep regex detectors as a ground-truth fallback running on a simple `fetch` (no Firecrawl).

## Current Architecture (before)

```
Domain
  ├─ fetchScanInputs() ──────────── Firecrawl scrapeUrl → 200KB raw HTML
  │     ├─ also fetches robots.txt, sitemap.xml via raw fetch
  │     └─ falls back to raw fetch if Firecrawl unavailable
  │
  ├─ classifyBrand() ────────────── Perplexity Sonar (free-text JSON, no schema)
  │     └─ returns: name, sector, tier, subCategories (flat list), capabilities, description
  │
  ├─ detectAll() ────────────────── Regex detectors on raw HTML
  │     └─ returns: EvidenceMap (bot_tolerance, search, cart, aria, etc.)
  │
  ├─ agenticScan() ──────────────── Claude agent with tool loop
  │     ├─ reads homepage HTML (60KB stripped)
  │     ├─ fetches additional pages via agentFetchPage() (uses Firecrawl)
  │     ├─ records evidence keys + findings via tool calls
  │     └─ returns: evidence, citations, findings (checkout, search, payments)
  │     └─ BROKEN: Anthropic credits exhausted, returns empty in 154ms
  │
  ├─ mergeEvidence() ──────────── Merges detector + agent evidence (truthy wins)
  ├─ computeScoreFromRubric() ──── Scores from merged evidence
  ├─ buildVendorSkillDraft() ───── Builds SKILL.md draft from findings
  └─ upsertBrandIndex() ────────── Writes to DB
```

**Problems:**
- Firecrawl returns 200KB of HTML — wasteful, slow, expensive
- Claude agent-scan is broken (no Anthropic credits) and was the most expensive step
- Two paid APIs (Firecrawl + Anthropic) for data that Perplexity can return directly
- `classifyBrand` uses free-text JSON (fragile parsing) instead of structured `response_format`

## Target Architecture (after)

```
Domain
  ├─ classifyBrand() ────────────── Perplexity Sonar (response_format JSON schema)
  │     └─ returns: name, sector, tier, description, capabilities
  │     └─ guestCheckout, hasSearchApi, hasMobileApp
  │
  ├─ auditSite() ────────────────── Perplexity Sonar (response_format JSON schema) — NEW
  │     └─ returns: searchUrlPattern, paymentMethods, checkoutProviders,
  │                 platformTech, freeShippingThreshold, hasCaptcha, tips, etc.
  │     └─ replaces: agenticScan() + Firecrawl page fetching
  │
  ├─ fetchScanInputs() ──────────── Simple fetch (NO Firecrawl) — SIMPLIFIED
  │     ├─ homepage HTML capped at 50KB (for regex detectors)
  │     ├─ sitemap.xml (for product_feed signal — worth 10 points)
  │     ├─ robots.txt (for bot_tolerance signal — worth 5 points)
  │     └─ pageLoadTimeMs (for page_load signal — worth 5 points)
  │
  ├─ detectAll() ────────────────── Regex detectors on HTML (unchanged)
  │     └─ ground-truth layer — catches things Perplexity misses
  │
  ├─ auditToEvidence() ──────────── NEW: converts SiteAudit → EvidenceMap
  ├─ mergeEvidence() ──────────── Merge detector + audit evidence (truthy wins, same logic)
  ├─ computeScoreFromRubric() ──── Score from merged evidence (unchanged)
  ├─ buildVendorSkillDraft() ───── Build SKILL.md from audit + classification (enriched)
  └─ upsertBrandIndex() ────────── Write to DB (unchanged)
```

## Critical Detail: What MUST Be Kept

### Sitemap + robots.txt fetches
The detectors use these directly:
- `detectProductFeed(sitemapContent, robotsTxtContent)` — **10 points** (sitemap present, valid XML, product URLs, sitemap index, robots reference)
- `detectBotTolerance(robotsTxtContent, html)` — **5 points** (crawl rules, AI blocks, crawl delay)
- `detectPageLoad(pageLoadTimeMs)` — **5 points** (timing from the homepage fetch itself)

These fetches are already plain `safeFetch` — no Firecrawl involved. **Keep them.**

### The 4 agent-only rubric criteria (already broken)
These 4 criteria are `source: "agent"` — they could ONLY come from the Claude agent loop:
- `productPricingStructured` (2 pts) — machine-readable pricing on product pages
- `productVariantStandard` (1 pt) — standard variant form elements
- `productAddToCartClear` (1 pt) — clear add-to-cart button
- `productIdInUrl` (1 pt) — product ID in URL

**Total: 5 points out of 100.** These are already unreachable (zero Anthropic credits). No regression from removing agent-scan. In the future we could add Perplexity checks for these, but not now.

## Evidence Key Mapping (audit → rubric)

The `auditSite()` results map to rubric evidence keys that help score "either" source criteria:

| Audit field | Rubric evidence key | Points | Signal |
|-------------|---------------------|--------|--------|
| `hasGuestCheckout` | `guestCheckout` | 5 | access_auth |
| `hasProductVariants` | `variantSelectors` | 3 | order_management |
| `hasCartPage` | `predictableCartUrl` | 2 | order_management |
| `hasPromoCodeField` | `discountField` | 2 | checkout_flow |
| `paymentMethods.length > 0` | `paymentMethodsLabeled` | 3 | checkout_flow |
| `freeShippingThreshold != null && != -1` | `shippingOptions` | 3 | checkout_flow |
| `hasApi` | `publicApi` | 3 | search_api |
| `hasMcp` | `mcpEndpoint` | 4 | search_api |

**Max additional points from audit: ~25 points** — these supplement what detectors find.

### What audit DOESN'T affect
- JSON-LD signals (15 pts) — detectors handle this from raw HTML
- Product Feed / Sitemap (10 pts) — detectors handle from sitemap.xml fetch
- Clean HTML (10 pts) — detectors handle from raw HTML
- Site Search form (10 pts) — detectors handle from raw HTML
- Page Load (5 pts) — detectors handle from fetch timing
- Bot Tolerance (5 pts) — detectors handle from robots.txt + HTML

### Merge logic
Same as current `mergeEvidence()`: if either source (detector or audit) says `true`, the merged evidence is `true`. This prevents Perplexity returning `false` from overriding a detector's `true`.

## Files to Change

### DELETE
| File | Reason |
|------|--------|
| `lib/agentic-score/agent-scan.ts` | 446 lines. Claude agent loop + Firecrawl page fetching. Replaced by `auditSite()`. |

### ALREADY CREATED
| File | Purpose |
|------|---------|
| `lib/agentic-score/audit-site.ts` | Perplexity structured extraction for technical site signals. ~130 lines. |

### MODIFY
| File | What changes | What stays |
|------|-------------|-----------|
| `lib/agentic-score/fetch.ts` | Remove `fetchWithFirecrawl()` (lines 82-109), remove `FIRECRAWL_TIMEOUT`, remove Firecrawl call from `fetchScanInputs()`. Reduce `MAX_HTML_LENGTH` to 50KB. | `safeFetch`, `normalizeDomain`, `domainToSlug`, SSRF protection, sitemap fetch, robots.txt fetch, pageLoadTimeMs timing. |
| `lib/agentic-score/classify-brand.ts` | Switch from free-text JSON to `response_format` JSON schema for reliability. Increase timeout to 25s. | Same interface — `BrandClassification` return type unchanged. |
| `lib/agentic-score/scan-utils.ts` | Add `auditToEvidence()` function that converts `SiteAudit` → `EvidenceMap`. | `mergeEvidence()` (still used — now merges detector + audit evidence), `buildVendorSkillDraft()` (updated to read audit fields), all other helpers. |
| `lib/agentic-score/index.ts` | Remove `agenticScan` export. Add `auditSite` export. Remove `AgenticScanResult`, `EvidenceCitation`, `PageFetch` type exports. | All other exports. |
| `lib/agentic-score/types.ts` | Remove `PageFetch`, `EvidenceCitation`, `AgenticScanResult` interfaces. | `ScoreInput`, `ASXScoreResult`, all other types. |
| `app/api/v1/scan/route.ts` | Replace `agenticScan()` with `auditSite()`. Use `auditToEvidence()` for evidence mapping. Build findings from audit. Return `citations: []` (empty, backward compat). | Cache check, rate limiting, detector calls, score computation, DB upsert, response shape. |
| `lib/scan-queue/process-next.ts` | Same changes as route.ts — mirror the new pipeline. | Queue claiming, stale detection, queue stats, all queue management functions. |
| `package.json` | Remove `@mendable/firecrawl-js` dependency. | Everything else. |

### DO NOT CHANGE
| File | Reason |
|------|--------|
| `lib/agentic-score/detectors.ts` | Regex detectors unchanged. They run on the same HTML + sitemap + robots.txt. |
| `lib/agentic-score/rubric.ts` | Scoring rubric unchanged. Agent-only criteria stay in rubric (5 pts) — they just won't score until we add that capability back. |
| `lib/agentic-score/scoring-engine.ts` | Score computation unchanged. |
| `lib/procurement-skills/generator.ts` | SKILL.md template generation unchanged. |
| `lib/procurement-skills/types.ts` | VendorSkill type unchanged. |
| `shared/schema.ts` | DB schema unchanged. |
| `lib/scan-queue/scheduler.ts` | Scheduler unchanged. |
| `app/admin123/scan-queue/page.tsx` | Admin UI unchanged. |

## Frontend Impact: NONE

Verified — no `.tsx` files reference:
- `citations` — not rendered anywhere
- `enhanced` — not rendered anywhere  
- `scanTier` — only in API response and DB, not in any UI component
- `AgenticScanResult`, `EvidenceCitation`, `PageFetch` — backend-only types

The scan results page reads `score`, `label`, `breakdown`, `recommendations` — all unchanged.

## Potential Score Impact

### Scores may GO UP for most sites
The Claude agent was returning empty (no credits), so scores were detector-only (~31 for many sites). Now the Perplexity audit can contribute additional evidence for "either" source criteria, potentially adding up to ~25 points.

### Scores may be SLIGHTLY LOWER than full-agent scans
When Claude was working (with credits), it could visit product pages and fill in 5 agent-only points. Those 5 points are now unreachable. But this was already the case.

### Net effect: scores improve significantly vs current broken state
Current state: detector-only ~31 points. After migration: detector + Perplexity audit ~45-65 points (estimated).

## Execution Order
1. Simplify `fetch.ts` (remove Firecrawl, keep sitemap + robots, cap HTML at 50KB)
2. Upgrade `classify-brand.ts` (response_format JSON schema)
3. Verify `audit-site.ts` is complete (already written)
4. Add `auditToEvidence()` to `scan-utils.ts`
5. Update `route.ts` — swap agent-scan for audit-site
6. Update `process-next.ts` — mirror route.ts changes
7. Update `index.ts` + `types.ts` — remove agent-scan exports
8. Delete `agent-scan.ts`
9. Remove `@mendable/firecrawl-js` from package.json
10. Update `replit.md`
11. Deploy + test against queued domains

## Cost Comparison
| Step | Before (when working) | After |
|------|----------------------|-------|
| Brand classification | 1 Perplexity call (~$0.001) | 1 Perplexity call (~$0.001) |
| Technical audit | 1 Firecrawl scrape (~$0.01) + Claude agent 5-15 turns (~$0.10-0.30) | 1 Perplexity call (~$0.001) |
| HTML for detectors | Firecrawl 200KB | Simple fetch ~50KB |
| **Total per scan** | **~$0.12-0.32** | **~$0.003** |

## Risk Assessment
- **Perplexity index lag**: Very new or obscure sites may return less accurate data. Regex detectors serve as ground-truth fallback.
- **Structured output cold start**: First request with a new JSON schema may take 10-30s. Subsequent requests faster.
- **Smaller brands**: Perplexity may return "unknown" for some fields. Detectors compensate.
- **No product page visits**: Unlike Claude agent, Perplexity doesn't actually browse the site. 5 agent-only points are unreachable. Already the case.
