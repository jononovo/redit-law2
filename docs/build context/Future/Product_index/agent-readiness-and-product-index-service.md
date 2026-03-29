# CreditClaw Agent Readiness & Product Index Service

## Vision

A three-tier service that turns any merchant domain into an AI-agent-ready storefront. Starting with a free scan and auto-generated skill file, scaling up to a premium browser-controlled deep audit, and culminating in a full product index with cross-vendor search and submission to Shopify's Catalog MCP and Google's Universal Commerce Protocol (UCP).

---

## Service Tiers

### Tier 1: Free Agent Readiness Scan + Auto-Generated Skill

**What the user does:** Enters a domain (e.g. `staples.com`) on a public CreditClaw page.

**What we do (automated, no login required):**

1. **Public Surface Crawl**
   - Fetch the homepage, sitemap.xml, robots.txt
   - Check for structured data (JSON-LD, Open Graph, Schema.org Product markup)
   - Detect product listing pages (heuristic: `/products`, `/shop`, `/catalog` paths)
   - Check for a public API (look for `/api/`, OpenAPI/Swagger docs, GraphQL endpoints)
   - Check for Shopify MCP endpoint (`/api/mcp`)
   - Detect checkout flow entry points (add-to-cart buttons, cart pages)
   - Check for bot-blocking signals (Cloudflare challenge pages, CAPTCHAs on landing)

2. **Agent Readiness Score (0–100)**

   | Signal | Weight | What We Check |
   |---|---|---|
   | Structured Product Data | 20 | JSON-LD Product schema, Open Graph tags, meta tags |
   | Sitemap Quality | 10 | sitemap.xml exists, lists product URLs, is parseable |
   | Search Functionality | 15 | Site search exists, returns structured results, supports query params |
   | Cart/Checkout Accessibility | 15 | Add-to-cart works without JS-heavy SPA, checkout URL is predictable |
   | API Availability | 15 | Public REST/GraphQL API, documented endpoints |
   | Bot Friendliness | 10 | No aggressive bot blocking, reasonable rate limits, robots.txt allows crawl |
   | Mobile/Responsive | 5 | Responsive design (agents often use headless viewports) |
   | MCP/UCP Support | 10 | Shopify MCP endpoint, UCP integration, A2A protocol support |

3. **Auto-Generated SKILL.md**
   - A markdown file the merchant can place at their domain root (e.g. `staples.com/SKILL.md`)
   - Contains: brand name, sector mapping, product search instructions, checkout flow steps, known limitations
   - Uses information gathered from the public crawl — no secrets, no selectors, no auth
   - Template structure:

   ```markdown
   # {Brand Name} — Agent Procurement Skill
   
   ## Overview
   - Domain: {domain}
   - Sector: {detected_sector}
   - Agent Readiness Score: {score}/100
   
   ## Product Discovery
   - Search URL: {search_url_pattern}
   - Structured Data: {yes/no — what format}
   - API: {endpoint if detected}
   
   ## Checkout Flow
   - Cart URL: {cart_url}
   - Auth Required: {yes/no}
   - Guest Checkout: {yes/no/unknown}
   
   ## Known Limitations
   - {list of detected issues}
   
   ## Recommendations
   - {actionable advice to improve agent readiness}
   ```

4. **Save & Benchmark**
   - Create/update a `brand_index` record with the scan results
   - Store the AXS Rating breakdown (search accuracy, stock reliability, checkout completion)
   - Save a `scan_history` record so we can track score changes over time
   - Show the merchant a report page with their score, comparisons to sector averages, and improvement tips

**Page:** `/scan` — public, no auth required. Form with domain input. Results page at `/scan/[domain]`.

**Tech stack:** Server-side fetch + cheerio for HTML parsing. No browser automation needed.

---

### Tier 2: Premium Browser-Controlled Deep Scan

**What the user does:** Pays for a deep audit of their domain. May provide test credentials.

**What we do (headless browser automation):**

1. **Full Flow Walk-Through**
   - Launch headless browser (Playwright/Puppeteer)
   - Navigate the complete shopping journey: search → product detail → add to cart → checkout
   - Record every page transition, form field, button click, AJAX call
   - Capture screenshots at each step
   - Detect JS frameworks (React, Vue, Angular, vanilla) and rendering patterns (SSR, CSR, hydration)

