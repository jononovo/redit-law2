# CreditClaw — Active Build Backlog

Everything that's outstanding, in build sequence order. Each item has a priority, status, dependencies, and reference to its source plan (if one exists).

Last updated: 2026-04-02

---

## Scale Context

The ASX Score Scanner and brand catalog are the primary growth engines. **Expect tens of thousands of scans and listed domains within the next few weeks.** Every scan upserts a row into `brand_index`, so the catalog will grow rapidly from the current 14 seeded brands to thousands, then tens of thousands. All build decisions should account for this scale — pagination, query performance, sitemap size, pre-rendering, and JSONB payload weight all matter at 10K+ rows.

---

## Architecture Note: `skill.json` and Data Flow

`skill.json` is a **machine-readable metadata format** served alongside SKILL.md for each merchant. It is *derived from* `brand_index` database columns — the database is the source of truth, not the file. The `skill.json` serializer reads flat columns and JSONB data from `brand_index` and assembles the structured output. Some `skill.json` fields (returns, platform, apiTier, loyalty enrichment, UCP categories) require new `brand_index` columns or related tables that don't exist yet — these will be added incrementally as the scan and taxonomy systems evolve.

**Schema spec:** `docs/build context/Future/Product_index/Shopy/skill-json-schema.md`

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
- Step 1: Catalog Scale Readiness (1A URL-based filters, 1B generateStaticParams, 1C lean catalog query)
- GIN indexes + partial boolean indexes on `brand_index` (migration 0007 — `sub_sectors`, `tags`, `carries_brands`, `capabilities`, `checkout_methods`, `payment_methods_accepted`, `supported_countries`, `search_vector` GIN; `has_mcp`, `has_api`, `has_deals`, `ordering=guest`, `tax_exempt`, `po_number`, `claimed_by` partial; plus `search_vector` trigger)
- Step 2: Multitenant System (2A types+configs, 2B middleware, 2C layout metadata/theming, 2D TenantProvider, 2E nav/footer de-hardcode, 2F landing extraction, 2G API helper, 2H signupTenant column, 2I shopy config skeleton)
- Step 3: shopy.sh Pages (landing, how-it-works, ASX scanner, skills catalog, AXS explainer, docs, tenant config, middleware routing)

---

## Build Sequence

### Step 2: Multitenant System

**Priority:** High — prerequisite for all shopy.sh work
**Status:** Plan complete (727 lines), not started
**Source:** `Shopy/1-multitenant-system-nextjs-implementation-plan.md`

Middleware-based tenant resolution from domain. Static tenant configs in `public/tenants/`. Per-tenant `generateMetadata()`, HSL theme injection, route-level separation, Firebase Auth scoping.

One codebase serves both creditclaw.com and shopy.sh.

---

### Step 3: shopy.sh Pages ✅

**Priority:** High (after multitenant)
**Status:** Complete
**Source:** `Shopy/shopy-sh-brand-identity.md`, `Future/step-3-remaining-shopy-pages-plan.md`
**Depends on:** Step 2

- [x] `/` — shopy.sh landing page (`components/tenants/shopy/landing.tsx`, registered in `app/page.tsx`)
- [x] `/how-it-works` — tenant-aware with full redesign (`components/tenants/shopy/how-it-works.tsx`)
- [x] `/agentic-shopping-score` — ASX Score Scanner (shared, works for all tenants)
- [x] `/skills` — brand catalog (shared, works for all tenants)
- [x] `/axs` — AXS Rating explainer page (`app/axs/page.tsx`)
- [x] `/docs` — documentation pages (shared)
- [x] Tenant config — nav, footer, theme, feature flags
- [x] Middleware routing — shopy.sh domain registered

---

### Step 4: Registry API + shopy CLI + Master Skill

**Priority:** Medium (after shopy.sh pages)
**Status:** Plan complete (3 phases), not started
**Source:** `Shopy/shopy-cli-technical-plan.md`
**Depends on:** Step 3

- Phase 1: Public registry API (`/api/v1/registry/`) — search, download, version manifests
  - Includes `GET /api/v1/registry/{vendor}/skill.json` — serializes `brand_index` data into the `skill.json` format
- Phase 2: npm package — `npx shopy add amazon`, config management, local manifests
- Phase 3: `update`, `init`/`remove` commands, GitHub Actions CI
- **Master Skill (PROCUREMENT.md):** A meta-document (stored as a special `brand_index` row with slug `_creditclaw_index` or served from a dedicated endpoint) that teaches agents how to use the search/registry API — available parameters, how to combine filters, how maturity levels work, how brand relationships work (searching for "Nike" returns Nike HQ + retailers carrying Nike), example queries for common scenarios, and how to read the SKILL.md once a brand is selected. Ships alongside the registry API since it only makes sense once agents have a programmatic way to query the index.

**Source for master skill concept:** `brand-index-implementation-plan-v3.md` (Phase 4)

---

### Step 4B: Brand Versioning

**Priority:** Medium — needed before re-scan workflows and registry version API
**Status:** Technical plan complete, not started
**Source:** `Future/brand-versioning-technical-plan.md`
**Depends on:** None (can be built independently, but should land before Step 5)

