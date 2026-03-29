# CreditClaw — Agentic Commerce Strategy & Standards Vision

## Purpose of This Document

This is the master strategic document for CreditClaw's positioning in the agentic commerce ecosystem. It defines CreditClaw's two primary standards contributions — the **ASX Score** and the **Agentic Procurement Metadata Standard** — and explains how CreditClaw's products and services connect to a broader vision of making every online store shoppable by AI agents.

All tactical implementation plans, UX specs, and technical details live in sub-documents. This document is the "why" and "what"; those documents are the "how."

### Sub-Documents

| Document | What It Covers |
|---|---|
| `agent-readiness-and-product-index-service.md` | Three service tiers (free scan → premium scan → full product index), agent gateway, implementation roadmap |
| `shopy-sh-commerce-skill-standard.md` | The shopy.sh open standard — commerce SKILL.md format, frontmatter schema, catalog, CLI |
| `agentic-shopping-score-build-plan.md` | Technical build plan for the Tier 1 free scanner tool |
| `scan-page-ux-design.md` | Page UX for `/agentic-shopping-score` — layout, results page, URL structure, SEO meta tags |
| `product-index-taxonomy-plan.md` | Google Product Taxonomy adoption, UCP category model, product index schema |
| `axs-technical-plan.md` | AXS scoring framework (readiness score + crowd-sourced rating) — technical implementation |

---

## The Landscape

AI shopping agents are emerging from every major platform — ChatGPT (via Operator and plugins), Claude (via MCP), Gemini (via Google AI Mode and UCP), and custom-built procurement bots. But the infrastructure for agents to actually shop online is fragmented and immature:

- **Shopify** built MCP into every Shopify store — but only Shopify stores benefit.
- **Google** launched UCP — but it's restricted-access and requires direct merchant integration.
- **Existing metadata standards** (Open Graph, Schema.org, Google Product Taxonomy) describe products — but don't describe how an agent should navigate the store, handle checkout, or interact with shipping/payment/loyalty options.
- **No one** is measuring or scoring how well a store actually works for AI agents.
- **No one** has proposed a standard for the agentic procurement metadata that agents need beyond basic product discovery.

CreditClaw's opportunity is to fill these gaps — not by competing with Shopify or Google, but by building the **connective tissue** between any merchant and every agent platform.

---

## CreditClaw's Two Standards Contributions

### Standard 1: The ASX Score (Agent Shopping Experience Score)

**What it is:** A public, standardized score (0–100) that measures how well any online store supports AI shopping agents. Think of it as the "Google PageRank for agentic commerce" — except instead of measuring how well a page ranks in search, it measures how well a store works when a shopping agent tries to find products, select specific options, check out, and complete a purchase.

**Why it matters:** Merchants today have no way to know whether AI agents can shop at their store. The ASX Score gives them a concrete number and actionable recommendations — and gives the ecosystem a shared language for evaluating agent readiness.

**Where it lives:** `/agentic-shopping-score` on CreditClaw — free, public, no login required.

