# Product Index — Document Overview & Build Sequence

This folder contains the planning documents for CreditClaw's agentic commerce standards and the products/services that deliver them. Here's what each file does and the order things should be built.

---

## Documents

### Reference, Strategy & Brand Identity (not build plans)

| Document | Purpose |
|---|---|
| `agentic-commerce-standard.md` | **The standard itself.** Vendor-neutral definition of two proposed open standards: (1) the Agentic Procurement Metadata Standard (SKILL.md frontmatter format for commerce), and (2) the ASX Score & AXS Rating measurement framework. Anyone can read this without knowing CreditClaw. This is the canonical source for metadata field definitions, scoring pillars, signal weights, feedback dimensions, and the aggregation algorithm. |
| `creditclaw-agentic-commerce-strategy.md` | **Go-to-market strategy.** How CreditClaw commercializes the standards through creditclaw.com and shopy.sh. Covers: what pages and services we offer, the three service tiers (free scan → premium scan → full product index), revenue model, competitive positioning, and how shopy.sh connects to CreditClaw. |
| `shopy-sh-brand-identity.md` | **shopy.sh brand definition.** Defines shopy.sh as the open standard for agentic commerce. Primary audience: merchant dev teams, CTOs, e-commerce/marketing professionals who need their stores discoverable by AI agents. Secondary: agent developers using the CLI/catalog. Covers: brand voice, dual-track UX (technical surface with non-technical on-ramps), `/standard` page (authoritative spec — creditclaw.com links here), `/guide` page (plain-language explainer for non-developers), CLI experience, website structure, comparison with creditclaw.com, the flywheel, multitenant implementation notes, and open questions. |

### Build Plans (ready to execute)

| Document | Purpose |
|---|---|
| `agentic-shopping-score-build-plan.md` | **Tier 1 scanner build plan.** Complete, sequenced, 6-phase plan for building the `/agentic-shopping-score` page and its backend. Phases: (1) `scan_history` DB table, (2) ASX Score calculation engine, (3) scan API endpoint, (4) scanner landing page, (5) results page, (6) polish & SEO. Each phase lists exact files to create/modify, schemas, types, and constraints. References `agentic-commerce-standard.md` for score definitions. |
| `scan-page-ux-design.md` | **UX companion to the scanner build plan.** Wireframes and layout specs for the scanner landing page and results page (phases 4-5 of the build plan above). Includes: page layouts, URL structure, responsive behavior, loading states, component breakdown, and SEO meta tag templates. |
| `multitenant-system-nextjs-implementation-plan.md` | **Multitenant infrastructure plan.** Complete implementation plan for serving multiple brands (creditclaw.com and shopy.sh) from a single Next.js deployment. Covers: middleware-based tenant resolution from domain, static tenant configs (`public/tenants/`), `generateMetadata()` per tenant, HSL theme injection, route-level separation, Firebase Auth scoping, and testing strategy. 727 lines, highly detailed. |
| `remaining-build-tasks.md` | **Catalog & SEO polish tasks.** Five outstanding tasks from previously completed phases: (1) URL-based filter state on `/skills`, (2) `generateStaticParams` for brand detail pages, (3) sub-sector landing pages, (4) sitemap splitting, (5) JSONB extraction for performance. Each task includes priority, implementation details, files to modify, and dependencies. |

### Vision Documents (future — no detailed build plans yet)

| Document | Purpose |
|---|---|
| `agent-readiness-and-product-index-service.md` | **Full three-tier service vision.** Describes all three service tiers in detail. The Tier 1 section overlaps with `agentic-shopping-score-build-plan.md` (the build plan is the detailed implementation of Tier 1). **Tiers 2 and 3 are described here only** — no separate build plans exist for them yet. Tier 2: Playwright-based deep scan with CSS selectors, form field mappings, screenshot capture. Tier 3: full product catalog crawl, LLM-powered enrichment (agent summaries + purchase intent phrases), Google Product Taxonomy mapping, distribution to Shopify Catalog MCP and Google UCP, vector search layer, and the CreditClaw Agent Gateway. |
| `product-index-taxonomy-plan.md` | **Google Product Taxonomy adoption plan.** Covers which taxonomy standard to use (GPT, ~5,600 categories), how it maps to CreditClaw's existing sectors, and the product index schema. This is a prerequisite for Tier 3's catalog enrichment and distribution pipeline. |

---

## Recommended Build Sequence

### Step 1: ASX Score Scanner (Tier 1) ← NEXT TO BUILD
**Plan:** `agentic-shopping-score-build-plan.md` (6 phases, complete)
**UX:** `scan-page-ux-design.md`
**Defs:** `agentic-commerce-standard.md`

