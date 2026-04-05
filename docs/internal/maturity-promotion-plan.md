# Maturity Auto-Promotion — Technical Plan

*Fix sector pages, catalog, sitemap, and registry list by promoting brands out of `draft` after successful scans.*

---

## Problem

Every brand in the database has `draft` maturity. Multiple server-rendered pages filter to `["verified", "official", "beta", "community"]` by default, excluding drafts. This causes:

| Surface | Effect |
|---|---|
| `/c/[sector]` sector pages | 404 — `notFound()` called when 0 brands match |
| `/skills` catalog (server-side) | Shows 0 results unless client overrides with `draft` |
| `/api/v1/registry` list endpoint | Returns 0 results |
| `/api/v1/registry/search` | Returns 0 results |
| `sitemap.ts` | No sector pages or brand pages emitted |

The brands.sh landing page works because it explicitly passes `maturity=verified,official,beta,community,draft` from the client. Everything else relies on the server default which excludes drafts.

---

## Root Cause

The scan pipeline sets `maturity: "draft"` on every upsert and never promotes it. There is no promotion logic anywhere in the codebase.

---

## Solution: Auto-Promote After Successful Scan

After a scan completes and upserts to `brand_index`, check whether the brand now meets the threshold for `community` maturity. If so, update it in the same transaction.

### Promotion Criteria

A brand is promoted from `draft` to `community` when ALL of the following are true:

| Criterion | Why |
|---|---|
| `overall_score IS NOT NULL` | Brand has been scored |
| `skill_md IS NOT NULL AND skill_md != ''` | SKILL.md was generated |
| `brand_data::text != '{}'` | Structured data was captured |
| `maturity = 'draft'` | Only promote drafts (never demote) |

This is a deliberately low bar. `community` means "scanned and has data" — not editorially reviewed. Higher levels (`beta`, `verified`, `official`) remain manual promotions.

### Maturity Levels (for reference)

| Level | Meaning | How assigned |
|---|---|---|
| `draft` | Scanned but incomplete or untested | Default on upsert |
| `community` | Scanned, has score + SKILL.md + brandData | **Auto-promoted (this plan)** |
| `beta` | Reviewed by team, data quality confirmed | Manual |
| `verified` | Fully vetted, regularly re-scanned | Manual |
| `official` | Claimed and managed by the merchant | Via claim flow |

---

## Implementation

### Files to Modify

**1. `lib/agentic-score/scan-utils.ts`** — New function

Add a pure function that determines the appropriate maturity:

```typescript
export function resolveMaturity(
  currentMaturity: string | null,
  hasScore: boolean,
  hasSkillMd: boolean,
  hasBrandData: boolean,
): string {
  // Never demote — if already above draft, keep it
  if (currentMaturity && currentMaturity !== "draft") {
    return currentMaturity;
  }
  // Promote draft → community if all data is present
  if (hasScore && hasSkillMd && hasBrandData) {
    return "community";
  }
  return "draft";
}
```

**2. `app/api/v1/scan/route.ts`** — Wire into scan route

After the upsert call (around line 200-225), compute the resolved maturity and update if it changed:

```typescript
const resolvedMaturity = resolveMaturity(
  existing?.maturity ?? "draft",
  scoreResult.overallScore != null,
  !!skillMd,
  !!draft,
);
// Include in the upsert call:
maturity: resolvedMaturity,
```

Alternatively, set it directly in the existing upsert payload — no second query needed.

**3. `lib/scan-queue/process-next.ts`** — Same change for queue processor

Same logic as above, applied to the queue processor's upsert call (around line 146-171).

**4. One-time backfill query** — Promote existing brands

Run once after deploying the code change:

```sql
UPDATE brand_index
SET maturity = 'community', updated_at = NOW()
WHERE maturity = 'draft'
  AND overall_score IS NOT NULL
  AND skill_md IS NOT NULL
  AND skill_md != ''
  AND brand_data::text != '{}';
```

Expected: 27 of 28 brands promoted (all except `outdoor-voices` which has empty data).

### Files NOT Modified

| File | Why |
|---|---|
| `shared/schema.ts` | No schema changes — `maturity` column already exists as text |
| `server/storage.ts` | No new storage methods needed — upsert already accepts maturity |
| `app/c/[sector]/page.tsx` | No changes — the existing maturity filter is correct by design |
| `app/skills/page.tsx` | No changes — same reasoning |
| `lib/catalog/parse-filters.ts` | `DEFAULT_MATURITIES` stays as-is (excludes draft) |
| `components/tenants/brands/landing.tsx` | Landing page already works — no changes needed |

---

## What This Unblocks

After promotion, brands with `community` maturity will pass through all the existing filters:

| Surface | Before | After |
|---|---|---|
| `/c/apparel-accessories` | 404 | Shows ~12 brands |
| `/c/electronics` | 404 | Shows ~2 brands |
| `/skills` catalog (SSR) | 0 results | Shows all scanned brands |
| `/api/v1/registry` | 0 results | Returns all scanned brands |
| `/api/v1/registry/search` | 0 results | Search works |
| `sitemap.ts` | No brand/sector URLs | All populated sectors + brands emitted |
| `getPopulatedSectors()` | Returns `[]` | Returns sectors with brands |

---

## Risks

| Risk | Mitigation |
|---|---|
| Low-quality brands appearing on public pages | `community` is the lowest non-draft tier. The existing maturity hierarchy means `beta`/`verified`/`official` pages could filter more strictly if needed later. |
| Accidental demotion on re-scan | `resolveMaturity()` never demotes — if maturity is already above `draft`, it's preserved. |
| Backfill affects claimed brands | The backfill query only touches `draft` brands. Any brand already at `official` (via claim flow) is untouched. |

---

## Build Sequence

1. Add `resolveMaturity()` function to `lib/agentic-score/scan-utils.ts`
2. Wire into scan route upsert (`app/api/v1/scan/route.ts`)
3. Wire into queue processor upsert (`lib/scan-queue/process-next.ts`)
4. Run backfill SQL to promote existing brands
5. Verify: `/c/apparel-accessories` returns 200, `/api/v1/registry` returns brands, sitemap includes sector URLs

Estimated effort: ~20 minutes. No schema changes, no migrations, no new tables.
