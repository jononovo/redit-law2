# CreditClaw — Active Build Backlog

Everything that's outstanding, in build sequence order. Each item has a priority, status, dependencies, and reference to its source plan (if one exists).

Last updated: 2026-04-02

---

## What's Already Complete

For reference — these are done and archived:

- Tier 1 ASX Score Scanner (agentic multi-page scan, rubric v1.1.0, 11 signals, SKILL.md generation)
- Brand Index v3 (single `brand_index` table, vendor registry eliminated)
- Brand Claims (domain-match auto-verify, admin review queue, claim/revoke)
- My Skills Unification (Phase 4 — unified skill contributions page)
- Phase 5 — vendor registry eliminated, DB-only source of truth
- Phase 8 — `vendors` table removed, `brandLoginAccounts` renamed
- Feedback Loop (table, API, aggregation, SKILL.md integration, catalog display)
- Sector Landing Pages (`/c/[sector]`)
- Brand Detail Page SSR (`/skills/[vendor]`)
- `agentic-commerce-standard.md` updated to v1.1 (Discoverability pillar, UCP taxonomy, returns, platform, skill.json)
- `skill.json` schema defined (`Shopy/skill-json-schema.md`)

---

## Build Sequence

### Step 1: Shareable Catalog URLs

#### URL-Based Filter State on `/skills`

**Priority:** Medium
**Status:** Not started
**Source:** `completed/remaining-build-tasks.md` Task 1

The catalog page (`/skills`) ignores `searchParams` server-side. Filters are client-only via `catalog-client.tsx`, so crawlers always see the default unfiltered view and filtered URLs can't be shared or bookmarked.

**What's needed:**
- `app/skills/page.tsx` reads `searchParams`, passes filters to `storage.searchBrands()` server-side
- `catalog-client.tsx` refactored to accept initial server data + use `router.replace()` for filter changes
- `generateMetadata()` reflects current filters (e.g., "Office AI Procurement Skills" instead of generic title)
- Sector filters use `/c/[sector]` routes, NOT `?sector=` on `/skills`
- `/skills` handles: `?q=`, `?checkout=`, `?tier=`, `?capability=`, `?maturity=`

**Code context:** The internal API route (`app/api/internal/brands/search/route.ts`) already maps URL params to `BrandSearchFilters` — the same mapping logic works server-side. `storage.searchBrands()` supports all needed filters. The server component currently fetches a hardcoded default view (limit 50, sorted by score, public maturities only).

**Files:** `app/skills/page.tsx`, `app/skills/catalog-client.tsx`

---

### Step 2: Multitenant System

**Priority:** High — prerequisite for all shopy.sh work
**Status:** Plan complete (727 lines), not started
**Source:** `Shopy/1-multitenant-system-nextjs-implementation-plan.md`

Middleware-based tenant resolution from domain. Static tenant configs in `public/tenants/`. Per-tenant `generateMetadata()`, HSL theme injection, route-level separation, Firebase Auth scoping.

One codebase serves both creditclaw.com and shopy.sh.

---

### Step 3: shopy.sh Pages

**Priority:** High (after multitenant)
**Status:** Brand identity doc complete, no build plan yet
**Source:** `Shopy/shopy-sh-brand-identity.md`
**Depends on:** Step 2

Build the shopy.sh-specific pages:
- `/` — shopy.sh landing page
- `/standard` — the authoritative agentic commerce standard (render `agentic-commerce-standard.md`)
- `/guide` — non-technical explainer for merchants
- `/catalog` — developer-focused brand catalog
- `/leaderboard` — top vendors by ASX Score and AXS Rating

---

### Step 4: Registry API + shopy CLI

**Priority:** Medium (after shopy.sh pages)
**Status:** Plan complete (3 phases), not started
**Source:** `Shopy/shopy-cli-technical-plan.md`
**Depends on:** Step 3

- Phase 1: Public registry API (`/api/v1/registry/`) — search, download, version manifests
- Phase 2: npm package — `npx shopy add amazon`, config management, local manifests
- Phase 3: `update`, `init`/`remove` commands, GitHub Actions CI

---

### Step 5: Premium Scan (Tier 2)

**Priority:** Medium-High — paid upgrade, revenue generating
**Status:** Detailed plan exists (3 docs), not started
**Source:** `premium-scan/` folder (architecture, 121-checkpoint checklist, response schema)
**Depends on:** Step 1 (free scan working — already done)

