# CreditClaw — Agentic Commerce Go-to-Market Strategy

## What This Document Is

This is CreditClaw's commercial strategy for bringing the agentic commerce standards to market. It describes how CreditClaw delivers the standards defined in `agentic-commerce-standard.md` through products and services on creditclaw.com and shopy.sh.

For the standards themselves (metadata format, ASX Score, AXS Rating), see `agentic-commerce-standard.md`.

### Related Documents

| Document | What It Covers |
|---|---|
| `agentic-commerce-standard.md` | The standards: metadata format, ASX Score pillars/signals, AXS Rating algorithm |
| `agent-readiness-and-product-index-service.md` | Three-tier service technical details, agent gateway, product index |
| `agentic-shopping-score-build-plan.md` | Technical build plan for the Tier 1 scanner tool |
| `scan-page-ux-design.md` | Page UX for `/agentic-shopping-score` |
| `product-index-taxonomy-plan.md` | Google Product Taxonomy adoption |
| `phase-6-skill-feedback-loop.md` | Feedback loop implementation steps |

---

## Positioning

CreditClaw is the connective tissue between online merchants and AI shopping agents. We don't compete with Shopify or Google — we bridge the gap between any merchant (Shopify or not) and every agent platform (ChatGPT, Claude, Gemini, and custom procurement bots).

We do this through two things no one else has:

1. **An open standard** for describing a merchant's agentic commerce capabilities (the metadata format + SKILL.md files via shopy.sh)
2. **A scoring system** that measures how well a store works for AI agents (ASX Score + AXS Rating)

And we commercialize these through a three-tier service model, an open skill catalog (shopy.sh), and an agent gateway.

---

## Two Delivery Channels

### creditclaw.com — The Platform

CreditClaw's main platform delivers the scoring, scanning, and enrichment services:

| Page / Service | What It Does |
|---|---|
| `/agentic-shopping-score` | Free public scanner — enter a domain, get an ASX Score |
| `/agentic-shopping-score/[domain]` | Results page — score breakdown, recommendations, SKILL.md download, brand comparison |
| `/skills` | Curated brand catalog — browse merchants by sector, score, capabilities |
| `/skills/[vendor]` | Brand detail page — full metadata, skill preview, AXS Rating |
| `/axs` | Methodology page — explains the scoring system |
| `/c/[sector]` | Sector landing pages — SEO-optimized category pages |
| `/dashboard/scans` | Manage scanned domains (authenticated users) |
| `/dashboard/index` | Product index status for Tier 3 customers |

### shopy.sh — The Open Standard & Catalog

shopy.sh is the public face of the metadata standard. It's where the specification lives and where generated SKILL.md files are published.

| Page | What It Does |
|---|---|
| `/` | Landing page — what shopy.sh is, how it works, install instructions |
| `/spec` | Full metadata specification — frontmatter fields, body structure, validation rules |
| `/catalog` | Searchable directory of all published commerce skills |
| `/catalog/[vendor]` | Individual vendor skill page — metadata, ASX Score, AXS Rating, download |
| `/sectors` | Browse skills by sector |
| `/leaderboard` | Top-rated vendors by ASX Score and AXS Rating |
| `/submit` | Submit new skills (vendors and community) |
| `/docs` | Integration guide for agent developers |

**CLI (future):**

```bash
npx shopy add amazon              # Install a skill
npx shopy add --sector electronics # Install all skills in a sector
npx shopy list                    # List available skills
npx shopy search "office supplies" # Search for skills
npx shopy update                  # Update installed skills
```

The CLI installs SKILL.md files into the agent's skill directory — compatible with any agent that supports the skills.sh format (Claude Code, Cursor, Copilot, Gemini, etc.).

---

## Service Tiers

### Tier 1: Free Agent Shopping Experience Scan

**What the user does:** Enters a domain on `/agentic-shopping-score`.

**What we deliver:**
- ASX Score (0–100) with 8-signal breakdown across Clarity, Speed, and Reliability pillars
- Actionable recommendations grouped by impact (high / medium / quick wins)
- Auto-generated SKILL.md in the agentic commerce metadata format
- Side-by-side comparison with one similar brand from the curated catalog
- Score saved to `scan_history` for tracking over time

**Tech:** Server-side fetch + existing `analyzeVendor()` pipeline + supplementary fetches (sitemap.xml, robots.txt) + ASX Score computation engine. See `agentic-shopping-score-build-plan.md`.

**Value to CreditClaw:** Lead generation, brand index growth, SEO (every scanned domain gets an indexable results page).

### Tier 2: Premium Browser-Controlled Deep Scan

**What the user does:** Pays for a deep audit. May provide test credentials.

**What we deliver:**
- Full shopping flow walk-through via headless browser (Playwright)
- Tested Speed signals (actually searches for products, selects variants, checks stock)
- Tested Reliability signals (walks the checkout flow, reports on form complexity, error handling, anti-bot measures)
- Premium SKILL.md with CSS selectors, form field mappings, API endpoint signatures
- Detailed step-by-step report with screenshots
- Enhanced ASX Score based on real interaction, not just surface signals

**Tech:** Playwright headless browser, screenshot capture, flow recording. See `agent-readiness-and-product-index-service.md` Tier 2 section.

### Tier 3: Full Product Index + Catalog Enrichment + Distribution

