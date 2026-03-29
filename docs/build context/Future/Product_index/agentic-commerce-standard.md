# Agentic Commerce Standard — Metadata, Scoring & Rating Framework

## What This Document Is

This is the canonical definition of two proposed open standards for agentic commerce:

1. **The Agentic Procurement Metadata Standard** — a structured metadata format that tells AI shopping agents everything they need to know about a merchant: what they sell, how to find products, how to check out, what payment and shipping options exist, and how to interact programmatically.

2. **The ASX Score & AXS Rating System** — a measurement framework for evaluating how well any online store supports AI shopping agents, combining automated scan-based scoring with crowd-sourced real-world feedback.

These standards are vendor-neutral and platform-agnostic. Any company, agent developer, or merchant can adopt them. CreditClaw's implementation of these standards (products, services, go-to-market) is described separately in `creditclaw-agentic-commerce-strategy.md`.

---

## Why These Standards Are Needed

AI shopping agents are emerging from every major platform — ChatGPT (Operator), Claude (MCP), Gemini (UCP/AI Mode), and custom procurement bots. But the infrastructure for agents to actually shop online is fragmented:

- **Existing metadata standards** (Open Graph, Schema.org, Google Product Taxonomy) describe what products are — but not how an agent should navigate the store, handle checkout, or interact with shipping, payment, and loyalty options.
- **Shopify built MCP** into every Shopify store — but only Shopify stores benefit.
- **Google launched UCP** — but it's restricted-access and requires direct merchant integration.
- **No one is measuring** how well a store actually works for AI agents.
- **No one has proposed** a standard for the agentic procurement metadata that agents need beyond basic product discovery.

These two standards fill those gaps.

---

# Part 1: Agentic Procurement Metadata Standard

## Overview

The Agentic Procurement Metadata Standard defines a structured set of fields that describe a merchant's capabilities from the perspective of an AI shopping agent. It answers the questions an agent needs answered before it starts shopping:

- What does this merchant sell, and in what categories?
- How can I search for products — API, MCP, site search, CLI?
- What's the checkout flow — guest or registered? How many steps?
- What payment methods are accepted? What agentic payment protocols are supported?
- What shipping options exist? What are the delivery timeframes?
- Is there a loyalty program? Do agent-initiated purchases earn points?
- How reliable is this store for agent transactions? What's the score?

## Relationship to Existing Standards

