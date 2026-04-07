---
name: Premium Scan — Outstanding Items
description: Scanner pipeline bugs, scan history, and brand versioning that need to land before or alongside premium scan.
date: 2026-04-06
---

# Outstanding Items (Pre-Premium Scan)

## Scanner Pipeline Bugs

**Priority:** High — 7 of ~28 brands have empty brandData/skillMd due to pipeline bugs. Every new scan also loses structured data.

**Bugs:**
- `draft` VendorSkill not saved to `brandData` in both scan paths (`app/api/v1/scan/route.ts`, `lib/scan-queue/process-next.ts`)
- `checkoutMethods` from draft never written to upsert call
- `/skills/[vendor]` detail page needs null guards so brands with empty brandData degrade gracefully

**Affected brands (empty brandData + no skillMd):** allbirds, brooklinen, casper, chubbies, everlane, mejuri, outdoor-voices

## Scan History

**Status:** Schema designed, not built.

- `scan_history` table (append-only log of every scan)
- `insertScanHistory()` storage method
- Wire into both scan paths (after upsert)
- `GET /api/v1/brands/{slug}/history` endpoint
- Enables: score trending, scan count, historical SKILL.md reference

## Brand Versioning

**Status:** Technical plan complete, not built.
**Source:** `brand-versioning-technical-plan.md`

Two new tables: `brand_versions` (append-only score history + brand_index snapshot per scan) and `brand_version_files` (arbitrary file tree per version — SKILL.md, skill.json, future files). Enables score trending, regression detection, rollback, diff views, and versioned package downloads via registry API.

Should land before premium scan — premium vs free comparison needs version history.
