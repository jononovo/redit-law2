# CreditClaw — Active Build Backlog

Everything that's outstanding, in build sequence order. Each item has a priority, status, dependencies, and reference to its source plan (if one exists).

Last updated: 2026-04-04

---

## Scale Context

The ASX Score Scanner and brand catalog are the primary growth engines. **Expect tens of thousands of scans and listed domains within the next few weeks.** Every scan upserts a row into `brand_index`, so the catalog will grow rapidly from the current 14 seeded brands to thousands, then tens of thousands. All build decisions should account for this scale — pagination, query performance, sitemap size, pre-rendering, and JSONB payload weight all matter at 10K+ rows.

---

## Architecture Note: `skill.json` and Data Flow

`skill.json` is a **machine-readable metadata format** served alongside SKILL.md for each merchant. It is *derived from* `brand_index` database columns — the database is the source of truth, not the file. The `skill.json` serializer reads flat columns and JSONB data from `brand_index` and assembles the structured output. Taxonomy data (product categories) is now sourced from `product_categories` + `brand_categories` tables and included in skill.json output. Some `skill.json` fields (returns, platform, loyalty enrichment) require new `brand_index` columns that don't exist yet — these will be added incrementally as the scan system evolves.

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
- Step 6: Google Product Taxonomy Implementation (see details below)

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

**Priority:** Medium-High (after shopy.sh pages) — **the brands.sh landing page already advertises `npx shopy add <brand>` with a rotating showcase of well-known brands (nike, gucci, apple, etc.). This command does not work yet — the npm package does not exist. Building this is needed to fulfill the promise shown to every visitor.**
**Status:** Plan complete (3 phases), not started
**Source:** `Shopy/shopy-cli-technical-plan.md`
**Depends on:** Step 3

- Phase 1: Public registry API (`/api/v1/registry/`) — search, download, version manifests
  - Includes `GET /api/v1/registry/{vendor}/skill.json` — serializes `brand_index` data into the `skill.json` format
- Phase 2: npm package — `npx shopy add amazon`, config management, local manifests
  - This is the minimum needed to make the landing page CTA truthful
  - Package name: `shopy` (needs to be claimed on npm)
  - Core flow: `npx shopy add nike` → hits registry API → downloads skill.json + SKILL.md → writes to `./skills/nike/`
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

### Step 6: Google Product Taxonomy Implementation ✅

**Priority:** Medium — prerequisite for Tier 3 and category pages
**Status:** Complete
**Source:** `Shopy/2-merchant-taxonomy-schema-note.md`, `Shopy/3. product-index-taxonomy-plan.md`, `Shopy/progressive-disclosure-taxonomy-research.md`

Completed in two sessions (April 3, 2026):

**Session 1 — Sector overhaul + schema + scan wiring:**
- [x] 27-entry hybrid sector system (21 Google Product Taxonomy roots + food-services, travel, education, events, luxury, specialty)
- [x] `product_categories` table seeded with 5,595 Google taxonomy entries
- [x] `brand_categories` junction table with unique constraint on (brand_id, category_id)
- [x] All UI, vendor files, scan fallbacks, sitemap updated for new sector slugs
- [x] `/c/luxury` built as tier-driven filter (queries `ultra_luxury` + `luxury` tiers)
- [x] Perplexity classifier constrained to 26 assignable sectors (luxury excluded)
- [x] `skill.json` outputs `taxonomy.productCategories` (strings) + `taxonomy.categories` (objects)

**Session 2 — Schema simplification + Perplexity category classifier:**
- [x] Eliminated `gptId` duplication — `product_categories.id` IS the taxonomy ID directly (no mapping layer)
- [x] Added 43 custom categories for 5 non-Google sectors (IDs 100001+): food-services, travel, education, events, luxury, specialty
- [x] `SECTOR_ROOT_IDS` maps all 27 sectors to root category IDs
- [x] Replaced fuzzy string-matching resolver with Perplexity second-pass call — sends compact L2 category menu (2-25 entries per sector), gets structured IDs back
- [x] Dramatic quality improvement (e.g. Grainger: "Dental Tools" → Manufacturing, Heavy Machinery, Work Safety, Industrial Storage, Material Handling, Automation Control, Janitorial)
- [x] Total: 5,638 product categories (5,595 Google + 43 custom)

---

### Step 6B: Merchant Index (Stages 1-2) ✅

**Priority:** High — prerequisite for product search
**Status:** Core pipeline built
**Source:** `docs/internal/brands-sh-merchant-index-plan.md`
**Depends on:** Step 6