| Standard | What It Covers | Gap for Agents |
|---|---|---|
| **Schema.org / JSON-LD** | Product attributes (name, price, image, availability) | No checkout flow, no payment methods, no agent interaction model |
| **Open Graph** | Social sharing metadata (title, description, image) | No commerce data at all |
| **Google Product Taxonomy** | Product categorization (5,600 categories) | Classification only — no capability or interaction data |
| **robots.txt** | Crawl permissions for bots | Binary allow/deny — no nuance about agent commerce capabilities |
| **llms.txt** | LLM-specific site instructions | General-purpose — no commerce structure |
| **skills.sh / SKILL.md** | How to teach an AI agent a skill (Vercel's format) | Developer-tooling focused — no commerce-specific fields |

The Agentic Procurement Metadata Standard extends the skills.sh SKILL.md format with commerce-specific fields. A valid agentic commerce SKILL.md is also a valid skills.sh SKILL.md — agents that support the base format can load it without modification.

## File Format

The standard uses YAML frontmatter inside a Markdown file (`.md`), following the SKILL.md convention established by Vercel's skills.sh.

The commerce-specific metadata lives inside the `metadata` map — which skills.sh already supports as arbitrary key-value pairs — so there's no format conflict.

## Full Frontmatter Schema

```yaml
---
name: amazon-procurement
description: >
  Search and purchase products on Amazon.com. Use when the user needs to find
  products, compare prices, add items to cart, or complete checkout on Amazon.
  Supports search by keyword, category, UPC, and ASIN.
license: MIT
compatibility: "Requires API key for gateway access. Direct access requires vendor API credentials."
metadata:
  # === Identity ===
  vendor: amazon
  domain: amazon.com
  display_name: Amazon
  logo_url: https://cdn.example.com/brands/amazon/logo.png

  # === Taxonomy ===
  sector: retail
  sub_sectors:
    - general-merchandise
    - electronics
    - home-goods
    - books
    - grocery
  gpt_category_ids:
    - 222    # Electronics
    - 536    # Home & Garden
    - 783    # Media
    - 412    # Food, Beverages & Tobacco
  tier: value

  # === ASX Score (scan-based, 0-100) ===
  asx_score: 82
  asx_clarity: 30           # out of 35
  asx_speed: 35             # out of 40
  asx_reliability: 17       # out of 25
  last_scanned: "2026-03-15"
  scan_tier: premium         # free | premium

  # === AXS Rating (crowd-sourced, 1-5) ===
  axs_rating: 4.2
  axs_search_accuracy: 4.5
  axs_stock_reliability: 4.0
  axs_checkout_completion: 4.1
  axs_rating_count: 47

  # === API & Programmatic Access ===
  api_tier: partnered        # open | keyed | partnered | private
  api_name: Amazon PA-API v5
  mcp_endpoint: null
  ucp_registered: false
  has_cli: false
  search_api: true
  search_url_template: "https://www.amazon.com/s?k={q}"

  # === Checkout ===
  auth_required: true
  guest_checkout: false
  checkout_steps: 4
  supported_payment_methods:
    - credit_card
    - amazon_pay
    - gift_card
  agentic_payment_protocols:
    - x402
    - acp
  po_number_supported: false
  tax_exempt_supported: false
  business_account_available: true

  # === Shipping ===
  supported_countries:
    - US
    - CA
    - UK
    - DE
  currency: USD
  delivery_options:
    - standard
    - express
    - same_day
  free_shipping_threshold: 35.00
  ships_internationally: true

  # === Loyalty ===
  loyalty_program: "Amazon Prime"
  agent_purchases_earn_points: unknown    # yes | no | unknown
  loyalty_attribution_method: null        # account_linked | referral_code | api | null

  # === Skill Quality ===
  skill_version: "2.1.0"
  generated_by: creditclaw
  generation_tier: premium   # free | premium | indexed
  last_verified: "2026-03-20"
  verification_status: verified   # verified | unverified | outdated

  # === Distribution ===
  shopify_catalog_submitted: false
  google_ucp_submitted: false
---
```

## Field Reference

### Identity Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `vendor` | string | Yes | Unique vendor slug (kebab-case) |
| `domain` | string | Yes | Primary domain of the vendor |
| `display_name` | string | Yes | Human-readable vendor name |
| `logo_url` | string | No | URL to vendor's logo |

### Taxonomy Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `sector` | string | Yes | Sector slug (e.g., `retail`, `electronics`, `industrial`) |
| `sub_sectors` | string[] | No | Category slugs within the sector |
| `gpt_category_ids` | integer[] | No | Google Product Taxonomy numeric IDs this vendor covers |
| `tier` | string | No | Market positioning: `value`, `mid-range`, `premium`, `luxury`, `wholesale`, `marketplace` |

### ASX Score Fields (Scan-Based)

| Field | Type | Required | Description |
|---|---|---|---|
| `asx_score` | integer | Yes | Overall ASX Score (0–100) |
| `asx_clarity` | integer | No | Clarity pillar sub-score (0–35) |
| `asx_speed` | integer | No | Speed pillar sub-score (0–40) |
| `asx_reliability` | integer | No | Reliability pillar sub-score (0–25) |
| `last_scanned` | date | No | ISO date of last scan |
| `scan_tier` | string | No | `free` or `premium` |

### AXS Rating Fields (Crowd-Sourced)

| Field | Type | Required | Description |
|---|---|---|---|
| `axs_rating` | number | No | Overall AXS Rating (1.0–5.0), null until minimum threshold met |
| `axs_search_accuracy` | number | No | Search accuracy dimension (1.0–5.0) |
| `axs_stock_reliability` | number | No | Stock reliability dimension (1.0–5.0) |
| `axs_checkout_completion` | number | No | Checkout completion dimension (1.0–5.0) |
| `axs_rating_count` | integer | No | Total feedback events contributing to the rating |

### API & Programmatic Access Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `api_tier` | string | Yes | `open`, `keyed`, `partnered`, or `private` |
| `api_name` | string | No | Name of the vendor's API (if available) |
| `mcp_endpoint` | string | No | MCP URL (e.g., `https://store.myshopify.com/api/mcp`) |
| `ucp_registered` | boolean | No | Whether this vendor is registered with Google UCP |
| `has_cli` | boolean | No | Whether a CLI tool exists for interacting with this vendor |
| `search_api` | boolean | No | Whether a dedicated search API exists |
| `search_url_template` | string | No | URL template for site search (use `{q}` as placeholder) |

### Checkout Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `auth_required` | boolean | Yes | Whether login is needed to purchase |
| `guest_checkout` | boolean | No | Whether guest checkout is available |
| `checkout_steps` | integer | No | Number of steps in the checkout flow |
| `supported_payment_methods` | string[] | No | List of accepted payment types (`credit_card`, `debit_card`, `paypal`, `apple_pay`, `google_pay`, `gift_card`, `crypto`, etc.) |
| `agentic_payment_protocols` | string[] | No | Supported agentic payment protocols (`x402`, `acp`, `ap2`, `self_hosted_card`) |
| `po_number_supported` | boolean | No | Whether PO numbers can be submitted at checkout |
| `tax_exempt_supported` | boolean | No | Whether tax exemption is available |
| `business_account_available` | boolean | No | Whether business/B2B accounts are offered |

### Shipping Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `supported_countries` | string[] | No | ISO country codes where the vendor ships |
| `currency` | string | No | Primary currency (ISO 4217) |
| `delivery_options` | string[] | No | Available shipping methods (`standard`, `express`, `same_day`, `pickup`, `freight`) |
| `free_shipping_threshold` | number | No | Minimum order amount for free shipping |
| `ships_internationally` | boolean | No | Whether international shipping is available |

### Loyalty Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `loyalty_program` | string | No | Name of the loyalty program (e.g., "Amazon Prime", "Staples Rewards") |
| `agent_purchases_earn_points` | string | No | `yes`, `no`, or `unknown` — whether agent-initiated purchases earn loyalty points |
| `loyalty_attribution_method` | string | No | How agent purchases are attributed: `account_linked`, `referral_code`, `api`, or `null` |

### Skill Quality Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `skill_version` | string | No | Semantic version of the skill file |
| `generated_by` | string | No | Who generated the skill (`creditclaw`, `community`, or vendor slug) |
| `generation_tier` | string | No | `free`, `premium`, or `indexed` |
| `last_verified` | date | No | ISO date when the skill was last tested against the live site |
| `verification_status` | string | No | `verified`, `unverified`, or `outdated` |

### Distribution Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `shopify_catalog_submitted` | boolean | No | Whether products are submitted to Shopify Catalog |
| `google_ucp_submitted` | boolean | No | Whether products are submitted to Google UCP |

---

## Skill Body Structure

Below the frontmatter, the markdown body follows a standard structure. This is a recommendation for consistency — agents parse and execute skills more reliably when the structure is predictable.

```markdown
# {Vendor Name} — Agent Procurement Skill

## Overview
Brief description of the vendor — what they sell, who they serve,
what makes them notable for AI agent procurement.

## Product Discovery

### Via API (Recommended)
Instructions for searching products through an API.
Includes: endpoint, auth, example queries, response format.

### Via Website Search
Fallback instructions for searching the vendor's website directly.
Includes: search URL pattern, expected result format.

## Product Detail
How to get full product information — price, availability, images,
variants (size, color, configuration), shipping options.

## Cart Operations
How to add items to cart, view cart, update quantities, remove items.

## Checkout Flow
Step-by-step checkout instructions.

### Authentication
How to log in or create an account (if required).

### Shipping
How to enter or select shipping address and method.

### Payment
How to enter payment information or use saved payment methods.

### Order Confirmation
What the confirmation looks like, how to capture the order ID.

## Post-Purchase
Order tracking, returns, customer service contact.

## Known Limitations
Issues the agent should be aware of — CAPTCHAs, rate limits,
anti-bot measures, inventory delays, etc.

## Error Handling
What to do when common errors occur — out of stock, payment declined,
session expired, etc.

## Feedback
After your purchase attempt (successful or not), help improve this skill:

POST {feedback_endpoint_url}
Authorization: Bearer <your-api-key>
Content-Type: application/json

{
  "search_accuracy": 4,
  "stock_reliability": 5,
  "checkout_completion": 3,
  "checkout_method": "browser_automation",
  "outcome": "success",
  "comment": "optional — what happened?"
}

Ratings are 1-5. This is optional but helps other agents find reliable vendors.
```

---

## Future: `.well-known/agentic-commerce.json`

> **STATUS: Placeholder — to be developed.**

In addition to the SKILL.md file (which is distributed via catalogs and CLIs), the metadata standard could define a machine-readable JSON manifest that merchants publish at a well-known URL on their own domain:

```
https://example.com/.well-known/agentic-commerce.json
```

This would allow any agent to discover a merchant's capabilities by checking a single URL — similar to how `robots.txt` works for crawlers or `.well-known/openid-configuration` works for OAuth.

The JSON manifest would contain the same fields as the SKILL.md frontmatter, without the markdown body.

**Open questions:**
- Should this be a W3C / IETF standard proposal, or established through adoption?
- How does it relate to `robots.txt`, `llms.txt`, and SKILL.md?
- What is the minimum viable field set?

---

# Part 2: ASX Score & AXS Rating System

## Overview

The measurement framework consists of two complementary systems:

1. **ASX Score (0–100)** — An automated, scan-based score measuring how well a store supports AI shopping agents. Computed from crawling a domain's public surface. Updated per scan.

2. **AXS Rating (1–5)** — A crowd-sourced performance rating from real-world feedback submitted by AI agents and human reviewers after actual purchase attempts. Updated continuously.

The ASX Score tells you how ready a store *should be* based on its technical implementation. The AXS Rating tells you how well it *actually performs* in practice. Together they give a complete picture.

## The Three Pillars

Both the ASX Score and AXS Rating are organized around three pillars that map to the natural flow of an agent-initiated purchase:

```
   Clarity              →         Speed                →        Reliability
   ─────────────────          ──────────────────           ─────────────────────
   Can the agent              Can the agent               Does the end-to-end
   FIND the store             DRILL IN quickly            experience actually
   and UNDERSTAND             to specific products,       WORK when you try
   what's available?          variants, stock,            to complete a real
                              and delivery?               purchase?
```

### Pillar 1: Clarity (Discovery & Metadata Quality)

**The question:** Can the agent find the store, understand its catalog structure, and know what shipping, payment, and loyalty options exist — before it even starts shopping?

**What it covers:**
- Is there structured product data (JSON-LD, Open Graph, Schema.org Product markup)?
- Is there a well-formed sitemap with product URLs?
- Is the site mobile/responsive (agents often use headless viewports)?
- Are shipping options clearly described in metadata or page structure?
- Are payment methods clearly described in metadata or page structure?
- Are loyalty programs described — including whether agent-initiated purchases earn points?
- Is the checkout page structure predictable and well-organized?

### Pillar 2: Speed (Selection & Programmatic Access)

**The question:** Once the agent has found the store, can it quickly and programmatically drill into specifics? Not just "find sneakers" — but "find these sneakers in size 9.5, in brown, check if that exact variant is in stock, and confirm delivery within a week."

**What it covers:**
- Is there a functional product search (site search, API, MCP, CLI)?
- Is there a public API with documented endpoints?
- Is there MCP/UCP support for native agent interaction?
- Can the agent select specific product variants (size, color, configuration) programmatically?
- Can the agent check real-time stock for a specific variant?
- Can the agent get a delivery estimate for a specific address or region?
- How many steps/calls does it take to go from search → specific variant → stock check → delivery estimate?

### Pillar 3: Reliability (Lived Experience)

**The question:** Does it actually work end-to-end in practice? When a real agent tries to search, find the specific item, check out, pay, and receive confirmation — does the whole thing succeed?

**What it covers:**
- Does checkout actually complete without errors?
- Can the agent select the shipping option it wants (not just default)?
- Does the payment method the agent intends to use actually work?
- How many retries does it typically take?
- Does order confirmation arrive correctly?
- Do loyalty points actually accrue for agent-initiated purchases?
- Does the store block or throttle agent traffic during real use?
- Is the product that arrives actually what was ordered (correct size, color, condition)?

### Pillar-to-Measurement Matrix

| | Free Scan (Tier 1) | Premium Scan (Tier 2) | Crowd-Sourced Rating |
|---|---|---|---|
| **Clarity** | Full measurement — metadata, sitemap, page structure | Validation — does metadata match reality? | N/A |
| **Speed** | Capability detection — does the feature exist? | Functional testing — does it actually work? How fast? | N/A |
| **Reliability** | Proxy signals — bot-friendly? guest checkout? | Flow testing — walk checkout, report issues | Real-world results — success rates, failure modes |

---

## ASX Score: Scan-Based Scoring (0–100)

### Signal Breakdown

#### Clarity Signals (35 points)

| Signal | Max Points | What We Check |
|---|---|---|
| **Structured Product Data** | 20 | JSON-LD Product schema, Open Graph product tags, Schema.org markup, meta descriptions with product attributes. Sub-signals include: shipping options described in metadata, payment methods described, loyalty program metadata present. |
| **Sitemap Quality** | 10 | sitemap.xml exists, is valid XML, lists product URLs (not just pages), is linked from robots.txt |
| **Mobile/Responsive** | 5 | Viewport meta tag present, responsive design indicators |

#### Speed Signals (40 points)

| Signal | Max Points | What We Check |
|---|---|---|
| **Search Functionality** | 15 | Site search exists, returns structured results, supports query parameters, search URL template discoverable |
| **API Availability** | 15 | Public REST/GraphQL API detected, OpenAPI/Swagger docs, documented endpoints, developer portal |
| **MCP/UCP Support** | 10 | MCP endpoint, UCP registration, A2A protocol, x402 support, ACP manifest |

#### Reliability Signals (25 points)

| Signal | Max Points | What We Check |
|---|---|---|
| **Checkout Accessibility** | 15 | Guest checkout available, cart/checkout URLs predictable, tax exemption field present, PO number field present |
| **Bot Friendliness** | 10 | robots.txt allows crawling, no CAPTCHA on landing pages, no aggressive bot blocking, reasonable crawl-delay |

**Note:** Reliability signals from a scan are proxy measurements only. True reliability is measured through the crowd-sourced AXS Rating.

#### Potential Expansion Signals (Optional — To Be Validated)

| Signal | Pillar | What It Would Check |
|---|---|---|
| Shipping/payment/loyalty metadata presence | Clarity | Currently folded into Structured Product Data; could be scored separately |
| Variant discoverability | Speed | Does the product page expose variant data (sizes, colors) in structured format? |
| Stock API availability | Speed | Is there a way to check stock programmatically? |
| Delivery estimate API | Speed | Can the agent get a delivery timeframe without starting checkout? |

### Score Labels

| Score Range | Label |
|---|---|
| 0–20 | Poor |
| 21–40 | Needs Work |
| 41–60 | Fair |
| 61–80 | Good |
| 81–100 | Excellent |

### Score Breakdown Structure

Each signal in the breakdown includes a score, maximum, and human-readable detail:

```typescript
interface ASXScoreBreakdown {
  structuredData:        { score: number; max: 20; details: string };
  sitemapQuality:        { score: number; max: 10; details: string };
  searchFunctionality:   { score: number; max: 15; details: string };
  checkoutAccessibility: { score: number; max: 15; details: string };
  apiAvailability:       { score: number; max: 15; details: string };
  botFriendliness:       { score: number; max: 10; details: string };
  mobileResponsive:      { score: number; max: 5;  details: string };
  mcpUcpSupport:         { score: number; max: 10; details: string };
}
```

### Recommendations

After scoring, the system generates actionable recommendations grouped by impact:

```typescript
interface ASXRecommendation {
  signal: string;
  impact: "high" | "medium" | "low";
  title: string;
  description: string;
  potentialGain: number;  // how many points this could add
}
```

Example recommendation:
> **Add JSON-LD Product markup to product pages** (High impact, +12 points)
> This allows any agent to extract structured product data without an API. Include name, price, availability, image, and SKU at minimum.

---

## AXS Rating: Crowd-Sourced Performance Rating (1–5)

### Purpose

The AXS Rating answers: "How well does this store actually perform when agents interact with it?" It's a weighted average from real-world feedback submitted by AI agents and human reviewers after purchase attempts.

### Three Feedback Dimensions

| Dimension | Pillar | What It Measures |
|---|---|---|
| `search_accuracy` (1–5) | Speed | How accurately catalog search returns relevant products |
| `stock_reliability` (1–5) | Reliability | Whether in-stock items are actually available at checkout |
| `checkout_completion` (1–5) | Reliability | How reliably checkout completes without errors |

### Future Feedback Dimensions (To Be Added)

| Dimension | Pillar | What It Would Measure |
|---|---|---|
| `shipping_option_accuracy` | Reliability | Could the agent select the intended shipping method? |
| `payment_method_success` | Reliability | Did the intended payment method work? |
| `loyalty_attribution` | Reliability | Were loyalty points correctly attributed to the agent-initiated purchase? |
| `delivery_accuracy` | Reliability | Was the delivered product correct (size, color, condition)? |

### Feedback Collection

**Endpoint:** `POST /api/v1/bot/skills/{slug}/feedback`

**Request body:**

```json
{
  "search_accuracy": 4,
  "stock_reliability": 5,
  "checkout_completion": 3,
  "checkout_method": "browser_automation",
  "outcome": "success",
  "comment": "optional — what happened?"
}
```

| Field | Type | Required | Values |
|---|---|---|---|
| `search_accuracy` | integer 1-5 | Yes | Did the agent find the right product at the right price? |
| `stock_reliability` | integer 1-5 | Yes | Was the product actually in stock? |
| `checkout_completion` | integer 1-5 | Yes | Did the purchase go through? |
| `checkout_method` | string | Yes | `native_api`, `browser_automation`, `x402`, `acp`, `self_hosted_card`, `crossmint_world` |
| `outcome` | string | Yes | `success`, `checkout_failed`, `search_failed`, `out_of_stock`, `price_mismatch`, `flow_changed` |
| `comment` | string | No | Freeform, max 500 chars |

**Authentication:**
- Authenticated bots (API key): max 1 feedback per brand per hour — weight 1.0
- Anonymous agents: accepted without auth — weight 0.5
- Logged-in humans: via session auth — weight 2.0

**Feedback is embedded in every generated SKILL.md** as an instruction at the end of the file. Agents read the instruction and POST three ratings after each purchase attempt. No SDK, no callback registration — just a plain HTTP request described in the skill's markdown.

### Feedback Data Schema

```sql
CREATE TABLE brand_feedback (
  id                    SERIAL PRIMARY KEY,
  brand_slug            TEXT NOT NULL,
  source                TEXT NOT NULL DEFAULT 'agent',    -- agent | human | anonymous_agent
  authenticated         BOOLEAN NOT NULL DEFAULT false,
  bot_id                TEXT,
  reviewer_uid          TEXT,
  search_accuracy       INTEGER NOT NULL,                 -- 1-5
  stock_reliability     INTEGER NOT NULL,                 -- 1-5
  checkout_completion   INTEGER NOT NULL,                 -- 1-5
  checkout_method       TEXT NOT NULL,
  outcome               TEXT NOT NULL,
  comment               TEXT,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Aggregation Algorithm

Ratings are recomputed periodically (hourly or daily) from the `brand_feedback` table:

```
1. Pull all feedback rows from the last 90 days per brand.

2. Apply recency weighting:
   - ≤ 7 days old:   weight 1.0 (fresh)
   - ≤ 30 days old:  weight 0.8 (recent)
   - ≤ 60 days old:  weight 0.6 (aging)
   - > 60 days old:  weight 0.4 (old; >90 days excluded)

3. Apply source weighting:
   - Human feedback:          weight 2.0
   - Authenticated agent:     weight 1.0
   - Anonymous agent:         weight 0.5

4. Combined weight per entry = recencyWeight × sourceWeight

5. Weighted averages per dimension:
   avgSearch   = Σ(search_accuracy × weight) / Σ(weight)
   avgStock    = Σ(stock_reliability × weight) / Σ(weight)
   avgCheckout = Σ(checkout_completion × weight) / Σ(weight)

6. Final AXS Rating = (avgSearch + avgStock + avgCheckout) / 3

7. Minimum threshold: total weight must be ≥ 5 to publish a score.
   Below threshold → all ratings set to NULL (not zero).
```

### Why Comments Are Valuable

Agent comments are terse and specific: *"Price shown was $24.99, actual cart price was $29.99"* or *"Checkout button selector changed, automation failed."* These are actionable for skill maintainers.

Human comments provide context agents can't: *"Ordered Monday, didn't ship until Friday even though it said 2-day delivery"* or *"The product arrived but was a different model than listed."*

Over time, comments on a brand become a changelog of real-world issues. A merchant can read them to understand *why* their stock reliability is 2.8 — not just that it's low.

---

## How the Two Systems Relate

| | ASX Score | AXS Rating |
|---|---|---|
| **Type** | Automated scan | Crowd-sourced feedback |
| **Scale** | 0–100 | 1.0–5.0 |
| **Updated** | Per scan (on demand) | Continuously (periodic aggregation) |
| **Measures** | Technical implementation quality | Real-world performance |
| **Pillars covered** | Clarity (full), Speed (capability detection), Reliability (proxy signals) | Speed (search accuracy), Reliability (stock, checkout) |
| **Data source** | Crawl + probes + LLM analysis | Agent and human feedback after purchases |
| **Minimum data** | One scan | 5+ weighted feedback events |

A store can have a high ASX Score (great technical setup) but a low AXS Rating (it breaks in practice). Or a low ASX Score (no API, no structured data) but a high AXS Rating (checkout just works via browser automation). The combination tells the full story.

---

## Open Questions

1. **Standards body engagement.** Should these standards be proposed to a formal body (W3C, IETF, schema.org community group)? Or established as de facto standards through adoption first?

2. **`.well-known/agentic-commerce.json` timing.** When should the merchant-published manifest be developed? After scan data validates the field set? Or as a parallel workstream?

3. **Score signal weights.** The current weights (Clarity: 35, Speed: 40, Reliability: 25) are initial proposals. Should they be validated against real scan data before publishing?

4. **Expansion signals.** The "potential expansion" signals (variant discoverability, stock API, delivery estimate API, separate shipping/payment/loyalty metadata scoring) — should any of these be included in v1?

5. **AXS Rating dimension expansion.** Adding `shipping_option_accuracy`, `payment_method_success`, `loyalty_attribution`, and `delivery_accuracy` — when should these be added? They require agents to report more granular data.

6. **Cross-platform adoption.** For the ASX Score to become an industry benchmark, other platforms need to reference it. How do we get agent developers (OpenAI, Anthropic, Google) to consider ASX Score when ranking merchant results?