2. **Deep Signals (not visible from public crawl)**

   | Signal | What We Learn |
   |---|---|
   | Form Structure | Input field names, types, validation rules, required fields |
   | Auth Flow | Login form location, OAuth support, guest checkout availability |
   | Cart Behavior | Session persistence, cart API calls, price calculation |
   | Error Handling | What happens on invalid input, out-of-stock, payment failure |
   | Rate Limiting | How aggressively the site throttles automated requests |
   | Anti-Bot Measures | CAPTCHA types, fingerprinting, WAF behavior |
   | Payment Methods | Supported gateways, saved payment support, Apple/Google Pay |
   | Shipping Options | Delivery estimate APIs, address validation |

3. **Premium Skill File**
   - Much richer than the free version
   - Includes: CSS selectors for key elements, API endpoint signatures, form field mappings
   - Checkout flow as a step-by-step agent instruction set
   - Error handling guidance (what to do when CAPTCHA appears, when item is OOS)
   - Auth flow instructions (if credentials provided)
   - Recommended wait times between steps

4. **Enhanced AXS Rating**
   - The most accurate score possible — based on actual interaction, not just surface signals
   - Includes sub-scores for each checkout step
   - Identifies specific bottlenecks ("Step 3: address form has 14 required fields with no autocomplete")

**Delivery:** PDF report + downloadable SKILL.md + saved to brand_index with `tier: "premium-scanned"`.

**Tech stack:** Playwright (already used in the ecosystem for browser automation). Could run as a background job via queue.

---

### Tier 3: Full Product Index + Cross-Vendor Search + UCP Submission

**What we do:** Weekly crawl of the merchant's entire product catalog, indexed and searchable across all vendors.

#### 3A: Product Crawl & Index

**Crawl sources (in order of preference):**

1. **Merchant API** — If the vendor has a public product API (Shopify Storefront API, custom REST/GraphQL), use it directly. Highest quality, most structured.
2. **Product Feed** — Google Merchant Center XML feed, CSV product exports. Many vendors publish these.
3. **Sitemap + Page Crawl** — Parse sitemap.xml for product URLs, then crawl each page and extract structured data (JSON-LD, microdata).
4. **Deep Crawl (Firecrawl / Exa)** — For vendors with no API or feed, use a managed crawl service to spider the site and extract product data.

**Per-product data captured:**

```
name, description, brand, price, currency, availability,
UPC/GTIN/MPN, image_urls, category (vendor's own),
gpt_category_id (mapped to Google Product Taxonomy),
url, sku, variants (size/color/config),
shipping_info, review_count, review_score
```

**Crawl cadence:** Weekly by default. Daily for high-velocity vendors (Amazon, Walmart). Configurable per merchant.

#### 3B: Vector Search Layer

**Storage:** Each merchant's product catalog gets indexed in a file-based vector database (candidates: zVec, LanceDB, or Chroma with local persistence).

**Architecture:**

```
Agent query: "industrial safety goggles under $20"
         │
         ▼
┌─────────────────────────────┐
│   CreditClaw Search Router  │
│   1. Parse intent           │
│   2. Map to GPT category    │  → GPT ID 2073 (Safety Goggles)
│   3. Identify candidate     │  → Grainger, Uline, Amazon, Home Depot
│      vendors by category    │
│   4. Vector search each     │  → ranked results from each vendor's index
│      vendor's index         │
│   5. Merge & rank           │  → unified results sorted by relevance + price
└─────────────────────────────┘
         │
         ▼
Agent response:
  - Grainger: 3M SecureFit 400 — $8.49, in stock
  - Uline:    Pyramex Intruder — $4.75, in stock, 12-pack
  - Amazon:   DEWALT DPG82-11C — $11.97, Prime eligible
```

**Pre-Index Layer:** A lightweight metadata index (not vector, just relational) that maps:
- Brand names → vendors that carry them
- GPT category IDs → vendors that sell in that category
- Popular product names → pre-computed vendor matches

This pre-index lets the search router skip irrelevant vendor indexes entirely, keeping queries fast even with hundreds of indexed vendors.

**Agent API:**

