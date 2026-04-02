# Product Index — Document Overview & Build Sequence

This folder contains the planning documents for CreditClaw's agentic commerce standards and the products/services that deliver them. Here's what each file does and the order things should be built.

---

## Documents

### Reference, Strategy & Brand Identity (not build plans)

| Document | Purpose |
|---|---|
| `agentic-commerce-standard.md` | **The standard itself.** Vendor-neutral definition of two proposed open standards: (1) the Agentic Procurement Metadata Standard (SKILL.md frontmatter format for commerce), and (2) the ASX Score & AXS Rating measurement framework. Anyone can read this without knowing CreditClaw. This is the canonical source for metadata field definitions, scoring pillars, signal weights, feedback dimensions, and the aggregation algorithm. |
| `creditclaw-agentic-commerce-strategy.md` | **Go-to-market strategy.** How CreditClaw commercializes the standards through creditclaw.com and shopy.sh. Covers: what pages and services we offer, the three service tiers (free scan → premium scan → full product index), revenue model, competitive positioning, and how shopy.sh connects to CreditClaw. |

### Completed Build Plans (moved to `completed/`)

These plans have been fully implemented and are archived for reference:

| Document | Status |
|---|---|
| `completed/agentic-shopping-score-build-plan.md` | **DONE.** Tier 1 scanner — all 6 phases complete. Scanner page, results page, score engine, scan API all live. |
| `completed/phase-3-scan-api-technical-plan.md` | **DONE.** Firecrawl integration, Claude-powered classification, SKILL.md generation — all implemented. |
| `completed/phase-4-multipage-scan-plan.md` | **DONE.** Agentic multi-page scan — `agent-scan.ts` with 4 tools, rubric-based scoring pipeline, legacy `enhance.ts`/`llm.ts` deleted. Rubric v1.1.0 live (11 signals, 3 pillars: Clarity 35 + Discoverability 30 + Reliability 35 = 100). |
| `completed/scan-page-ux-design.md` | **DONE.** UX wireframes for scanner landing page and results page — both built and live. |

### Build Plans (ready to execute)

| Document | Purpose |
|---|---|
| `multitenant-system-nextjs-implementation-plan.md` | **Multitenant infrastructure plan.** Complete implementation plan for serving multiple brands (creditclaw.com and shopy.sh) from a single Next.js deployment. Covers: middleware-based tenant resolution from domain, static tenant configs (`public/tenants/`), `generateMetadata()` per tenant, HSL theme injection, route-level separation, Firebase Auth scoping, and testing strategy. 727 lines, highly detailed. |
| `shopy-cli-technical-plan.md` | **shopy CLI + registry API plan.** Technical plan for building the `npx shopy add amazon` CLI tool. Covers the three most complex pieces: (1) public registry API (`/api/v1/registry/`) — unauthenticated endpoints for search, download, and version manifests built on top of existing `brand_index` data, (2) the npm package itself — CLI architecture, config management, local manifest tracking, command implementations, (3) npm publishing — name registration, CI automation, versioning strategy, and whether to use a separate repo (recommended) or monorepo. |
| `completed/remaining-build-tasks.md` | **ARCHIVED.** Catalog & SEO polish tasks — absorbed into `docs/build context/active-build-backlog.md`. |

### Vision Documents (future — no detailed build plans yet)

| Document | Purpose |
|---|---|
| `agent-readiness-and-product-index-service.md` | **Full three-tier service vision.** Describes all three service tiers in detail. Tier 1 is now complete (see `completed/` folder). **Tiers 2 and 3 are described here only** — no separate build plans exist for them yet. Tier 2: Playwright-based deep scan with CSS selectors, form field mappings, screenshot capture. Tier 3: full product catalog crawl, LLM-powered enrichment, Google Product Taxonomy mapping, distribution to Shopify Catalog MCP and Google UCP, vector search layer, and the CreditClaw Agent Gateway. |
| `product-index-taxonomy-plan.md` | **Google Product Taxonomy adoption plan.** Covers which taxonomy standard to use (GPT, ~5,600 categories), how it maps to CreditClaw's existing sectors, and the product index schema. This is a prerequisite for Tier 3's catalog enrichment and distribution pipeline. |
| `merchant-taxonomy-schema-note.md` | Merchant taxonomy schema notes. |

### Premium Scan (separate folder: `../premium-scan/`)

Detailed planning for the premium browser-agent scan — a paid upgrade where real browser agents complete a full shopping journey (search → checkout) and score each step.