**What we deliver:**
- Weekly product catalog crawl (API → Feed → Sitemap → deep crawl)
- LLM-powered enrichment per product: agent-optimized natural language summary + 5-15 purchase intent phrases
- Google Product Taxonomy mapping
- Distribution to Shopify Catalog API, Google UCP, and CreditClaw's own searchable index
- Agent Gateway access — one API key, every vendor

**Tech:** See `agent-readiness-and-product-index-service.md` Tier 3 and `product-index-taxonomy-plan.md`.

**Core pitch:** "We crawl your catalog, write agent-optimized descriptions and intent phrases for every product, map everything to the Google Product Taxonomy, and submit it all to Shopify, Google, and our own index — so your products are discoverable by every AI agent on every platform. You don't lift a finger."

---

## Revenue Model

| Tier | Pricing | Pitch |
|---|---|---|
| **Tier 1** | Free | "See how agent-ready your store is" — instant score, basic SKILL.md, recommendations |
| **Tier 2** | One-time fee per domain | "Make it 10x easier for agents to shop at your store" — deep audit, premium SKILL.md |
| **Tier 3** | Monthly subscription | "Make every product findable by every AI agent" — catalog enrichment + distribution |
| **Tier 3 VIP** | Custom retainer | "We work with your dev team" — dedicated support, custom enrichment, API integration |
| **Gateway** | Per-query / included in Tier 3 | "One API key, every vendor" — agent-facing product search and checkout routing |
| **Vendor-sponsored** | Custom | Featured placement in search results and skill catalog |
| **Certification** | Included in Tier 2+ | "shopy.sh verified" badge for merchants who pass premium scan |

---

## Competitive Position

**What exists today:**

| Player | What They Do | Limitation |
|---|---|---|
| **Shopify MCP** | Exposes Shopify store products to AI agents | Only Shopify stores |
| **Google UCP** | Agent commerce protocol for Google AI Mode / Gemini | Restricted access, requires direct integration |
| **Firecrawl / Exa** | Web crawling services | No categorization, no indexes, no platform submission |
| **Aggregator APIs** (RapidAPI etc.) | API access marketplaces | No agent-specific routing, no SKILL.md, no procurement context |

**What CreditClaw builds that no one else has:**

1. **The ASX Score** — No one is scoring stores for agent shopping experience. Merchants have SEO scores (Lighthouse, Ahrefs), accessibility scores (WCAG), but no agent-readiness score.

2. **The agentic commerce metadata standard** — A portable, open format that tells any AI agent how to shop at any merchant. Not locked to any platform.

3. **The universal bridge** — Connects any merchant to every agent discovery platform (Shopify Catalog MCP, Google UCP, CreditClaw index). One integration, universal distribution.

4. **The agent gateway** — One API key, one format, every vendor. Agents don't need individual API keys for Amazon, Walmart, Grainger.

5. **The data flywheel** — Every scan grows the brand index. Every Tier 3 crawl grows the product index. Every gateway request trains the routing engine. Every agent purchase feeds back into reliability ratings.

---

## How shopy.sh Connects to CreditClaw

```
┌─────────────────────────────────────────────────────────────────┐
│                        CreditClaw Platform                       │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Tier 1   │  │ Tier 2   │  │ Tier 3   │  │ Agent Gateway    │ │
│  │ Free     │  │ Premium  │  │ Full     │  │ API Proxy +      │ │
│  │ Scan     │  │ Scan     │  │ Index    │  │ Credential Vault │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
│       │              │              │                 │           │
│       └──────────────┴──────────────┴─────────────────┘           │
│                              │                                    │
│                     Generates / Updates                           │
│                              │                                    │
│                              ▼                                    │
│                    ┌──────────────────┐                           │
│                    │ SKILL.md Files   │                           │
│                    │ (standard format)│                           │
│                    └────────┬─────────┘                           │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                    Published to
                              │
                              ▼
                    ┌──────────────────┐
                    │   shopy.sh       │
                    │   Public Catalog │
                    │   + Spec Site    │
                    └────────┬─────────┘
                             │
               Installed by agents via
                             │
                    ┌────────┴────────┐
                    │  npx shopy add  │
                    │  or manual      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   AI Agents      │
                    │   (Any agent     │
                    │   supporting     │
                    │   SKILL.md)      │
                    └──────────────────┘
```

---

## Strategic Open Questions

1. **shopy.sh hosting.** Separate Next.js site or a section within creditclaw.com? Separate site gives more legitimacy as an open standard. Same site is simpler.

2. **Community contributions.** Should third parties submit skills to the shopy.sh catalog? If yes, we need a review/validation pipeline.

3. **Google UCP relationship.** CreditClaw's aggregator model requires Google's cooperation. Engage early as a partner or wait for open access?

4. **Shopify relationship.** Shopify built MCP into every store. CreditClaw extends this to non-Shopify merchants. Partner, not competitor — we drive more product data into their ecosystem.

5. **CLI naming.** Is `npx shopy` the right name? Mirrors `npx skills` cleanly. Alternative: `npx shopy-skills`.

6. **Skill signing.** Should CreditClaw cryptographically sign generated skills so agents can verify authenticity?

7. **Versioning.** When a vendor's site changes, the skill needs updating. Automated re-scan + re-generation? Manual review?