This is the lead gen tool, SEO magnet, and first public product. A merchant enters their domain, gets a 0-100 score with actionable breakdown. This drives awareness and gives CreditClaw something to sell against.

Internal dependency chain:
Phase 1 (DB) → Phase 2 (Score Engine) → Phase 3 (API) → Phase 4 (Scanner Page) + Phase 5 (Results Page) → Phase 6 (Polish)

### Step 2: Multitenant System ← BUILD AFTER SCANNER
**Plan:** `multitenant-system-nextjs-implementation-plan.md` (complete, 727 lines)
**Brand:** `shopy-sh-brand-identity.md`

This is the infrastructure that lets one codebase serve both creditclaw.com and shopy.sh. Middleware resolves the domain, loads the tenant config, and the app renders different branding, navigation, landing pages, metadata, and feature visibility per tenant. Build this before creating any shopy.sh-specific pages — once the multitenant layer is in place, shopy.sh pages are just new routes with tenant-aware rendering.

Key pieces:
- Middleware tenant resolution (domain → tenant ID via request header + cookie)
- Tenant config files (`public/tenants/creditclaw/config.json`, `public/tenants/shopy/config.json`)
- Root layout reads tenant config, injects theme colors, sets metadata
- Route-level separation for brand-specific pages

### Step 3: shopy.sh Pages ← BUILD AFTER MULTITENANT
**Brand:** `shopy-sh-brand-identity.md` (website structure table)

With the multitenant layer in place, build the shopy.sh-specific pages. These only render when the tenant is `shopy`:
- `/` — shopy.sh landing page (what it is, why it matters, quick start)
- `/standard` — the authoritative agentic commerce standard (creditclaw.com links here)
- `/guide` — non-technical explainer with diagrams for brand owners and marketing teams
- `/catalog` — same data as creditclaw.com's `/skills` but with developer-focused framing (install commands, spec fields)
- `/leaderboard` — top vendors by ASX Score and AXS Rating

The catalog and leaderboard pull from the same `brand_index` table — just different presentation components per tenant.

### Step 4: Catalog SEO Polish ← IN PARALLEL WITH STEPS 2-3 OR AFTER
**Plan:** `remaining-build-tasks.md` (5 tasks)

URL filter state, `generateStaticParams` for brand detail pages, sub-sector landing pages, sitemap splitting, JSONB extraction. Improves the existing catalog but not urgent at current scale (~14 brands). These are independent of the multitenant work and can be done in parallel or after.

### Step 5: Tier 2 Premium Scan ← FUTURE (no build plan yet)
**Vision:** `agent-readiness-and-product-index-service.md` (Tier 2 section)

Playwright browser automation, full shopping flow walk-through, CSS selectors, form field mappings, screenshot capture. A detailed build plan needs to be written before starting. This is the premium upsell from the free Tier 1 scan — "we scanned your site from the outside, now let us walk through it like an agent would."

### Step 6: Taxonomy + Tier 3 Product Index ← FUTURE (no build plan yet)
**Vision:** `product-index-taxonomy-plan.md` + `agent-readiness-and-product-index-service.md` (Tier 3 section)

Full product catalog crawl, LLM-powered enrichment (agent summaries + purchase intent phrases), Google Product Taxonomy mapping, distribution to Shopify Catalog MCP and Google UCP, vector search layer, and the CreditClaw Agent Gateway. This is the big long-term vision. Build plans need to be written before starting.

### Dependency Map

```
Step 1 (Scanner)
  ↓
Step 2 (Multitenant) ──── Step 4 (SEO Polish) [independent, parallel OK]
  ↓
Step 3 (shopy.sh Pages)
  ↓
Step 5 (Tier 2 Scan) [future, needs build plan]
  ↓
Step 6 (Tier 3 Product Index) [future, needs build plan]
```

---

## Key Constraints (for any agent working on these)

- **DO NOT modify** `lib/procurement-skills/builder/analyze.ts` or `lib/procurement-skills/builder/llm.ts` — existing callers depend on their current behavior and output shape.
- **DO NOT overwrite** `brand_index.agentReadiness` — this column is auto-computed by `computeReadinessScore()` on every upsert. The ASX Score is a separate system stored in `scan_history`.
- **DO NOT auto-create** `brand_index` entries from scans — scans save to `scan_history` only. The brand index is the curated catalog.
- **Score engine location**: `lib/agentic-score/` (new directory), NOT inside `lib/procurement-skills/builder/`.
- **Feedback loop is already built**: `brand_feedback` table, API endpoint, storage methods, aggregation job, SKILL.md generator integration, and rating display on catalog pages are all implemented.
- **Sector pages already exist** at `app/c/[sector]/` — sub-sector pages (`app/c/[sector]/[subSector]/`) do not exist yet.
