---
name: Build Backlog
description: Running list of things that need building, fixing, or cleaning up. Point-form, prioritized.
date: 2026-04-05
---

# Build Backlog



## Cleanup

- **Clean out `public/` folder** — platform skill files (`SKILL.md`, `skill.json`, `_meta.json`), platform-specific folders (`amazon/`, `shopify/`, `bigcommerce/`, `magento/`, `squarespace/`, `wix/`, `woocommerce/`, `generic/`), legacy agent docs (`agents/`), `Plugins/`, and loose markdown guides (`CHECKOUT-GUIDE.md`, `SHOPPING-GUIDE.md`, `HEARTBEAT.md`, `MANAGEMENT.md`, `MY-STORE.md`, `STRIPE-X402-WALLET.md`, `WEBHOOK.md`) are cluttering the folder. The valuable content (`tenants/`, `assets/`) is getting buried. Move or archive non-essential files.

- **Drizzle folder has lots of files - are they necessary?** - there's a ton of files in there that are really big and I think might just be part of like some one time use but if they're not, and if they're important, then we can keep them. Here's an example: drizzle/0009_replace_readiness_with_asx_score.sql

  

## Unbuilt Features

- **Scan history** — append-only scan log for score trending. Schema designed, not built. Plan: `internal_docs/scanning/scan-history-plan.md`
- **Shopy CLI** (`npx shopy add <brand>`) — advertised on brands.sh landing page but npm package doesn't exist
- **Skill distribution Phase 2** — pending front matter discussion
- **Category keywords** — ~1,286 / 5,638 populated. Run `npx tsx scripts/generate-category-keywords.ts` to continue
- **Premium scan tier** — browser-agent inspection for deeper scoring. Research exists in `docs/build context/premium-scan/`

## Known Issues

- **Pagination sort stability** — default brands API sort (`overallScore DESC`) is not stable. Brands with identical scores can swap between pages
- **Stale DB entry** — `outdoor-voices` slug has wrong domain `outdoor-voices.com` (real: `outdoorvoices.com`). Empty data, stays `draft`
- **`brand_claims` unique index** — partial unique index for verified claims is missing. Causes test failure in `tests/brand-claims/api.test.ts`
- **`getAllBrandFacets()` scans full table** — in-memory cache (10 min TTL) mitigates but won't scale past thousands of brands

## Research to Migrate

- **`docs/build context/`** — ~40 files of research, build plans, and strategy docs need categorizing and moving into `project_knowledge/` structure
