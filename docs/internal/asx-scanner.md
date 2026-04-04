# ASX Score Scanner — Internal Developer Guide

> Last updated: 2026-04-04

## Overview

The ASX (Agentic Shopping Experience) Score Scanner evaluates how "AI-ready" a retail website is. It combines a Perplexity-powered site audit (40+ signals) with a Perplexity-powered brand classification to produce a 0–100 score, per-signal breakdown, improvement recommendations, a generated SKILL.md file, and structured product category assignments.

The scanner is the primary growth engine — every scan creates or updates a `brand_index` row, so the catalog grows automatically.

For the full end-to-end pipeline including taxonomy and skill.json output, see `scan-taxonomy-skills-pipeline.md`.

---

## Architecture

```
User submits domain → POST /api/v1/scan
  ↓
  ├── Cache check: brand_index row < 30 days old? → return cached
  ↓
  ├── classifyBrand(domain) ──── Perplexity sonar (parallel)
  │     → name, sector, brandType, sectors[],
  │       tier, subCategories, capabilities, description
  │
  ├── auditSite(domain) ──────── Perplexity sonar (parallel)
  │     → 40+ boolean/string/numeric signals
  │
  ↓ (merge results)
  │
  computeScoreFromRubric() ── Rubric v1.1.0, 11 signals, 100 pts
  buildVendorSkillDraft()  ── VendorSkill object
  generateVendorSkill()    ── SKILL.md markdown
  ↓
  resolveProductCategories(domain, sector, brandType, sectors) ── Perplexity sonar (sequential)
    │  Depth and scope vary by brand type:
    │    focused types (brand/retailer/etc) → up to 2 sectors, L3 categories
    │    department_store/supermarket → multi-sector, L1+L2 categories
    │    mega_merchant → L1 root categories only (no Perplexity call)
    ↓
  upsertBrandIndex() ── write to brand_index (domain as unique key)
  ↓
  Return score + breakdown + recommendations to client
```

### Key files

| File | Purpose |
|------|---------|
| `app/agentic-shopping-score/` | Frontend: scanner form, results display, multi-step UI |
| `app/agentic-shopping-score/scanner-form.tsx` | Domain input form with validation |
| `app/api/v1/scan/route.ts` | API entry point — orchestrates the full scan |
| `lib/scan-queue/process-next.ts` | Background scan queue worker — same pipeline, different entry |
| `lib/agentic-score/classify-brand.ts` | Perplexity brand classification |
| `lib/agentic-score/audit-site.ts` | Perplexity site audit (40+ signals) |
| `lib/agentic-score/resolve-categories.ts` | Perplexity category resolution (post-upsert) |
| `lib/agentic-score/scoring-engine.ts` | Score computation from evidence |
| `lib/agentic-score/rubric.ts` | ASX rubric — 11 signals, point values, thresholds |
| `lib/agentic-score/scan-utils.ts` | VendorSkill builder, domain utilities |
| `lib/procurement-skills/generator.ts` | SKILL.md markdown generation |
| `server/storage/brand-index.ts` | `upsertBrandIndex()` — persistence |
| `server/storage/brand-categories.ts` | Category junction CRUD |

---

## Rubric v1.1.0 — 11 Signals, 100 Points

### Clarity (35 pts)

| # | Signal | Max | What it checks |
|---|--------|-----|----------------|
| 1 | JSON-LD / Structured Data | 15 | Product, Offer, Organization schema.org markup |
| 2 | Product Feed / Sitemap | 10 | Accessible sitemap.xml with product URLs |
| 3 | Agent Metadata | 10 | llms.txt, ai-plugin.json, OpenAPI docs, semantic HTML |

### Discoverability (30 pts)

| # | Signal | Max | What it checks |
|---|--------|-----|----------------|
| 4 | Search API / MCP | 10 | MCP endpoint, OpenAPI spec, x402 protocol support |
| 5 | Internal Site Search | 10 | Search forms, OpenSearch description |
| 6 | Page Load Performance | 5 | Response time (target < 1 second) |
| 7 | Product Page Quality | 5 | Machine-readable pricing, variant IDs |

### Reliability (35 pts)

| # | Signal | Max | What it checks |
|---|--------|-----|----------------|
| 8 | Access & Authentication | 10 | Guest checkout availability (high priority) |
| 9 | Order Management | 10 | Variant selectors, quantity inputs, cart URLs |
| 10 | Checkout Flow | 10 | Discount fields, payment methods, shipping options |
| 11 | Bot Tolerance | 5 | robots.txt AI-blocking, CAPTCHA detection |

---

## Brand Classification (Perplexity Call 1)

**File:** `lib/agentic-score/classify-brand.ts`