Paid, end-user triggered via paywall. Webhook-triggered external browser agents (2 simultaneous from day 1: local headless + VPS Playwright). 5-phase journey (A-J). Test card for checkout decline. Phase-by-phase reporting.

**Sub-tasks:**
- Paywall / payment integration
- Webhook trigger system
- External agent hosting (local headless + VPS)
- 121-checkpoint inspection engine
- Multi-agent consensus scoring
- Premium results page UI
- `skill.json` enrichment from premium scan data

---

### Step 6: UCP Taxonomy Implementation

**Priority:** Medium — prerequisite for Tier 3 and category pages
**Status:** Schema designed, not implemented in code
**Source:** `Shopy/2-merchant-taxonomy-schema-note.md`, `Shopy/3. product-index-taxonomy-plan.md`, `Shopy/skill-json-schema.md`

- Create `ucp_categories` table (import Google Product Taxonomy — 5,595 categories)
- Create `brand_categories` junction table
- Migrate existing freeform `sub_sectors` to GPT ID mappings
- Agent scan auto-detects UCP categories during scoring
- Category-based navigation and filtering
- **Category Landing Pages** (moved from Step 1 — depends on UCP tables): Build `/c/[sector]/[category-slug]` pages driven by GPT IDs. Requires `ucp_categories` and `brand_categories` tables to exist. Old plan (`completed/remaining-build-tasks.md` Task 3) used freeform `sub_sectors` — needs full rewrite for UCP model.

---

### Step 7: Tier 3 Product Index

**Priority:** Future — no detailed build plan yet
**Status:** Vision only
**Source:** `agent-readiness-and-product-index-service.md` (Tier 3 section)

Full product catalog crawl, LLM-powered enrichment, Google Product Taxonomy mapping per product, distribution to Shopify Catalog MCP and Google UCP, vector search layer, CreditClaw Agent Gateway.

---

## Scale-Triggered Optimizations (not active — revisit when thresholds are hit)

These are valid ideas but premature at current scale (14 seeded brands, ~30 total public URLs). They should be reconsidered when the catalog grows.

| Optimization | Trigger | What to do | Source |
|---|---|---|---|
| `generateStaticParams` for `/skills/[vendor]` | 100+ verified/official brands | Pre-render high-traffic brand pages at build time | `completed/remaining-build-tasks.md` Task 2 |
| Sitemap splitting | 1,000+ URLs | Use `generateSitemaps()` to split by content type or sector | `completed/remaining-build-tasks.md` Task 4 |
| Remove `brandData` from `LITE_COLUMNS` | 200+ brands or measurable catalog slowness | Promote `feedbackStats.successRate` to a top-level column, then drop `brandData` from lite query. Both `vendor-card.tsx` and `catalog-client.tsx` currently access `brandData.feedbackStats.successRate` so it's not a one-line fix — requires migration + aggregation job update | `completed/remaining-build-tasks.md` Task 5 |

## Other Future Items (no build plans)

| Item | Source | Notes |
|---|---|---|
| Commission-based revenue (Stripe auth during onboarding) | `charge-fee.md` | Capture Stripe authorization when card is onboarded, charge 0.05% per sale |
| Double encryption for sub-agent keys | `260309-Double-security-Sub-agent-temp-encrypt.md` | Ephemeral sub-agent secret for decryption key access |
| x402 checkout integration | `x402-checkout-plan_1772644619315.docx` | Payment protocol for agent-initiated purchases |

---

## Dependency Map

```
Step 1 (Shareable Catalog URLs) ←── independent, can start now

Step 2 (Multitenant) ←── independent, can start now
  ↓
Step 3 (shopy.sh Pages) ←── depends on Step 2
  ↓
Step 4 (Registry API + CLI) ←── depends on Step 3

Step 5 (Premium Scan) ←── independent of Steps 2-4, can start now

Step 6 (UCP Taxonomy + Category Pages) ←── independent, can start now
  ↓
Step 7 (Tier 3 Product Index) ←── depends on Step 6
```

Steps 1, 2, 5, and 6 can all run in parallel.
Category landing pages are under Step 6 (depends on UCP tables).
Scale-triggered optimizations (staticParams, sitemap split, JSONB lite) are parked until thresholds are hit.
