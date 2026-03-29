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
| `agentic-shopping-score-build-plan.md` | **Tier 1 scanner build plan — the first thing to build.** Complete, sequenced, 6-phase plan for building the `/agentic-shopping-score` page and its backend. Phases: (1) `scan_history` DB table, (2) ASX Score calculation engine, (3) scan API endpoint, (4) scanner landing page, (5) results page, (6) polish & SEO. Each phase lists exact files to create/modify, schemas, types, and constraints. References `agentic-commerce-standard.md` for score definitions. |
| `scan-page-ux-design.md` | **UX companion to the scanner build plan.** Wireframes and layout specs for the scanner landing page and results page (phases 4-5 of the build plan above). Includes: page layouts, URL structure, responsive behavior, loading states, component breakdown, and SEO meta tag templates. |
| `remaining-build-tasks.md` | **Catalog & SEO polish tasks.** Five outstanding tasks from previously completed phases: (1) URL-based filter state on `/skills`, (2) `generateStaticParams` for brand detail pages, (3) sub-sector landing pages, (4) sitemap splitting, (5) JSONB extraction for performance. Each task includes priority, implementation details, files to modify, and dependencies. These can be done in parallel with or after the scanner. |

### Vision Documents (future — no detailed build plans yet)

| Document | Purpose |
|---|---|
| `agent-readiness-and-product-index-service.md` | **Full three-tier service vision.** Describes all three service tiers in detail. The Tier 1 section overlaps with `agentic-shopping-score-build-plan.md` (the build plan is the detailed implementation of Tier 1). **Tiers 2 and 3 are described here only** — no separate build plans exist for them yet. Tier 2: Playwright-based deep scan with CSS selectors, form field mappings, screenshot capture. Tier 3: full product catalog crawl, LLM-powered enrichment (agent summaries + purchase intent phrases), Google Product Taxonomy mapping, distribution to Shopify Catalog MCP and Google UCP, vector search layer, and the CreditClaw Agent Gateway. |
| `product-index-taxonomy-plan.md` | **Google Product Taxonomy adoption plan.** Covers which taxonomy standard to use (GPT, ~5,600 categories), how it maps to CreditClaw's existing sectors, and the product index schema. This is a prerequisite for Tier 3's catalog enrichment and distribution pipeline. |

---

## Build Sequence

```
Step 1: ASX Score Scanner (Tier 1)          ← NEXT TO BUILD
  Plan:  agentic-shopping-score-build-plan.md (6 phases, complete)
  UX:    scan-page-ux-design.md
  Defs:  agentic-commerce-standard.md
  Notes: This is the lead gen tool, SEO magnet, and first public product.
         The build plan has a clear internal dependency chain:
         Phase 1 (DB) → Phase 2 (Score Engine) → Phase 3 (API)
           → Phase 4 (Scanner Page) + Phase 5 (Results Page) → Phase 6 (Polish)

Step 2: Catalog SEO Polish                  ← IN PARALLEL OR AFTER
  Plan:  remaining-build-tasks.md (5 tasks)
  Notes: URL filter state, generateStaticParams, sub-sector pages,
         sitemap splitting. Improves existing catalog but not urgent
         at current scale (~14 brands).

Step 3: Tier 2 Premium Scan                 ← FUTURE (no build plan yet)
  Vision: agent-readiness-and-product-index-service.md (Tier 2 section)
  Notes: Playwright browser automation, full shopping flow walk-through,
         CSS selectors, form field mappings. A detailed build plan needs
         to be written before starting.

Step 4: Taxonomy + Tier 3 Product Index     ← FUTURE (no build plan yet)
  Vision: product-index-taxonomy-plan.md
          + agent-readiness-and-product-index-service.md (Tier 3 section)
  Notes: Product crawl, LLM enrichment, vector search, Shopify/UCP
         distribution, agent gateway. The big long-term vision.
         Build plans need to be written before starting.
```

---

## Key Constraints (for any agent working on these)

- **DO NOT modify** `lib/procurement-skills/builder/analyze.ts` or `lib/procurement-skills/builder/llm.ts` — existing callers depend on their current behavior and output shape.
- **DO NOT overwrite** `brand_index.agentReadiness` — this column is auto-computed by `computeReadinessScore()` on every upsert. The ASX Score is a separate system stored in `scan_history`.
- **DO NOT auto-create** `brand_index` entries from scans — scans save to `scan_history` only. The brand index is the curated catalog.
- **Score engine location**: `lib/agentic-score/` (new directory), NOT inside `lib/procurement-skills/builder/`.
- **Feedback loop is already built**: `brand_feedback` table, API endpoint, storage methods, aggregation job, SKILL.md generator integration, and rating display on catalog pages are all implemented.
- **Sector pages already exist** at `app/c/[sector]/` — sub-sector pages (`app/c/[sector]/[subSector]/`) do not exist yet.
