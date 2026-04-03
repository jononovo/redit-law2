# Firecrawl → Perplexity Migration Plan

## Goal
Remove Firecrawl entirely. Replace with Perplexity Sonar for both the technical site audit and the brand classification. Keep regex detectors as a lightweight fallback on a simple `fetch` (no Firecrawl).

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
  │     ├─ records evidence keys + findings
  │     └─ returns: evidence, citations, findings (checkout, search, payments)
  │     └─ BROKEN: Anthropic credits exhausted, returns empty
  │
  ├─ computeScoreFromRubric() ──── Merges detector + agent evidence → score
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
  │     └─ returns: name, sector, tier, description, guestCheckout, capabilities
  │     └─ NEW: deep 3-level taxonomy (categories → subcategories → sub-subcategories)
  │
  ├─ auditSite() ────────────────── Perplexity Sonar (response_format JSON schema) — NEW
  │     └─ returns: searchUrlPattern, paymentMethods, checkoutProviders,
  │                 platformTech, freeShippingThreshold, hasCaptcha, tips, etc.
  │     └─ replaces: agenticScan() + Firecrawl page fetching
  │
  ├─ fetchLightweightInputs() ──── Simple fetch (NO Firecrawl) — SIMPLIFIED
  │     ├─ homepage HTML capped at 15KB (for regex detectors only)
  │     ├─ robots.txt (for bot_tolerance signal)
  │     └─ NO sitemap fetch (Perplexity knows this already)
  │
  ├─ detectAll() ────────────────── Regex detectors on lightweight HTML (unchanged)
  │     └─ secondary validation layer, fills gaps Perplexity might miss
  │
  ├─ mergeAllEvidence() ─────────── Merge detector evidence + Perplexity audit → EvidenceMap
  ├─ computeScoreFromRubric() ──── Score from merged evidence (unchanged)
  ├─ buildVendorSkillDraft() ───── Build SKILL.md from audit + classification (enriched)
  └─ upsertBrandIndex() ────────── Write to DB (unchanged)
```

## Files to Change

### DELETE
| File | Reason |
|------|--------|
| `lib/agentic-score/agent-scan.ts` | Replaced by `auditSite()`. 446 lines of Claude agent loop + Firecrawl page fetching — all gone. |

### CREATE
| File | Purpose |
|------|---------|
| `lib/agentic-score/audit-site.ts` | Perplexity structured extraction for technical site signals. Already written. ~130 lines. |

### MODIFY
| File | Changes |
|------|---------|
| `lib/agentic-score/fetch.ts` | Remove `fetchWithFirecrawl()`, remove `FIRECRAWL_TIMEOUT`, reduce `MAX_HTML_LENGTH` from 200KB → 15KB. Keep `safeFetch`, `normalizeDomain`, `domainToSlug`, SSRF protection. Remove sitemap fetch (optional — detectors don't use it much). |
| `lib/agentic-score/classify-brand.ts` | Switch from free-text JSON to `response_format` JSON schema. Add deep 3-level `categories` field alongside existing flat `subCategories`. Increase timeout slightly for structured output. |
| `lib/agentic-score/index.ts` | Remove `agenticScan` export. Add `auditSite` export. Remove `AgenticScanResult` type export. |
| `lib/agentic-score/types.ts` | Remove `PageFetch`, `EvidenceCitation`, `AgenticScanResult` types (agent-scan specific). |
| `lib/agentic-score/scan-utils.ts` | Update `buildVendorSkillDraft()` to accept `SiteAudit` fields (searchUrlPattern, paymentMethods, tips, etc.) instead of generic findings object. Remove `mergeEvidence()` (replaced by simpler audit-to-evidence mapping). |
| `app/api/v1/scan/route.ts` | Replace `agenticScan()` call with `auditSite()`. Remove agent evidence/citation handling. Wire audit results into skill draft + DB upsert. |
| `lib/scan-queue/process-next.ts` | Same changes as route.ts — mirror the new pipeline. |
| `replit.md` | Update scanner architecture docs. |
| `package.json` | Remove `@mendable/firecrawl-js` dependency. |

### DO NOT CHANGE
| File | Reason |
|------|---------|
| `lib/agentic-score/detectors.ts` | Regex detectors still run on lightweight HTML. No changes. |
| `lib/agentic-score/rubric.ts` | Scoring rubric unchanged. |
| `lib/agentic-score/scoring-engine.ts` | Score computation unchanged. |
| `lib/procurement-skills/generator.ts` | SKILL.md template generation unchanged. |
| `shared/schema.ts` | DB schema unchanged (categories stored in existing `sub_sectors` jsonb or `brand_data` jsonb). |

## New Data Flow

### classifyBrand() — upgraded
```
Input: domain string
Output: {
  name, sector, tier, description,
  subCategories: string[],            // flat list (backward compat)
  categories: CategoryNode[],         // NEW: 3-level deep taxonomy
  capabilities, guestCheckout,
  hasSearchApi, hasMobileApp
}
```

### auditSite() — new
```
Input: domain string
Output: {
  hasGuestCheckout, hasSearchBar, searchUrlPattern,
  hasJsonLd, hasOpenGraph,
  paymentMethods[], checkoutProviders[],
  hasCartPage, hasCaptcha, hasPromoCodeField,
  freeShippingThreshold, estimatedDeliveryDays,
  platformTech, hasProductVariants, hasWishlist, hasStoreLocator,
  hasApi, hasMcp, tips[]
}
```

### Evidence mapping (audit → rubric)
The `auditSite` results map to rubric evidence keys:
- `hasJsonLd` → `json_ld_present` evidence
- `hasSearchBar` + `searchUrlPattern` → `site_search_*` evidence
- `hasGuestCheckout` → `guest_checkout_available` evidence
- `hasCaptcha` → `captcha_present` evidence
- `hasPromoCodeField` → `promo_code_field` evidence
- `hasProductVariants` → `variant_selectors` evidence
- `hasCartPage` → `cart_url_predictable` evidence
- `hasOpenGraph` → contributes to `clean_html` signal

## Execution Order
1. Upgrade `classify-brand.ts` (response_format + deep taxonomy)
2. Verify `audit-site.ts` is complete (already written)
3. Simplify `fetch.ts` (remove Firecrawl, cap HTML at 15KB)
4. Add audit-to-evidence mapping function in `scan-utils.ts`
5. Update `route.ts` — swap agent-scan for audit-site
6. Update `process-next.ts` — mirror route.ts changes
7. Update `index.ts` + `types.ts` — remove agent-scan exports
8. Delete `agent-scan.ts`
9. Remove `@mendable/firecrawl-js` from package.json
10. Update `replit.md`
11. Test full pipeline against target.com, chewy.com, allbirds.com
12. Code review

## Cost Comparison
| Step | Before | After |
|------|--------|-------|
| Brand classification | 1 Perplexity call (~$0.001) | 1 Perplexity call (~$0.001) |
| Technical audit | 1 Firecrawl scrape (~$0.01) + Claude agent 5-15 turns (~$0.10-0.30) | 1 Perplexity call (~$0.001) |
| HTML for detectors | Firecrawl 200KB | Simple fetch ~15KB |
| **Total per scan** | **~$0.12-0.32** | **~$0.003** |

## Risk Assessment
- **Perplexity index lag**: Very new or obscure sites may return less accurate data. Regex detectors serve as ground-truth fallback.
- **Structured output cold start**: First request with a new JSON schema may take 10-30s (Perplexity docs). Subsequent requests are fast.
- **Smaller brands**: Perplexity returned some "unknown" values for Allbirds. Detectors compensate.