| Document | Purpose |
|---|---|
| `../premium-scan/260402-premium-merchant-scan.md` | **Architecture & plan.** Webhook-triggered external agents, 10-step journey (A-J), multi-agent consensus scoring, user flow, build phases. |
| `../premium-scan/260402-premium-scan-agent-checklist.md` | **Agent inspection checklist.** 121 checkpoints across 5 phases — the step-by-step instructions the browser agents follow during a scan. |
| `../premium-scan/260402-premium-scan-response-schema.md` | **Response schema.** Trigger payload, per-phase submissions, checkpoint format, step discoveries, final report, multi-agent comparison, error handling. |

---

## Recommended Build Sequence

### Step 1: ASX Score Scanner (Tier 1) ✅ COMPLETE
**Plans:** `completed/agentic-shopping-score-build-plan.md`, `completed/phase-3-scan-api-technical-plan.md`, `completed/phase-4-multipage-scan-plan.md`

Live at `/agentic-shopping-score`. Rubric v1.1.0 with 11 signals, 3 pillars (Clarity, Discoverability, Reliability), 100-point scale. Agentic multi-page scan with Claude tool use. Evidence citations. SKILL.md generation. SSRF-hardened fetch pipeline.

### Step 2: Multitenant System ← NEXT
**Plan:** `multitenant-system-nextjs-implementation-plan.md` (complete, 727 lines)

This is the infrastructure that lets one codebase serve both creditclaw.com and shopy.sh. Middleware resolves the domain, loads the tenant config, and the app renders different branding, navigation, landing pages, metadata, and feature visibility per tenant. Build this before creating any shopy.sh-specific pages.

### Step 3: shopy.sh Pages ← BUILD AFTER MULTITENANT

With the multitenant layer in place, build the shopy.sh-specific pages:
- `/` — shopy.sh landing page
- `/standard` — the authoritative agentic commerce standard
- `/guide` — non-technical explainer
- `/catalog` — developer-focused brand catalog
- `/leaderboard` — top vendors by ASX Score and AXS Rating

### Step 4: Registry API + shopy CLI ← BUILD AFTER SHOPY.SH PAGES
**Plan:** `shopy-cli-technical-plan.md` (3 phases, complete)

Registry API (main codebase) + npm package (separate repo).

### Step 5: Catalog SEO Polish ← IN PARALLEL WITH STEPS 2-4 OR AFTER
**Plan:** `remaining-build-tasks.md` (5 tasks)

URL filter state, `generateStaticParams`, sub-sector pages, sitemap splitting, JSONB extraction.

### Step 6: Premium Scan (Tier 2) ← FUTURE
**Plan:** `../premium-scan/` (3 docs, detailed)

Browser-controlled agents complete a full shopping journey. Webhook-triggered, externally hosted. Paid upgrade with paywall. Two agents from day one (local + VPS Playwright). 121-checkpoint inspection checklist. Detailed build plan now exists — ready to scope into implementation tasks.

### Step 7: Taxonomy + Tier 3 Product Index ← FUTURE (no build plan yet)
**Vision:** `product-index-taxonomy-plan.md` + `agent-readiness-and-product-index-service.md` (Tier 3 section)

Full product catalog crawl, LLM-powered enrichment, Google Product Taxonomy mapping, distribution, vector search, Agent Gateway.

### Dependency Map

```
Step 1 (Scanner) ✅ COMPLETE
  ↓
Step 2 (Multitenant) ──── Step 5 (SEO Polish) [independent, parallel OK]
  ↓
Step 3 (shopy.sh Pages)
  ↓
Step 4 (Registry API + CLI)
  ↓
Step 6 (Premium Scan) [plan exists, ready to scope]
  ↓
Step 7 (Tier 3 Product Index) [future, needs build plan]
```

---

## Key Constraints (for any agent working on these)

- **DO NOT modify** `lib/procurement-skills/builder/analyze.ts` or `lib/procurement-skills/builder/llm.ts` — existing callers depend on their current behavior and output shape.
- **DO NOT overwrite** `brand_index.agentReadiness` — this column is auto-computed by `computeReadinessScore()` on every upsert. The ASX Score is a separate system stored in `scan_history`.
- **DO NOT auto-create** `brand_index` entries from scans — scans save to `scan_history` only. The brand index is the curated catalog.
- **Score engine location**: `lib/agentic-score/` — NOT inside `lib/procurement-skills/builder/`.
- **Feedback loop is already built**: `brand_feedback` table, API endpoint, storage methods, aggregation job, SKILL.md generator integration, and rating display on catalog pages are all implemented.
- **Sector pages already exist** at `app/c/[sector]/` — sub-sector pages (`app/c/[sector]/[subSector]/`) do not exist yet.
- **Rubric v1.1.0 is live**: 61 criteria, 11 signals, 3 pillars (Clarity 35 + Discoverability 30 + Reliability 35 = 100). Do not modify rubric point totals without updating all frontend references.