Completed:
- [x] `category_keywords` table with GIN-indexed tsvector, unique constraint on category_id
- [x] Keyword generation batch script (`scripts/generate-category-keywords.ts`) — resumable, 15 per batch via Perplexity, atomic transactions, proper English stemming
- [x] ~1,051 of 5,638 categories populated with LLM-generated keywords
- [x] `POST /api/v1/recommend` — structured queries with category_ids or text terms, Zod validation, tier/brand filtering
- [x] `GET /api/v1/recommend?q=...` — natural language intake via Perplexity Sonar → FTS → recursive CTE merchant ranking
- [x] Recursive ancestor CTE with UNION dedup and depth guard
- [x] Brand match boost (mentioned brand sorts to top)

Outstanding:
- [ ] Finish keyword population (run script more times — background task, not a code change)
- [ ] Grow merchant count via scan queue (19 merchants currently)
- [ ] Phase 2: Skills distribution (front matter discussion needed, master SKILL.md, brands-sh/shop GitHub repo)

---

### Step 7: Product Search (Stage 3) ✅ (core pipeline)

**Priority:** High — next major build
**Status:** Core pipeline built, scaling ongoing
**Source:** `docs/internal/brands-sh-product-search-plan.md`
**Depends on:** Step 6B

Product-level search using pgvector in Postgres. `product_listings` table with all-MiniLM-L6-v2 embeddings (384-dim). Brands-first ingestion via Shopify `products.json`. Products nested in `/api/v1/recommend` response.

Completed:
- [x] Schema + pgvector setup (`product_listings` table, `VECTOR(384)`, IVFFlat index)
- [x] Embedding infrastructure (`@xenova/transformers`, `lib/embeddings/embed.ts`)
- [x] Shopify ingestion script (`scripts/ingest-shopify-products.ts`)
- [x] Wire products into recommend API (POST + GET, `attachProducts()`, `_brand_id` stripped)
- [x] 7 merchants ingested: Glossier (123), Allbirds (937), Everlane (2,500), Chubbies (1,746), Outdoor Voices (367), Brooklinen (305), Casper (203) = **6,181 products total**
- [x] Vector search verified: cosine similarity, top 3 per merchant, cross-merchant results

Outstanding:
- [ ] Google Shopping XML feed parser (Step 5 of plan)
- [ ] Sitemap/crawl-based ingestion fallback
- [ ] Refresh scheduler (weekly re-ingest)
- [ ] More Shopify merchants (Mejuri had network issues, retry later)
- [ ] AI enrichment layer (optional, only if recall < 80%)

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

### Merchant Index — Future Enhancements

These are not blocking for the initial build. Add when warranted.

| Item | Source | Notes |
|---|---|---|
| AI re-ranking of top 10 merchant results | `brands-sh-merchant-index-plan.md` | After SQL returns top 10, optionally pass them through a fast LLM to re-rank or surface a different top 3 based on richer context (intent, brand affinity, etc.). SQL always does the initial filtering and ranking — this is a quality layer on top, not a replacement. |
| Limit keyword generation to populated categories | `brands-sh-merchant-index-plan.md` | Currently generating keywords for all ~5,600 categories. Once merchant coverage is deeper, consider only generating for categories that have at least one tagged merchant. Reduces noise in FTS results and speeds up the quarterly refresh. Low priority — the $3 cost and 30-minute runtime are fine for now. |

---

## Dependency Map

```
Step 2 (Multitenant) ←── ✅ COMPLETE
  ↓
Step 3 (shopy.sh Pages) ←── ✅ COMPLETE
  ↓
Step 4 (Registry API + CLI + Master Skill) ←── depends on Step 3

Step 4B (Brand Versioning) ←── independent, should land before Step 5
  ↑ feeds into Step 4 (version manifests) and Step 5 (premium vs free comparison)

Step 5 (Premium Scan) ←── independent of Steps 2-4, can start now

Step 6 (Google Product Taxonomy) ←── ✅ COMPLETE
  ↓
Step 6B (Merchant Index, Stages 1-2) ←── ✅ CORE PIPELINE BUILT (keyword pop + merchant count ongoing)
  ↓
Step 7 (Product Search, Stage 3) ←── depends on Step 6B (now unblocked)
```

Step 6B core pipeline is built — recommend API works end-to-end. Outstanding: keyword coverage (background task) and merchant count (scan queue).
Step 7 (Product Search) core pipeline is built — 6,181 products across 7 Shopify merchants, vector search in recommend API. Outstanding: more feed types, refresh scheduler.
Step 4 (Registry/CLI) is the next major build.
Brand Versioning (4B) should ideally land before Step 5 (premium scan comparison needs version history).
Sitemap splitting is parked until 1,000+ URLs.
