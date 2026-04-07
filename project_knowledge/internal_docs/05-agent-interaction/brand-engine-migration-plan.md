---
name: Brand Engine Migration — Technical Execution Plan
description: Step-by-step plan to move 6 lib folders + 5 storage files into lib/brand-engine/ and server/storage/brand-engine/. Each phase is independently testable.
---

# Brand Engine Migration — Technical Execution Plan

## Overview

Move 6 subfolders from `lib/` into `lib/brand-engine/` and 5 storage files into `server/storage/brand-engine/`. Total: ~33 files moved, ~55 import rewrites.

**Test command (run after every phase):**
```
npx tsc --noEmit
```
If it exits 0, no broken imports. If it fails, it prints every file with a broken import path.

---

## Phase 1: `agentic-score/` (largest — 10 files, 20 import rewrites)

**Move:**
```
mv lib/agentic-score/ lib/brand-engine/agentic-score/
```

**Imports to update (6 files, 20 import statements):**
| File | Import count |
|------|-------------|
| `app/api/v1/scan/route.ts` | 8 |
| `lib/scan-queue/process-next.ts` | 7 |
| `app/agentic-shopping-score/methodology/page.tsx` | 2 |
| `app/brands/[slug]/page.tsx` | 1 |
| `lib/procurement-controls/evaluate.ts` | 1 |
| `tests/maturity/resolve-maturity.test.ts` | 1 |

**Internal imports** (files within `lib/agentic-score/` that import from each other):
These use relative paths (`./rubric`, `./types`) and won't break when the folder moves.

**Find-and-replace pattern:**
`@/lib/agentic-score` → `@/lib/brand-engine/agentic-score`

**Verify:**
```
npx tsc --noEmit
grep -r "@/lib/agentic-score" --include="*.ts" --include="*.tsx"  # expect 0 matches
```

---

## Phase 2: `procurement-skills/` (17 files, 16 files to update)

**Move:**
```
mv lib/procurement-skills/ lib/brand-engine/procurement-skills/
```

**Imports to update (16 files, ~36 import statements):**
| File | Import count |
|------|-------------|
| `lib/agentic-score/classify-brand.ts` | 6 |
| `lib/scan-queue/process-next.ts` | 4 |
| `app/api/v1/scan/route.ts` | 4 |
| `lib/agentic-score/resolve-categories.ts` | 4 |
| `components/tenants/brands/landing.tsx` | 3 |
| `app/sitemap.ts` | 2 |
| `app/c/[sector]/page.tsx` | 2 |
| `app/skills/[vendor]/page.tsx` | 2 |
| `lib/agentic-score/scan-utils.ts` | 3 |
| `server/storage/brand-index.ts` | 1 |
| `app/brands/[slug]/skill-json/route.ts` | 1 |
| `app/skills/vendor-card.tsx` | 1 |
| `app/skills/catalog-client.tsx` | 1 |
| `app/skills/[vendor]/skill-detail-content.tsx` | 1 |
| `app/api/v1/registry/search/route.ts` | 1 |
| `app/api/v1/registry/[vendor]/skill-json/route.ts` | 1 |

**Note:** Some of these files were already updated in Phase 1 (e.g., `scan-utils.ts` is now at `lib/brand-engine/agentic-score/scan-utils.ts`). The imports FROM those files still use `@/lib/procurement-skills` which needs updating.

**Find-and-replace pattern:**
`@/lib/procurement-skills` → `@/lib/brand-engine/procurement-skills`

**Verify:**
```
npx tsc --noEmit
grep -r "@/lib/procurement-skills" --include="*.ts" --include="*.tsx"  # expect 0 matches
```

---

## Phase 3: `scan-queue/` (2 files, 3 files to update)

**Move:**
```
mv lib/scan-queue/ lib/brand-engine/scan-queue/
```

**Imports to update (3 files):**
| File | Import count |
|------|-------------|
| `app/api/admin/scan-queue/run/route.ts` | 2 |
| `app/api/admin/scan-queue/route.ts` | 1 |
| `app/api/admin/scan-queue/scheduler/route.ts` | 1 |

**Find-and-replace pattern:**
`@/lib/scan-queue` → `@/lib/brand-engine/scan-queue`

