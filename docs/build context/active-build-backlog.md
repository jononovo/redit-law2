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

### Step 1: Catalog SEO & Infrastructure Polish

These are independent of the shopy.sh work and can be done now.

#### 1A. URL-Based Filter State on `/skills`

**Priority:** Medium
**Status:** Not started
**Source:** `remaining-build-tasks.md` Task 1

The catalog page (`/skills`) ignores `searchParams` server-side. Filters are client-only via `catalog-client.tsx`, so crawlers see the unfiltered view and filtered URLs aren't shareable.

**What's needed:**
- `app/skills/page.tsx` reads `searchParams`, passes filters to `storage.searchBrands()` server-side
- `catalog-client.tsx` refactored to accept initial server data + use `router.replace()` for filter changes
- `generateMetadata()` reflects current filters
- Sector filters use `/c/[sector]` routes, NOT `?sector=` on `/skills`
- `/skills` handles: `?q=`, `?checkout=`, `?tier=`, `?capability=`, `?maturity=`

**Files:** `app/skills/page.tsx`, `app/skills/catalog-client.tsx`

---

#### 1B. `generateStaticParams` for Brand Detail Pages

**Priority:** Low
**Status:** Not started
**Source:** `remaining-build-tasks.md` Task 2

Add `generateStaticParams()` to `app/skills/[vendor]/page.tsx` for verified/official brands so they're pre-rendered at build time.

**Files:** `app/skills/[vendor]/page.tsx`

---

#### 1C. Category Landing Pages (replaces old "Sub-Sector Pages")

**Priority:** Low — wait until catalog has 50+ brands
**Status:** Needs re-planning (old plan used freeform `sub_sectors`, now replaced by UCP categories)
**Source:** `remaining-build-tasks.md` Task 3 (outdated — needs rewrite for UCP)

The old plan was `/c/[sector]/[subSector]` using freeform `sub_sectors` strings. Now that taxonomy uses the structured UCP `categories` array with GPT IDs, this needs a fresh approach:
- Category pages driven by GPT IDs, not freeform slugs
- Route structure TBD: could be `/c/[sector]/[category-slug]` with slug derived from GPT category name
- Storage methods need to query the `categories` JSONB structure, not `unnest(sub_sectors)`
- Only generate pages for categories with enough brands to be useful

**Depends on:** UCP categories being populated in `brand_index` for enough merchants

---

#### 1D. Sitemap Splitting

**Priority:** Low — wait until 1,000+ URLs
**Status:** Not started
**Source:** `remaining-build-tasks.md` Task 4
**Depends on:** 1C (so sitemaps include category page URLs from the start)

Replace single `sitemap()` in `app/sitemap.ts` with `generateSitemaps()` — one sitemap per sector.

**Files:** `app/sitemap.ts`

---

#### 1E. JSONB Extraction for Catalog Performance

**Priority:** Low — only matters at 1,000+ brands
**Status:** Not started
**Source:** `remaining-build-tasks.md` Task 5

Extract fields that catalog cards need (description, capabilities, checkout methods, tier) into top-level columns on `brand_index` so the catalog query doesn't need JSONB.

**Files:** `shared/schema.ts`, `server/storage/brand-index.ts`, migration

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

---

### Step 7: Tier 3 Product Index

**Priority:** Future — no detailed build plan yet
**Status:** Vision only
**Source:** `agent-readiness-and-product-index-service.md` (Tier 3 section)

Full product catalog crawl, LLM-powered enrichment, Google Product Taxonomy mapping per product, distribution to Shopify Catalog MCP and Google UCP, vector search layer, CreditClaw Agent Gateway.

---

## Other Future Items (no build plans)

| Item | Source | Notes |
|---|---|---|
| Commission-based revenue (Stripe auth during onboarding) | `charge-fee.md` | Capture Stripe authorization when card is onboarded, charge 0.05% per sale |
| Double encryption for sub-agent keys | `260309-Double-security-Sub-agent-temp-encrypt.md` | Ephemeral sub-agent secret for decryption key access |
| x402 checkout integration | `x402-checkout-plan_1772644619315.docx` | Payment protocol for agent-initiated purchases |

---

## Dependency Map

```
Step 1 (Catalog SEO Polish) ←── independent, can start now
  1A URL filters ─── no deps
  1B staticParams ── no deps
  1C category pages ── needs UCP data (Step 6)
  1D sitemap split ── depends on 1C
  1E JSONB extract ── no deps

Step 2 (Multitenant) ←── independent, can start now
  ↓
Step 3 (shopy.sh Pages) ←── depends on Step 2
  ↓
Step 4 (Registry API + CLI) ←── depends on Step 3

Step 5 (Premium Scan) ←── independent of Steps 2-4, can start now

Step 6 (UCP Taxonomy) ←── independent, can start now
  ↓
Step 7 (Tier 3 Product Index) ←── depends on Step 6
```

Steps 1A/1B/1E, 2, 5, and 6 can all run in parallel.