Two new tables: `brand_versions` (append-only score history + brand_index snapshot per scan) and `brand_version_files` (arbitrary file tree per version — SKILL.md, skill.json, future files/folders). Enables score trending, regression detection, rollback, diff views, and versioned package downloads via the registry API. Designed to separate hot-path score queries from cold-path file content.

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

### Step 6: Google Product Taxonomy Implementation

**Priority:** Medium — prerequisite for Tier 3 and category pages
**Status:** Research complete, ready to build
**Source:** `Shopy/2-merchant-taxonomy-schema-note.md`, `Shopy/3. product-index-taxonomy-plan.md`, `Shopy/progressive-disclosure-taxonomy-research.md`

**Key decisions (from April 3, 2026 session):**
- **Replace custom sectors with Google's 21 root categories.** Our 21 custom sectors (retail, fashion, electronics, etc.) are nearly 1:1 with Google's 21 root categories. Instead of maintaining a custom list + mapping layer, use Google's roots directly as the top-level routing. This eliminates the `VendorSector` type, `SECTOR_LABELS`, `VALID_SECTORS`, and the sector→Google root mapping.
- **Rename "UCP Categories" to "Product Categories."** Google's Universal Commerce Protocol (UCP) is a separate transaction protocol — our internal "UCP" naming causes confusion. Tables/fields use `product_categories` and `brand_categories`.
- **Simplified skill.json format.** Instead of verbose objects with `gptId`, `name`, `path`, `depth`, `primary`, use Google's own format: `"productCategories": ["141 - Cameras & Optics", "223 - Electronics > Audio"]`. One array of self-describing strings matching the canonical taxonomy file format.
- **No backward compatibility / no backfill.** Old brands keep their freeform `sub_sectors` until rescanned. New scans get proper Google taxonomy IDs. No migration of existing data.
- **Sector-scoped category selection during scan.** When Perplexity classifies a brand into a root category (e.g., Electronics), the category matching step only considers L2-L3 categories under that root (~50-150 instead of 5,600).

**Build scope:**
- Create `product_categories` table (import Google Product Taxonomy — 5,595 categories with `gpt_id`, `name`, `slug`, `parent_id`, `depth`, `path`)
- Create `brand_categories` junction table (brand_id → category_id, `is_primary` flag)
- Replace `VendorSector` type system + `SECTOR_LABELS` + `VALID_SECTORS` with Google root categories (touches 14 code files)
- Update Perplexity classifier to constrain sector to Google root names
- Wire category selection into scan pipeline (new scans get `brand_categories` rows)
- Update `skill.json` serializer to output `productCategories` array
- Update catalog UI, sector landing pages (`/c/[sector]`), sitemap, vendor cards
- Update `skill-json-schema.md` to reflect simplified format
- **Category Landing Pages**: Build `/c/[root]/[category-slug]` pages driven by Google taxonomy IDs

---

### Step 7: Tier 3 Product Index

**Priority:** Future — no detailed build plan yet
**Status:** Vision only
**Source:** `agent-readiness-and-product-index-service.md` (Tier 3 section)

Full product catalog crawl, LLM-powered enrichment, Google Product Taxonomy mapping per product, distribution to Shopify Catalog MCP and Google UCP, vector search layer, CreditClaw Agent Gateway.

---

## Scale-Triggered Optimizations (not active — revisit when thresholds are hit)

| Optimization | Trigger | What to do | Source |
|---|---|---|---|
| Sitemap splitting | 1,000+ URLs | Use `generateSitemaps()` to split by content type or sector | `completed/remaining-build-tasks.md` Task 4 |

## Other Future Items (no build plans)

| Item | Source | Notes |
|---|---|---|
| Commission-based revenue (Stripe auth during onboarding) | `charge-fee.md` | Capture Stripe authorization when card is onboarded, charge 0.05% per sale |
| Double encryption for sub-agent keys | `260309-Double-security-Sub-agent-temp-encrypt.md` | Ephemeral sub-agent secret for decryption key access |
| x402 checkout integration | `x402-checkout-plan_1772644619315.docx` | Payment protocol for agent-initiated purchases |

---

## Dependency Map

```
Step 2 (Multitenant) ←── independent, can start now
  ↓
Step 3 (shopy.sh Pages) ←── depends on Step 2
  ↓
Step 4 (Registry API + CLI + Master Skill) ←── depends on Step 3

Step 4B (Brand Versioning) ←── independent, should land before Step 5
  ↑ feeds into Step 4 (version manifests) and Step 5 (premium vs free comparison)

Step 5 (Premium Scan) ←── independent of Steps 2-4, can start now

Step 6 (UCP Taxonomy + Category Pages) ←── independent, can start now
  ↓
Step 7 (Tier 3 Product Index) ←── depends on Step 6
```

Steps 2, 4B, 5, and 6 can all run in parallel.
Category landing pages are under Step 6 (depends on UCP tables).
Master Skill ships with Step 4 (registry API).
Brand Versioning (4B) should ideally land before Step 5 (premium scan comparison needs version history).
Sitemap splitting is parked until 1,000+ URLs.
