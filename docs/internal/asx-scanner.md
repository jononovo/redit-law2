# ASX Score Scanner — Internal Developer Guide

> Last updated: 2026-04-02

## Overview

The ASX (Agentic Shopping Experience) Score Scanner evaluates how "AI-ready" a retail website is. It combines deterministic HTML/file detection with an LLM-powered multi-page browsing agent that visits product pages and checkout flows. The output is a 0–100 score, a per-signal breakdown, improvement recommendations, and a generated SKILL.md file that teaches AI agents how to shop on that site.

The scanner is the primary growth engine — every scan creates or updates a `brand_index` row, so the catalog grows automatically.

---

## Architecture

```
User submits domain → POST /api/v1/scan
  ↓
  ├── Cache check: brand_index row < 30 days old? → return cached
  ↓
  fetchScanInputs()
    ├── Firecrawl (if FIRECRAWL_API_KEY set) → rendered HTML
    └── Fallback: raw fetch with custom User-Agent → static HTML
    ├── sitemap.xml fetch
    └── robots.txt fetch
  ↓
  detectAll() — 10+ static regex/string detectors
    → JSON-LD, semantic HTML, search forms, sitemaps, robots.txt rules
  ↓
  agenticScan() — Claude multi-page browser agent
    → visits up to 8 pages, records evidence
    → tools: fetch_page, record_evidence, record_findings
  ↓
  Merge static + agent evidence
  ↓
  computeScoreFromRubric() — Rubric v1.1.0, 11 signals, 100 pts
  ↓
  buildVendorSkillDraft() → VendorSkill object
  generateVendorSkill() → SKILL.md markdown
  ↓
  upsertBrandIndex() → write to brand_index (domain as unique key)
  ↓
  Return score + breakdown + recommendations to client
```

### Key files

| File | Purpose |
|------|---------|
| `app/agentic-shopping-score/` | Frontend: scanner form, results display, multi-step UI |
| `app/agentic-shopping-score/scanner-form.tsx` | Domain input form with validation |
| `app/api/v1/scan/route.ts` | API entry point — orchestrates the full scan |
| `lib/procurement-skills/scan/` | Core scan logic directory |
| `lib/procurement-skills/scan/fetch-inputs.ts` | `fetchScanInputs()` — homepage, sitemap, robots.txt retrieval |
| `lib/procurement-skills/scan/detect-all.ts` | `detectAll()` — static regex-based signal detection |
| `lib/procurement-skills/scan/agent-scan.ts` | `agenticScan()` — Claude-powered multi-page browsing |
| `lib/procurement-skills/scan/compute-score.ts` | `computeScoreFromRubric()` — applies rubric to evidence |
| `lib/procurement-skills/generator.ts` | `generateVendorSkill()` — SKILL.md markdown generation |
| `lib/procurement-skills/scan/rubric.ts` | `SCORING_RUBRIC` — the 11 signals, point values, and thresholds |
| `server/storage/brand-index.ts` | `upsertBrandIndex()` — persistence |

---

## Rubric v1.1.0 — 11 Signals, 100 Points

### Clarity (35 pts)

| # | Signal | Max | What it checks |
|---|--------|-----|----------------|
| 1 | JSON-LD / Structured Data | 15 | Product, Offer, Organization schema.org markup |
| 2 | Product Feed / Sitemap | 10 | Accessible sitemap.xml with product URLs |
| 3 | Clean HTML / Semantic Markup | 10 | HTML5 landmarks, ARIA attributes, alt text |

### Discoverability (30 pts)

| # | Signal | Max | What it checks |
|---|--------|-----|----------------|
| 4 | Search API / MCP | 10 | MCP endpoint, OpenAPI spec, x402 protocol support |
| 5 | Internal Site Search | 10 | Search forms, OpenSearch description |
| 6 | Page Load Performance | 5 | Response time (target < 1 second) |
| 7 | Product Page Quality | 5 | Machine-readable pricing, variant IDs (agent-verified) |

### Reliability (35 pts)

| # | Signal | Max | What it checks |
|---|--------|-----|----------------|
| 8 | Access & Authentication | 10 | Guest checkout availability (high priority) |
| 9 | Order Management | 10 | Variant selectors, quantity inputs, cart URLs |
| 10 | Checkout Flow | 10 | Discount fields, payment methods, shipping options |
| 11 | Bot Tolerance | 5 | robots.txt AI-blocking, CAPTCHA detection |

---

## The Agentic Scan

The most complex and expensive part of the system. A Claude Sonnet instance acts as a web browsing agent:

- **Model:** `claude-sonnet-4-6-20260320` via the Anthropic SDK
- **Budget:** max 8 page fetches (`MAX_PAGES`), max 20 tool-call turns (`MAX_TURNS`)
- **Tools available to the agent:**
  - `fetch_page(url)` — fetches a URL and returns rendered HTML (uses Firecrawl or raw fetch)
  - `record_evidence(signal, value, source_url, notes)` — logs evidence for a specific rubric signal
  - `record_findings(findings)` — records general observations about the site

The agent is prompted with the rubric and told to focus on evidence that static detectors can't find — especially signals 7, 8, 9, 10 which require navigating to product pages and checkout flows.

---

## SKILL.md Generation

After scoring, `generateVendorSkill()` produces a markdown file that an AI agent can consume:

### Structure
1. **YAML frontmatter** — `asx_score`, `maturity: draft`, capabilities array, checkout methods
2. **Overview** — what the store sells, who it's for
3. **How to Search** — instructions for finding products (site search, category navigation, API if available)
4. **How to Checkout** — step-by-step checkout flow as observed by the agent
5. **Checkout Methods** — browser automation instructions, API details if detected
6. **Tips** — 3–5 practical tips gathered by the LLM during the scan
7. **Known Issues** — CAPTCHAs, login walls, broken flows

### NEVER OVERWRITE rules
`generateVendorSkill()`, `fetchScanInputs()`, and `upsertBrandIndex()` have established contracts. Do not change their function signatures or return types without updating all callers.

---

## Evidence System

Evidence is a flat key-value map where keys correspond to rubric signals:

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

The `coerceEvidenceValue()` function in `agent-scan.ts` converts LLM-returned strings (`"yes"`, `"true"`, `"found"`, etc.) into boolean/numeric values for the scoring engine. This is a potential source of misclassification if the LLM returns unexpected phrasing.

---

## Fragile Areas & Gotchas

### Firecrawl dependency

Without `FIRECRAWL_API_KEY`, the scanner falls back to raw `fetch`. This fails silently on SPA sites (React, Vue, Angular) because the HTML returned is just a shell with `<div id="root"></div>`. The score will be artificially low because none of the structured data or semantic markup is present in the un-rendered HTML.

**Impact:** A site built with Shopify Hydrogen or Next.js SSR will score fine. A pure React SPA will score near zero on Clarity signals.

### LLM budget exhaustion

The agent has 8 page fetches and 20 turns. Complex sites with multi-step checkout flows (age verification → location selection → product page → cart → checkout) can exhaust the budget before reaching the checkout signals. Signals 8–10 (Reliability pillar, 30 points) may all score zero.

**Symptom:** High Clarity score but zero Reliability score on sites known to have checkout.

### Evidence coercion is string-based

The agent returns free-text observations. `coerceEvidenceValue` maps strings like `"yes"`, `"true"`, `"found"` to booleans, but nuanced responses like `"partially available"` or `"requires login first"` may not map correctly. This can cause false positives or false negatives.

### Domain normalization edge cases

`normalizeDomain()` strips protocols and `www.` but doesn't handle:
- Subdomains that are actually separate stores (e.g., `shop.brand.com` vs `brand.com`)
- Country-specific TLDs (e.g., `brand.co.uk` vs `brand.com`)
- Non-ASCII domains (punycode)

### Scan cache is time-based only

A brand_index row younger than 30 days returns cached results. There's no invalidation on site changes. If a merchant dramatically improves their site, they have to wait for the cache to expire or request a manual rescan.

### SCORING_RUBRIC is a protected constant

The `SCORING_RUBRIC` data structure must not be modified without coordinating across the score computation, evidence collection, and display code. Changes to point values or signal names break historical score comparisons.

---

## Expansion Plans

### Near-term
- **Rescan API** — allow merchants to trigger a fresh scan from their claimed brand page
- **Partial rescan** — only re-evaluate signals likely to have changed (e.g., skip Clarity if HTML structure hasn't changed)

### Medium-term
- **Batch scanning** — CLI tool or admin API to scan thousands of domains from a CSV
- **Score history** — track score changes over time per domain (currently each scan overwrites)
- **Signal-level evidence viewer** — show exactly what the scanner found for each signal, with source URLs and screenshots

### Longer-term
- **Real-time monitoring** — periodic re-scans with alerting on score drops
- **Community-contributed detectors** — plugin system for new signals beyond the core 11
- **Rubric v2** — potential addition of signals for returns/refund policy quality, shipping transparency, and accessibility compliance