See [ASX Score Framework](#asx-score-framework) below for the full pillar/signal breakdown.

---

### Standard 2: Agentic Procurement Metadata Standard

> **STATUS: PLACEHOLDER — To be developed in a future planning session.**

**What it is:** A proposed metadata extension for e-commerce sites that goes beyond existing product metadata (Schema.org, Open Graph, Google Merchant feeds) to include the specific information AI shopping agents need for end-to-end procurement.

**The gap:** Existing metadata standards tell an agent *what* a product is (name, price, image, availability). They don't tell an agent:

- What **payment methods** are supported and how to use them programmatically
- What **shipping options** are available, their costs, and estimated delivery times
- Whether **loyalty programs** exist, how points accrue, and whether agent-initiated purchases earn points
- Whether **tax exemption** is supported and how to apply it
- Whether **PO numbers** can be submitted programmatically
- What the **checkout flow** looks like (guest vs. registered, number of steps, required fields)
- What **agentic payment protocols** are supported (x402, ACP, Agent Payments Protocol)
- How **returns and exchanges** work when initiated by an agent

**CreditClaw's proposal:** Define a metadata standard — potentially as an extension to Schema.org or as a standalone `.well-known/agentic-commerce.json` manifest — that merchants can publish to tell AI agents everything they need to know to shop there programmatically.

**Relationship to shopy.sh:** The shopy.sh SKILL.md format already captures much of this information in its frontmatter fields. The Agentic Procurement Metadata Standard would be the *merchant-published* counterpart — a machine-readable manifest that any agent can discover at a well-known URL, without needing CreditClaw's SKILL.md file. The SKILL.md would reference and extend it.

**Relationship to UCP:** Google's UCP defines building blocks for agentic commerce (discovery, buying, post-purchase). The Agentic Procurement Metadata Standard would be complementary — focusing on the metadata that helps agents *evaluate* a store before interacting with it, rather than the protocol for actually transacting.

**Open questions (to be explored):**
- Should this be a Schema.org extension, a `.well-known` JSON file, an HTTP header, or all three?
- How does this relate to existing efforts like robots.txt (agent permissions), llms.txt (LLM instructions), and SKILL.md (agent skill files)?
- Should CreditClaw propose this to a standards body, or establish it as a de facto standard through adoption?
- What is the minimum viable set of fields that would provide immediate value to agent developers?

---

## ASX Score Framework

### The Three Pillars

The ASX Score measures a store's agent shopping experience across three pillars that map to the natural flow of an agent-initiated purchase:

```
   Clarity          →         Speed            →        Reliability
   ─────────────          ──────────────           ─────────────────
   Can the agent          Can the agent            Does the end-to-end
   FIND the store         DRILL IN quickly         experience actually
   and UNDERSTAND         to specific products,    WORK when you try
   what's available?      variants, stock,         to complete a real
                          and delivery?            purchase?
```

#### Pillar 1: Clarity (Discovery & Metadata Quality)

**The question:** Can the agent find the store, understand its catalog structure, and know what shipping/payment/loyalty options exist — before it even starts shopping?

**What it covers:**
- Is there structured product data (JSON-LD, Open Graph, Schema.org Product markup)?
- Is there a well-formed sitemap with product URLs?
- Is the site mobile/responsive (agents often use headless viewports)?
- Are **shipping options** clearly described in metadata or page structure?
- Are **payment methods** clearly described in metadata or page structure?
- Are **loyalty programs** described — including whether agent-initiated purchases earn points?
- Is the checkout page structure predictable and well-organized?

**How it's measured:**
- **Tier 1 (free scan):** Automated crawl checks for metadata presence, sitemap structure, page organization.
- **Tier 2 (premium scan):** Browser-controlled verification that metadata matches reality.

#### Pillar 2: Speed (Selection & Programmatic Access)

**The question:** Once the agent has found the store, can it quickly and programmatically drill into specifics? Not just "find sneakers" — but "find these sneakers in size 9.5, in brown, check if that exact variant is in stock, and confirm delivery within a week."

**What it covers:**
- Is there a functional product search (site search, API, MCP, CLI)?
- Is there a public API with documented endpoints?
- Is there MCP/UCP support for native agent interaction?
- Can the agent select specific **product variants** (size, color, configuration) programmatically?
- Can the agent check **real-time stock** for a specific variant?
- Can the agent get a **delivery estimate** for a specific address or region?
- How many steps/calls does it take to go from search → specific variant → stock check → delivery estimate?

**How it's measured:**
- **Tier 1 (free scan):** Detects whether the capabilities exist (API endpoint found, MCP probe, search URL template). Does NOT test them.
- **Tier 2 (premium scan):** Actually tests them — searches for a product, attempts variant selection, checks stock and delivery estimate. Measures response time and data quality.

#### Pillar 3: Reliability (Lived Experience)

**The question:** Does it actually work end-to-end in practice? When a real agent (or human using an agent) tries to search, find the specific item, check out, pay, and receive confirmation — does the whole thing succeed?

**What it covers:**
- Does checkout actually complete without errors?
- Can the agent select the **shipping option** it wants (not just default)?
- Does the **payment method** the agent intends to use actually work?
- How many **retries** does it typically take?
- Does **order confirmation** arrive correctly?
- Do **loyalty points** actually accrue for agent-initiated purchases?
- Does the store **block or throttle** agent traffic during real use?
- Is the product that arrives actually what was ordered (correct size, color, condition)?

**How it's measured:**
- **Tier 1 (free scan):** Only proxy signals — is the site bot-friendly (robots.txt)? Is there a clear checkout URL? Is guest checkout available? These are necessary conditions for reliability, not sufficient ones.
- **Tier 2 (premium scan):** Walks the checkout flow in a headless browser. Reports on form complexity, error handling, anti-bot measures. Can simulate a purchase up to (but not including) payment submission.
- **Crowd-sourced AXS Rating:** Real-world feedback from agents and humans who completed actual purchases. This is the definitive reliability signal — like a Google review, but specifically for the agent shopping experience.

### Pillar-to-Measurement Matrix

| | Tier 1 (Free Scan) | Tier 2 (Premium Scan) | Crowd-Sourced Rating |
|---|---|---|---|
| **Clarity** | Full measurement — metadata, sitemap, page structure | Validation — does metadata match reality? | N/A |
| **Speed** | Capability detection — does the feature exist? | Functional testing — does it actually work? How fast? | N/A |
| **Reliability** | Proxy signals — bot-friendly? guest checkout? | Flow testing — walk checkout, report issues | Real-world results — success rates, failure modes |

### Tier 1 ASX Score Signals (Free Scan)

These are the specific signals measured in the free scan, grouped by pillar. Total: 100 points.

#### Clarity Signals (35 points)

| Signal | Max Points | What We Check |
|---|---|---|
| **Structured Product Data** | 20 | JSON-LD Product schema, Open Graph product tags, Schema.org markup, meta descriptions with product attributes |
| **Sitemap Quality** | 10 | sitemap.xml exists, is valid XML, lists product URLs (not just pages), is linked from robots.txt |
| **Mobile/Responsive** | 5 | Viewport meta tag present, responsive design indicators |

**Potential expansion (optional, to be validated):**
- Shipping/payment/loyalty metadata presence — could be added as sub-signals under Structured Product Data or as a new signal. Currently these are partially captured by the LLM analysis but not scored separately.

#### Speed Signals (40 points)

| Signal | Max Points | What We Check |
|---|---|---|
| **Search Functionality** | 15 | Site search exists, returns structured results, supports query parameters, search URL template discoverable |
| **API Availability** | 15 | Public REST/GraphQL API detected, OpenAPI/Swagger docs, documented endpoints, developer portal |
| **MCP/UCP Support** | 10 | Shopify MCP endpoint (`/api/mcp`), UCP registration, A2A protocol, x402 support, ACP manifest |

**Potential expansion (optional, to be validated):**
- Variant discoverability — does the product page expose variant data (sizes, colors) in structured format? Currently partially captured in LLM analysis but not scored.
- Stock API — is there a way to check stock programmatically? Currently detected by probes but not weighted.

#### Reliability Signals (25 points)

| Signal | Max Points | What We Check |
|---|---|---|
| **Checkout Accessibility** | 15 | Guest checkout available, cart/checkout URLs predictable, tax exemption field present, PO number field present |
| **Bot Friendliness** | 10 | robots.txt allows crawling, no CAPTCHA on landing pages, no aggressive bot blocking, reasonable crawl-delay |

**Note:** These are proxy signals. True reliability can only be measured through Tier 2 flow testing and crowd-sourced ratings.

### ASX Score Labels

| Score Range | Label |
|---|---|
| 0–20 | Poor |
| 21–40 | Needs Work |
| 41–60 | Fair |
| 61–80 | Good |
| 81–100 | Excellent |

### Crowd-Sourced AXS Rating (Separate from ASX Score)

The AXS Rating is a 1–5 star rating from real-world feedback, NOT part of the 0–100 ASX Score. It measures actual performance across the same three pillars:

| Feedback Dimension | Pillar | What It Measures |
|---|---|---|
| `search_accuracy` (1–5) | Speed | How accurately catalog search returns relevant products |
| `stock_reliability` (1–5) | Reliability | Whether in-stock items are actually available at checkout |
| `checkout_completion` (1–5) | Reliability | How reliably checkout completes without errors |

**Future feedback dimensions (to be added):**
- `shipping_option_accuracy` — Could the agent select the intended shipping method?
- `payment_method_success` — Did the intended payment method work?
- `loyalty_attribution` — Were loyalty points correctly attributed to the agent-initiated purchase?
- `delivery_accuracy` — Was the delivered product correct (size, color, condition)?

See `axs-technical-plan.md` for the full technical specification of the rating aggregation algorithm.

---

## How the Pieces Connect

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    CreditClaw Strategic Layer                              │
│                                                                           │
│  ┌──────────────────────────┐   ┌──────────────────────────────────────┐ │
│  │  Standard 1:              │   │  Standard 2:                         │ │
│  │  ASX Score                │   │  Agentic Procurement Metadata        │ │
│  │  (Agent Shopping          │   │  (PLACEHOLDER — future)              │ │
│  │  Experience Score)        │   │  Proposed metadata extension for     │ │
│  │                           │   │  e-commerce sites describing agent   │ │
│  │  Three pillars:           │   │  procurement capabilities            │ │
│  │  Clarity / Speed /        │   │                                      │ │
│  │  Reliability              │   │  Relates to: Schema.org, UCP,        │ │
│  │                           │   │  .well-known manifests                │ │
│  └────────────┬──────────────┘   └──────────────────────────────────────┘ │
│               │                                                           │
│               ▼                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                    Products & Services                                │ │
│  │                                                                       │ │
│  │  Tier 1: Free Scan ──────── ASX Score (Clarity + Speed signals)      │ │
│  │    └─ Auto-generated SKILL.md (shopy.sh format)                      │ │
│  │    └─ Recommendations to improve score                                │ │
│  │    └─ Brand comparison with one peer                                  │ │
│  │                                                                       │ │
│  │  Tier 2: Premium Scan ──── Tested Speed + Reliability signals        │ │
│  │    └─ Browser-controlled flow walk-through                            │ │
│  │    └─ Premium SKILL.md with selectors and flow data                  │ │
│  │    └─ Step-by-step checkout report                                    │ │
│  │                                                                       │ │
│  │  Tier 3: Full Index ─────── Product-level enrichment + distribution  │ │
│  │    └─ Catalog crawl + LLM enrichment (summaries, intent phrases)     │ │
│  │    └─ Google Product Taxonomy mapping                                 │ │
│  │    └─ Distribution: Shopify Catalog API, Google UCP, CreditClaw      │ │
│  │    └─ Agent Gateway (unified API proxy)                               │ │
│  │                                                                       │ │
│  │  AXS Rating ────────────── Crowd-sourced reliability feedback        │ │
│  │    └─ Real-world purchase success rates                               │ │
│  │    └─ Feedback from agents and humans                                 │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│               │                                                           │
│               ▼                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                    Open Standard: shopy.sh                            │ │
│  │                                                                       │ │
│  │  Commerce-specific SKILL.md format (extends Vercel's skills.sh)      │ │
│  │  Published skill files for every scanned/indexed merchant             │ │
│  │  Public catalog at shopy.sh                                           │ │
│  │  CLI: npx shopy add {vendor}                                         │ │
│  │  Compatible with any agent supporting SKILL.md                        │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Competitive Position

**What CreditClaw builds that no one else has:**

1. **The ASX Score** — No one is scoring stores for agent shopping experience. Merchants have SEO scores (Lighthouse, Ahrefs), accessibility scores (WCAG), but no agent-readiness score. CreditClaw defines this category.

2. **The shopy.sh standard** — A portable, open file format that tells any AI agent how to shop at any merchant. Built on Vercel's SKILL.md format, extended with commerce-specific metadata. Not locked to any platform.

3. **The universal bridge** — CreditClaw connects any merchant (Shopify or not) to every agent discovery platform (Shopify Catalog MCP, Google UCP, CreditClaw index). One integration, universal distribution.

4. **The agent gateway** — One API key, one format, every vendor. Agents don't need individual API keys for Amazon, Walmart, Grainger. CreditClaw holds the vendor relationships and routes requests.

5. **The data flywheel** — Every scan grows the brand index. Every Tier 3 crawl grows the product index. Every gateway request trains the routing engine. Every agent purchase feeds back into reliability ratings.

---

## Revenue Model Summary

| Tier | Pricing | Pitch |
|---|---|---|
| **Tier 1** | Free | "See how agent-ready your store is" — instant score, basic SKILL.md, recommendations |
| **Tier 2** | One-time fee | "Make it 10x easier for agents to shop at your store" — deep audit, premium SKILL.md |
| **Tier 3** | Monthly subscription | "Make every product findable by every AI agent" — catalog enrichment + distribution |
| **Gateway** | Per-query / included in Tier 3 | "One API key, every vendor" — agent-facing product search and checkout routing |
| **Vendor-sponsored** | Custom | Featured placement in search results and skill catalog |

---

## Open Strategic Questions

1. **Standards body engagement.** Should CreditClaw propose the ASX Score and/or the Agentic Procurement Metadata Standard to a formal standards body (W3C, IETF, schema.org community group)? Or establish them as de facto standards through adoption first?

2. **Relationship with Google UCP team.** CreditClaw's aggregator model for UCP (submitting feeds on behalf of merchants) requires Google's cooperation. Should we engage early as a partner, or wait until UCP access opens broadly?

3. **Relationship with Shopify.** Shopify built MCP into every store. CreditClaw extends this to non-Shopify merchants. Is Shopify a competitor or a partner? (Answer: partner — we drive more product data into their ecosystem.)

4. **ASX Score as an industry benchmark.** For the score to matter, other platforms need to reference it. How do we get agent developers (OpenAI, Anthropic, Google) to consider ASX Score when ranking merchant results?

5. **Agentic Procurement Metadata timing.** When should we develop the full metadata standard proposal? After Tier 1 is live and we have real scan data? Or as a parallel workstream?