Sends the domain to Perplexity `sonar` with a structured JSON prompt. Returns:

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Official brand name |
| `sector` | VendorSector | Constrained to 26 assignable sectors |
| `tier` | BrandTier | Market position (commodity → ultra_luxury) |
| `subCategories` | string[] | Up to 5 freeform product descriptions |
| `capabilities` | VendorCapability[] | Detected e-commerce capabilities |
| `description` | string | One-sentence summary |
| `guestCheckout` | boolean | Whether guest checkout is available |

Sector is constrained to `ASSIGNABLE_SECTORS` (26 entries — all 27 minus luxury). Unknown values fall back to `"specialty"`.

If classification fails entirely, the pipeline continues with degraded defaults (name from domain, existing sector, null tier).

---

## Site Audit (Perplexity Call 2)

**File:** `lib/agentic-score/audit-site.ts`

Runs in parallel with classification. Evaluates 40+ technical signals:

- Structured data: JSON-LD, schema types, Open Graph
- Sitemaps: availability, structure, product URL presence
- Robots: rules, AI-agent blocking patterns
- Search: functionality, URL patterns, autocomplete, OpenSearch
- Checkout: guest checkout, cart page, payment methods, PO/tax-exempt
- Agent features: llms.txt, ai-plugin.json, OpenAPI docs, MCP endpoints
- Bot tolerance: CAPTCHAs, rate limiting, login walls

Returns a `SiteAudit` object with boolean/string/numeric values for each signal.

---

## Category Resolution (Perplexity Call 3)

**File:** `lib/agentic-score/resolve-categories.ts`

Runs after upsert — sequential, non-critical. See `scan-taxonomy-skills-pipeline.md` § Step 6 for the full flow.

---

## SKILL.md Generation

**File:** `lib/procurement-skills/generator.ts`

After scoring, `generateVendorSkill()` produces a markdown file that an AI agent can consume:

### Structure
1. **YAML frontmatter** — `asx_score`, `maturity: draft`, capabilities array, checkout methods
2. **Overview** — what the store sells, who it's for
3. **How to Search** — instructions for finding products
4. **How to Checkout** — step-by-step checkout flow
5. **Checkout Methods** — browser automation instructions, API details
6. **Tips** — 3–5 practical tips from the scan
7. **Known Issues** — CAPTCHAs, login walls, broken flows

### NEVER OVERWRITE rules
`generateVendorSkill()`, `buildVendorSkillDraft()`, and `upsertBrandIndex()` have established contracts. Do not change their function signatures or return types without updating all callers.

---

## Evidence System

Evidence is derived from the Perplexity site audit response and mapped to rubric signals:

```
jsonLd: boolean | string
sitemap: boolean | string
semanticHtml: boolean | string
searchApi: boolean | string
siteSearch: boolean | string
pageLoadMs: number
productPageQuality: boolean | string
guestCheckout: boolean | string
orderManagement: boolean | string
checkoutFlow: boolean | string
botTolerance: boolean | string
```

The scoring engine in `scoring-engine.ts` converts these values to numeric scores using the rubric thresholds.

---

## Fragile Areas & Gotchas

### Perplexity API dependency

The entire scan pipeline depends on Perplexity (`PERPLEXITY_API_KEY`). Without it, no scans work. There is no fallback to a different LLM provider for classification or audit.

### Three API calls per scan

Each scan makes 3 Perplexity calls: classification (parallel), audit (parallel), category resolution (sequential). At high scan volumes, this is the primary cost and rate-limit concern.

### Evidence mapping is implicit

The mapping between Perplexity's audit response fields and rubric signal names happens in `scoring-engine.ts`. If audit response shape changes (field renames, new fields), the mapping must be updated manually.

### Domain normalization edge cases

`normalizeDomain()` strips protocols and `www.` but doesn't handle:
- Subdomains that are separate stores (`shop.brand.com` vs `brand.com`)
- Country-specific TLDs (`brand.co.uk` vs `brand.com`)
- Non-ASCII domains (punycode)

### Scan cache is time-based only

A brand_index row younger than 30 days returns cached results. There's no invalidation on site changes. If a merchant dramatically improves their site, they have to wait for the cache to expire or request a manual rescan.

### SCORING_RUBRIC is a protected constant

The `SCORING_RUBRIC` data structure must not be modified without coordinating across the score computation, evidence collection, and display code. Changes to point values or signal names break historical score comparisons.

---

## Expansion Plans

### Near-term
- **Rescan API** — allow merchants to trigger a fresh scan from their claimed brand page
- **Partial rescan** — only re-evaluate signals likely to have changed

### Medium-term
- **Batch scanning** — CLI tool or admin API to scan thousands of domains from a CSV
- **Score history** — track score changes over time per domain (currently each scan overwrites)
- **Signal-level evidence viewer** — show exactly what the scanner found for each signal

### Longer-term
- **Real-time monitoring** — periodic re-scans with alerting on score drops
- **Rubric v2** — potential addition of signals for returns/refund policy quality, shipping transparency, accessibility compliance
