---
name: Maturity Auto-Promotion
description: How brands auto-promote from draft to community after successful scans. Read this before changing maturity logic, visibility filters, or the scan pipeline's post-upsert steps.
---

# Maturity Auto-Promotion

**Status:** Implemented. Deployed and backfilled as of April 2026.

---

## Why It Exists

Every brand entered the database as `draft` maturity. Multiple server-rendered pages (sector pages, catalog, registry API, sitemap) filter to `["verified", "official", "beta", "community"]` by default — excluding drafts. This meant a brand could be fully scanned with a score, SKILL.md, and brand data, yet remain invisible across the entire site.

The auto-promotion system fixes this by promoting brands to `community` as soon as they have sufficient data, without requiring manual review.

---

## How It Works

A pure function `resolveMaturity()` in `lib/agentic-score/scan-utils.ts` determines the correct maturity level:

```typescript
resolveMaturity(currentMaturity, hasScore, hasSkillMd, hasBrandData) → string
```

**Promotion criteria** — a brand promotes from `draft` to `community` when ALL of:
- `overallScore` is not null (brand has been scored)
- `skillMd` is not null and not empty (SKILL.md was generated)
- `brandData` is not empty `{}` (structured data was captured)

**Never demotes** — if maturity is already `community`, `beta`, `verified`, or `official`, the function returns the existing value regardless of the data signals. This is the most important invariant.

### Maturity hierarchy

| Level | Meaning | How assigned |
|---|---|---|
| `draft` | Scanned but incomplete or untested | Default on upsert |
| `community` | Scanned, has score + SKILL.md + brandData | Auto-promoted by `resolveMaturity()` |
| `beta` | Reviewed by team, data quality confirmed | Manual |
| `verified` | Fully vetted, regularly re-scanned | Manual |
| `official` | Claimed and managed by the merchant | Via claim flow |

### Where it's wired in

Both scan paths call `resolveMaturity()` after computing the scan results and include the resolved maturity in the upsert payload:

| File | Integration point |
|---|---|
| `app/api/v1/scan/route.ts` | After score computation, before `upsertBrandIndex()` |
| `lib/scan-queue/process-next.ts` | Same — after score computation, before upsert |

### Edge case: brandData fallback

When scanning, if the `buildVendorSkillDraft()` call produces a valid draft but the data is sparse, the pipeline falls back to existing `brandData` from the database rather than overwriting with empty data. This prevents a rescan from accidentally clearing brand data and demoting the maturity check.

---

## Key Files

| File | Role |
|---|---|
| `lib/agentic-score/scan-utils.ts` | `resolveMaturity()` function |
| `app/api/v1/scan/route.ts` | Wired into public scan API |
| `lib/scan-queue/process-next.ts` | Wired into background queue processor |
| `lib/catalog/parse-filters.ts` | `DEFAULT_MATURITIES` — the server-side filter that excludes `draft` |
| `tests/maturity/resolve-maturity.test.ts` | 12 unit tests covering all promotion and non-demotion paths |

---

## Gotchas

### The "community" bar is deliberately low

`community` means "scanned and has data" — not editorially reviewed. This is intentional. The goal is to get brands visible on the site as quickly as possible. Higher maturity levels (`beta`, `verified`, `official`) require manual promotion and serve as quality gates.

### DEFAULT_MATURITIES controls all visibility

`DEFAULT_MATURITIES` in `lib/catalog/parse-filters.ts` is `["verified", "official", "beta", "community"]`. Every server-side query that filters by maturity uses this array. If you add a new maturity level, you must decide whether it belongs in this array or not — being absent means the brand is invisible everywhere by default.

### Backfill was run once

The initial deployment included a one-time SQL backfill that promoted 27 of 28 brands from `draft` to `community`. The one exception was `outdoor-voices` (stale entry with wrong domain and empty data). Future brands are promoted automatically by the scan pipeline — no more backfills needed.

### The brands.sh landing page doesn't use DEFAULT_MATURITIES

The brands.sh landing component explicitly passes all maturity levels including `draft` in its fetch call. This means drafts show up on the landing page but not on sector pages, the catalog, or the registry API. This is by design — the landing page is a firehose view.