```
GET  /api/v1/products/search?q={query}&category={gpt_id}&max_price={cents}
POST /api/v1/products/search  { query, filters: { categories, brands, price_range, vendors } }

Response:
{
  "results": [
    {
      "product": { "name": "...", "brand": "...", "gpt_category_id": 2073, "image_url": "..." },
      "listings": [
        { "vendor": "grainger", "price_cents": 849, "in_stock": true, "url": "...", "last_checked": "..." },
        { "vendor": "uline", "price_cents": 475, "in_stock": true, "url": "...", "last_checked": "..." }
      ]
    }
  ],
  "facets": { "categories": [...], "brands": [...], "price_range": { "min": 475, "max": 1197 } }
}
```

#### 3C: UCP Distribution — Shopify Catalog MCP + Google UCP

Once we have a structured product index, we become a **distribution channel** — submitting merchant catalogs to agent discovery platforms that the merchants couldn't access on their own.

##### Shopify Catalog MCP

**What it is:** Shopify's Catalog MCP (`/api/mcp`) exposes a store's products to AI agents (ChatGPT, Claude, Perplexity, etc.) via the Model Context Protocol. Built into every Shopify store by default since Summer '25.

**The gap:** Only Shopify stores get this. Non-Shopify merchants (Home Depot, Grainger, McMaster-Carr, Uline) have no way to make their products discoverable through Shopify's agent ecosystem.

**CreditClaw's role:** We register as a Catalog MCP data source for non-Shopify merchants. When a Shopify-connected agent searches for products, our indexed catalogs show up alongside native Shopify results.