**Verify:**
```
npx tsc --noEmit
grep -r "@/lib/scan-queue" --include="*.ts" --include="*.tsx"  # expect 0 matches
```

---

## Phase 4: `catalog/` + `brand-claims/` + `feedback/` (4 files, 8 files to update)

These are small enough to do together.

**Move:**
```
mv lib/catalog/ lib/brand-engine/catalog/
mv lib/brand-claims/ lib/brand-engine/brand-claims/
mv lib/feedback/ lib/brand-engine/feedback/
```

**Imports to update:**

`@/lib/catalog` (5 files):
| File | Import count |
|------|-------------|
| `app/api/internal/brands/search/route.ts` | 1 |
| `app/skills/page.tsx` | 1 |
| `app/api/v1/registry/route.ts` | 1 |
| `app/api/v1/registry/search/route.ts` | 1 |
| `app/api/v1/brands/route.ts` | 1 |

`@/lib/brand-claims` (2 files):
| File | Import count |
|------|-------------|
| `app/api/v1/brands/[slug]/claim/route.ts` | 1 |
| `tests/brand-claims/domain.test.ts` | 1 |

`@/lib/feedback` (1 file):
| File | Import count |
|------|-------------|
| `app/api/internal/feedback/aggregate/route.ts` | 1 |

**Find-and-replace patterns:**
`@/lib/catalog` → `@/lib/brand-engine/catalog`
`@/lib/brand-claims` → `@/lib/brand-engine/brand-claims`
`@/lib/feedback` → `@/lib/brand-engine/feedback`

**Verify:**
```
npx tsc --noEmit
grep -r "@/lib/catalog\|@/lib/brand-claims\|@/lib/feedback" --include="*.ts" --include="*.tsx"  # expect 0 matches
```

---

## Phase 5: Storage files (5 files, ~1 file to update directly)

**Move:**
```
mv server/storage/brand-index.ts server/storage/brand-engine/brand-index.ts
mv server/storage/brand-categories.ts server/storage/brand-engine/brand-categories.ts
mv server/storage/brand-claims.ts server/storage/brand-engine/brand-claims.ts
mv server/storage/brand-feedback.ts server/storage/brand-engine/brand-feedback.ts
mv server/storage/brand-login-accounts.ts server/storage/brand-engine/brand-login-accounts.ts
```

**Key consideration:** `server/storage/index.ts` is a barrel file that re-exports from all storage files. Most app code imports from `@/server/storage` (the barrel), NOT from individual files. So the barrel needs updating, but downstream code stays the same.

**Direct imports to check:**
| Pattern | Where |
|---------|-------|
| `@/server/storage/brand-index` | `lib/catalog/parse-filters.ts` (now at `lib/brand-engine/catalog/parse-filters.ts`) |

**Update barrel:** `server/storage/index.ts` — change import paths for the 5 moved files.

**Verify:**
```
npx tsc --noEmit
grep -r "@/server/storage/brand-" --include="*.ts" --include="*.tsx"  # should only match barrel re-exports
```

---

## Phase 6: Final cleanup

1. Verify no empty folders remain at old locations
2. Run full build one more time: `npx tsc --noEmit`
3. Restart dev server to confirm runtime behavior
4. Grep for any remaining old paths:
   ```
   grep -r "@/lib/agentic-score\|@/lib/scan-queue\|@/lib/procurement-skills\|@/lib/brand-claims\|@/lib/catalog\|@/lib/feedback" --include="*.ts" --include="*.tsx"
   ```
   Expect 0 matches.

---

## Rollback

If something goes wrong at any phase, the checkpoint system has a snapshot from before we started. We can suggest a rollback to the pre-migration checkpoint.

---

## Summary

| Phase | What moves | Files moved | Import rewrites | Risk |
|-------|-----------|-------------|-----------------|------|
| 1 | `agentic-score/` | 10 | 20 | Medium (most imports) |
| 2 | `procurement-skills/` | 17 | 36 | Medium (wide usage) |
| 3 | `scan-queue/` | 2 | 4 | Low |
| 4 | `catalog/` + `brand-claims/` + `feedback/` | 4 | 8 | Low |
| 5 | Storage files | 5 | ~5 (barrel + direct) | Low |
| 6 | Cleanup + final verify | 0 | 0 | None |
| **Total** | | **38** | **~73** | |
