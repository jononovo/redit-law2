---
name: Bugs
description: Active bugs on the platform. Point-form, prioritized.
date: 2026-04-06
---

# Bugs

## High

- **7 brands with empty brandData/skillMd** — allbirds, brooklinen, casper, chubbies, everlane, mejuri, outdoor-voices. Pipeline doesn't save `draft` VendorSkill to `brandData` or `checkoutMethods`. Affects both scan paths (`app/api/v1/scan/route.ts`, `lib/scan-queue/process-next.ts`). Also: `/skills/[vendor]` detail page needs null guards for graceful degradation. (Also tracked in `premium-scan/outstanding.md`)

- **Stale DB entry** — `outdoor-voices` slug has wrong domain `outdoor-voices.com` (real: `outdoorvoices.com`). Empty data, stays `draft`

## Medium

- **Pagination sort stability** — default brands API sort (`overallScore DESC`) is not stable. Brands with identical scores can swap between pages

- **`brand_claims` unique index** — partial unique index for verified claims is missing. Causes test failure in `tests/brand-claims/api.test.ts`

- **`getAllBrandFacets()` scans full table** — in-memory cache (10 min TTL) mitigates but won't scale past thousands of brands

- **Wrong CLI directions** — on the brands.sh landing page there is "npx shopy add lululemon", but it's wrong and I think we decided on something like "npx skills brands-sh/shop lululemon" or something like that. We also added a URL based version (which we're not publicizing as they go to for now because we want people to list the skills via the skills.sh site.)

- **Vendor Skills Page not showing skills created/shown in brands.sh** — this is completely empty here: https://creditclaw.com/skills

## Low

- **Broken Category pages** — https://brands.sh/c/electronics - something similar like this was broken, and I think it had to do with SSR/SRI on the brand pages I think. And we fixed this a few days ago. Have a look how that was set up. Currently getting: Internal Server Error

- Add "Feedback Widget" from Replit — https://docs.replit.com/updates/2026/02/27/changelog#quick-feedback-widget-improvements