**Integration path:**
- Shopify Catalog API (Winter '26 Edition) is open to all developers via MCP tools or REST API
- We submit product data from our crawled indexes using the Catalog REST API
- Each product includes: title, description, price, availability, GPT category, images, vendor URL
- Products link back to the original vendor's site — CreditClaw is the data bridge, not the merchant of record

**Endpoint:** `POST /api/catalog/products` (Shopify Catalog API)

**Requirements:**
- Shopify Partner account (free)
- Dev Dashboard registration (Winter '26)
- Product data in Shopify's schema format (maps cleanly from our `product_index`)

##### Google Universal Commerce Protocol (UCP)

**What it is:** UCP is an open standard co-developed by Google, Shopify, Etsy, Wayfair, Target, and Walmart. It defines building blocks for agentic commerce — discovery, buying, and post-purchase — so any agent can transact with any merchant through one protocol.

**Current status:** Restricted access. Merchants join via a waitlist: `https://support.google.com/merchants/contact/ucp_integration_interest`

**What UCP enables:**
- Products appear in **Google AI Mode** (in Search) and **Gemini**
- Supports native checkout (agent completes purchase via UCP API) or redirect checkout (agent sends user to merchant site)
- Merchant remains the Merchant of Record — full control of brand, pricing, customer data
- Built on open standards: REST, JSON-RPC, A2A protocol, MCP, Agent Payments Protocol (AP2)

**CreditClaw's role:** Same as with Shopify — we act as the UCP integration layer for merchants who don't have the engineering resources to implement it themselves.

**Integration options (from Google's docs):**

| Option | Description | Best For |
|---|---|---|
| Native Checkout | Integrate checkout logic directly with Google AI | Large merchants with API teams |
| Redirect Checkout | UCP handles discovery, redirects to merchant for payment | Mid-size merchants |
| Platform Integration | Commerce platform (Shopify, BigCommerce) handles UCP | Shopify merchants (already covered) |
| **Aggregator** | Third party submits product data on behalf of merchants | **CreditClaw** |

**The aggregator model is our path.** We submit product feeds from our index to Google's UCP on behalf of the merchants we've crawled and indexed. The merchant gets discovered by Google AI agents without lifting a finger.

**Requirements:**
- Apply via Google's waitlist (currently restricted)
- Merchant Center account linked to product feeds
- Products must have: GTIN/MPN, price, availability, images, category (GPT ID)
- Our index already captures all of these fields

**Spec:** `https://ucp.dev` — open source, GitHub-hosted

##### Distribution Value Proposition

```
Without CreditClaw:
  - Non-Shopify merchant → invisible to Shopify-connected agents
  - Non-Google-integrated merchant → invisible to Gemini/AI Mode

With CreditClaw Tier 3:
  - Any merchant → indexed weekly → submitted to Shopify Catalog + Google UCP
  - Discoverable by every major AI agent platform
  - Zero integration work for the merchant
```

This is the pitch: **"We make your products discoverable by AI agents across every platform — Shopify, Google, ChatGPT, Claude, Gemini — without you building a single integration."**

---

## Database Schema Additions

### Scan History (Tiers 1 & 2)

```sql
CREATE TABLE scan_history (
  id              SERIAL PRIMARY KEY,
  brand_id        INTEGER REFERENCES brand_index(id),
  domain          TEXT NOT NULL,
  scan_tier       TEXT NOT NULL,              -- 'free' or 'premium'
  overall_score   INTEGER NOT NULL,           -- 0-100
  score_breakdown JSONB NOT NULL,             -- per-signal scores
  skill_md        TEXT,                       -- generated SKILL.md content
  screenshots     TEXT[],                     -- S3/R2 URLs (premium only)
  flow_recording  JSONB,                      -- step-by-step flow data (premium only)
  scanned_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  scanned_by      TEXT                        -- 'system' or owner UID
);

CREATE INDEX scan_history_domain_idx ON scan_history(domain);
CREATE INDEX scan_history_brand_id_idx ON scan_history(brand_id);
```

### Product Index (Tier 3)

```sql
CREATE TABLE product_index (
  id              SERIAL PRIMARY KEY,
  upc             TEXT,
  gtin            TEXT,
  mpn             TEXT,
  name            TEXT NOT NULL,
  brand           TEXT,
  description     TEXT,
  gpt_category_id INTEGER,                   -- Google Product Taxonomy ID
  image_urls      TEXT[],
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE product_listings (
  id              SERIAL PRIMARY KEY,
  product_id      INTEGER NOT NULL REFERENCES product_index(id),
  vendor_brand_id INTEGER NOT NULL REFERENCES brand_index(id),
  vendor_sku      TEXT,
  vendor_url      TEXT,
  price_cents     INTEGER,
  currency        TEXT DEFAULT 'USD',
  in_stock        BOOLEAN,
  variants        JSONB,                      -- size/color/config options
  shipping_info   JSONB,                      -- delivery estimates, free shipping threshold
  review_count    INTEGER,
  review_score    NUMERIC(3,2),               -- e.g. 4.50
  last_checked    TIMESTAMP NOT NULL,
  metadata        JSONB
);

CREATE INDEX product_listings_vendor_idx ON product_listings(vendor_brand_id);
CREATE INDEX product_listings_product_idx ON product_listings(product_id);
CREATE INDEX product_index_gpt_cat_idx ON product_index(gpt_category_id);
CREATE INDEX product_index_brand_idx ON product_index(brand);
```

### UCP Submission Tracking (Tier 3C)

```sql
CREATE TABLE ucp_submissions (
  id              SERIAL PRIMARY KEY,
  brand_id        INTEGER NOT NULL REFERENCES brand_index(id),
  platform        TEXT NOT NULL,              -- 'shopify_catalog' or 'google_ucp'
  product_count   INTEGER NOT NULL,           -- how many products submitted
  status          TEXT NOT NULL DEFAULT 'pending', -- pending/submitted/accepted/rejected/error
  submitted_at    TIMESTAMP,
  response        JSONB,                      -- platform response data
  error_message   TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## Page & Route Structure

| Route | Purpose | Auth |
|---|---|---|
| `/scan` | Domain input form + explainer | Public |
| `/scan/[domain]` | Scan results + score + downloadable SKILL.md | Public |
| `/scan/[domain]/history` | Score trend over time | Public |
| `/dashboard/scans` | Manage your scanned domains (owner) | Auth |
| `/dashboard/scans/[domain]/upgrade` | Purchase premium scan | Auth |
| `/dashboard/index` | View your product index status (Tier 3) | Auth |

---

## External Services & Dependencies

| Service | Purpose | Tier |
|---|---|---|
| **Cheerio** | HTML parsing for free scan | 1 |
| **Playwright** | Headless browser for premium scan | 2 |
| **Firecrawl** | Managed web crawling for full product index | 3 |
| **Exa** | AI-powered search/crawl (alternative to Firecrawl) | 3 |
| **zVec / LanceDB / Chroma** | File-based vector DB for product search | 3 |
| **Shopify Catalog API** | Submit products to Shopify's agent ecosystem | 3C |
| **Google UCP API** | Submit products to Google AI Mode / Gemini | 3C |
| **Anthropic Claude** | LLM for skill file generation, category mapping | 1, 2, 3 |

---

## Revenue Model

| Tier | Pricing | Value |
|---|---|---|
| **Tier 1** | Free | Lead generation, brand index growth, basic SKILL.md |
| **Tier 2** | One-time fee per domain | Deep audit, premium SKILL.md, detailed AXS Rating |
| **Tier 3** | Monthly subscription per domain | Weekly crawl, product index, vector search, UCP distribution |

**Tier 3 expansion:** Per-product-query pricing for high-volume agent API consumers (e.g., an agent making 10K product searches/month).

---

## Implementation Roadmap

### Phase 1: Free Scan MVP (Tier 1)
- Build `/scan` page with domain input
- Server-side crawl using fetch + cheerio
- Score calculation engine
- SKILL.md template + generation with LLM
- Save results to `brand_index` + `scan_history`
- Public results page at `/scan/[domain]`

### Phase 2: Score Benchmarking
- Sector average scores (how does this domain compare to others in its sector?)
- Score history tracking
- Email notifications when score changes significantly
- Public leaderboard of most agent-ready vendors

### Phase 3: Premium Scan (Tier 2)
- Playwright-based flow walker
- Screenshot capture at each checkout step
- Form field mapping and selector extraction
- Premium SKILL.md generation (LLM-assisted with browser data)
- Payment integration for scan purchase

### Phase 4: Product Index MVP (Tier 3A)
- Product crawl pipeline (API → Feed → Sitemap → Firecrawl fallback)
- Google Product Taxonomy mapping (LLM-assisted classification)
- `product_index` + `product_listings` tables
- Agent search API (`/api/v1/products/search`)

### Phase 5: Vector Search (Tier 3B)
- Vector DB setup (evaluate zVec vs LanceDB vs Chroma)
- Embedding generation for product names + descriptions
- Pre-index layer for brand/category routing
- Natural language product search

### Phase 6: UCP Distribution (Tier 3C)
- Shopify Catalog API integration (submit product feeds)
- Google UCP waitlist application + integration when access granted
- Submission tracking (`ucp_submissions` table)
- Dashboard showing distribution status per vendor

---

## Competitive Position

**What exists today:**
- **Shopify MCP** — agents can discover Shopify store products. But only Shopify stores.
- **Google UCP** — agents can discover Google-indexed merchant products. But merchants must integrate themselves (or use Shopify/BigCommerce).
- **Firecrawl / Exa** — can crawl sites. But don't categorize, don't maintain indexes, don't submit to platforms.

**What CreditClaw builds:**
- The **universal bridge** between any merchant (Shopify or not) and every agent discovery platform
- A **persistent, categorized product index** mapped to Google's taxonomy
- An **agent readiness scoring system** that creates a quality signal for the ecosystem
- The **SKILL.md standard** — a portable file that any agent can read to learn how to shop at a vendor

**Moat:** Every scan grows the brand index. Every Tier 3 crawl grows the product index. Every agent purchase through CreditClaw feeds data back. The index gets better with every interaction — a classic data flywheel.

---

## Open Questions

1. **SKILL.md as a standard.** Should we propose SKILL.md as an open standard (like robots.txt) that any vendor can place at their root? This could become the "robots.txt for AI shopping agents."
2. **Privacy/consent for Tier 3 crawls.** Do we need explicit merchant consent before crawling and indexing their products? For public data, probably not (same as Google indexing). For submitting to UCP on their behalf, probably yes.
3. **Vector DB choice.** zVec is file-based and lightweight but newer. LanceDB has more tooling. Chroma is the most mature. Need to evaluate based on our scale (initially thousands of products per vendor, eventually millions across all vendors).
4. **Firecrawl vs Exa vs self-hosted.** Cost comparison needed. Firecrawl charges per page. Exa charges per query. Self-hosted Playwright is cheapest but most maintenance.
5. **Google UCP timeline.** Currently restricted. We should apply to the waitlist now so we're ready when access opens. The Shopify integration can ship first since it's already open.
