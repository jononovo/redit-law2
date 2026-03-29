# CreditClaw Agent Readiness & Product Index Service

## Vision

A three-tier service that turns any merchant domain into an AI-agent-ready storefront. Starting with a free scan and auto-generated skill file, scaling up to a premium browser-controlled deep audit, and culminating in a full product index with cross-vendor search and submission to Shopify's Catalog MCP and Google's Universal Commerce Protocol (UCP).

All generated skill files follow the **shopy.sh** commerce skill standard — CreditClaw's open specification for teaching AI agents how to shop. Built on top of Vercel's SKILL.md format (skills.sh), shopy.sh extends it with commerce-specific metadata: vendor identity, taxonomy, AXS ratings, API access tiers, checkout capabilities, and distribution status. See `shopy-sh-commerce-skill-standard.md` for the full spec.

### Related Documents

| Document | What It Covers |
|---|---|
| `product-index-taxonomy-plan.md` | Google Product Taxonomy adoption, UCP category model, product index schema |
| `agent-readiness-and-product-index-service.md` | This document — three service tiers, agent gateway, implementation roadmap |
| `shopy-sh-commerce-skill-standard.md` | The shopy.sh open standard — frontmatter schema, skill body structure, catalog, CLI |

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

## Tier 3D: API Analysis, Recommendations & Agent Gateway

The final and most strategically important piece of Tier 3: CreditClaw analyzes every vendor's API landscape — public or private — and either routes agents directly to public endpoints or acts as an authenticated intermediary for private ones.

### The Problem for Agents Today

When an AI agent needs to shop at a vendor, it faces one of these scenarios:

| Scenario | Example | Agent's Problem |
|---|---|---|
| **Public API, well-documented** | Shopify Storefront API | Agent can use it directly — rare and easy |
| **Public API, poorly documented** | Some vendor REST APIs | Agent doesn't know the endpoints, params, or auth flow |
| **Partner/Private API** | Amazon Product Advertising API, Walmart Affiliate API | Requires API keys, affiliate agreements, approval processes — individual agents can't get these |
| **No API at all** | McMaster-Carr, Uline | Agent must scrape or use browser automation |
| **API behind rate limits/paywalls** | Grainger API (requires customer account) | Agent needs credentials the end-user may not have |

An individual agent shouldn't need to negotiate API access with every vendor. CreditClaw solves this by holding the vendor relationships centrally and routing all agent requests through a unified gateway.

### API Analysis Engine (Part of Tier 3 Scan)

During the Tier 3 onboarding of a new vendor, we perform a deep API analysis:

**Discovery Phase:**

1. **Public API Detection**
   - Check for `/api/`, `/graphql`, `/.well-known/`, OpenAPI/Swagger docs
   - Parse developer documentation pages (e.g., `developer.{domain}.com`)
   - Detect Shopify Storefront API (`/api/2024-01/graphql.json`)
   - Detect MCP endpoint (`/api/mcp`)
   - Check for RSS/Atom product feeds
   - Look for affiliate/partner API programs (Amazon PA-API, Walmart Affiliate, etc.)

2. **API Capability Assessment**

   | Capability | What We Check | Score Impact |
   |---|---|---|
   | Product Search | Can we search by keyword, category, UPC? | High |
   | Product Detail | Can we get price, availability, images, description? | High |
   | Cart Operations | Can we add to cart, view cart, get totals? | Medium |
   | Checkout | Can we initiate checkout programmatically? | High |
   | Order Status | Can we track orders after purchase? | Low |
   | Auth Method | OAuth2, API key, session cookie, none? | Medium |
   | Rate Limits | Requests/second, daily quotas | Medium |
   | Data Freshness | Real-time pricing vs. cached/delayed | Medium |

3. **Classification**

   Every vendor API gets classified into one of four access tiers:

   ```
   ┌─────────────────────────────────────────────────────────┐
   │                   API Access Tiers                       │
   ├────────────┬────────────────────────────────────────────┤
   │ OPEN       │ Public, no auth, no rate limits            │
   │            │ → Agent can call directly                  │
   │            │ → Skill file includes endpoint docs        │
   ├────────────┼────────────────────────────────────────────┤
   │ KEYED      │ Public but requires API key                │
   │            │ → Agent registers for own key, or          │
   │            │ → CreditClaw provides key via gateway      │
   ├────────────┼────────────────────────────────────────────┤
   │ PARTNERED  │ Requires affiliate/partner agreement       │
   │            │ → CreditClaw holds the partnership         │
   │            │ → Agent routes through our gateway         │
   ├────────────┼────────────────────────────────────────────┤
   │ PRIVATE    │ No API, or API requires vendor account     │
   │            │ → CreditClaw maintains crawled index       │
   │            │ → Agent searches our index, not vendor API │
   │            │ → Checkout via browser automation (Tier 2) │
   └────────────┴────────────────────────────────────────────┘
   ```

### Recommendations Engine

After analysis, the scan generates vendor-specific recommendations — both for the merchant (to improve agent-readiness) and for CreditClaw's internal routing config.

**Merchant-Facing Recommendations (included in SKILL.md and scan report):**

```markdown
## API Recommendations for {Vendor}

### Current State
- API Access Tier: PARTNERED
- Product Search: Available via Affiliate API (requires API key)
- Checkout: No API — redirect to website only
- Data Freshness: Prices updated every 4 hours

### Recommendations to Improve Agent Readiness
1. **Expose a public product search endpoint.** Even a read-only, rate-limited 
   search API would allow agents to find products without partnership agreements.
   Estimated score impact: +15 points.

2. **Add JSON-LD Product markup to product pages.** This allows any agent to 
   extract structured product data without an API. 
   Estimated score impact: +10 points.

3. **Implement MCP endpoint.** Adding a Shopify-compatible `/api/mcp` endpoint 
   makes your products discoverable by ChatGPT, Claude, and other MCP-aware agents.
   Estimated score impact: +10 points.

4. **Publish a Google Merchant Feed.** Submitting products to Google Merchant Center 
   enables UCP discovery through Google AI Mode and Gemini.
   Estimated score impact: +10 points.
```

**Internal Routing Config (stored per vendor):**

```json
{
  "vendor_slug": "amazon",
  "api_tier": "partnered",
  "capabilities": {
    "product_search": {
      "method": "gateway",
      "gateway_endpoint": "/api/v1/gateway/amazon/search",
      "upstream_api": "Amazon PA-API v5",
      "auth_type": "aws_signature_v4",
      "rate_limit_rpm": 60,
      "data_freshness": "real_time"
    },
    "product_detail": {
      "method": "gateway",
      "gateway_endpoint": "/api/v1/gateway/amazon/product/{asin}",
      "upstream_api": "Amazon PA-API v5",
      "fields": ["price", "availability", "images", "reviews", "variants"]
    },
    "checkout": {
      "method": "redirect",
      "cart_url_template": "https://www.amazon.com/gp/aws/cart/add.html?ASIN.1={asin}&Quantity.1={qty}",
      "notes": "Amazon doesn't allow programmatic checkout — redirect to cart with pre-filled items"
    }
  },
  "fallback": {
    "method": "index",
    "notes": "If gateway is unavailable, fall back to our crawled product index"
  }
}
```

### The CreditClaw Agent Gateway

The gateway is the central routing layer. An agent makes one API call to CreditClaw; we handle the complexity of reaching the vendor — whether that means calling a public API, using our partner credentials for a private API, or searching our local index.

**Architecture:**

```
┌──────────────────────────────────────────────────────────────────┐
│                        AI Agent                                   │
│  "Find me a DeWalt 20V drill under $150"                         │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│              CreditClaw Agent Gateway                             │
│              POST /api/v1/gateway/search                         │
│                                                                   │
│  1. Parse intent → product: "DeWalt 20V drill", max: $150       │
│  2. Map to GPT category → 1167 (Power Drills)                   │
│  3. Look up vendors that carry category 1167:                    │
│     → Home Depot, Lowe's, Amazon, Grainger                      │
│  4. For each vendor, check routing config:                       │
│                                                                   │
│     ┌─────────────────────────────────────────────────────────┐  │
│     │ Home Depot  │ API: PARTNERED │ Route: Gateway proxy     │  │
│     │ Lowe's      │ API: PRIVATE   │ Route: Local index       │  │
│     │ Amazon      │ API: PARTNERED │ Route: Gateway proxy     │  │
│     │ Grainger    │ API: KEYED     │ Route: Gateway proxy     │  │
│     └─────────────────────────────────────────────────────────┘  │
│                                                                   │
│  5. Execute searches in parallel:                                │
│     → Home Depot API (our partner key) → real-time results      │
│     → Amazon PA-API (our affiliate key) → real-time results     │
│     → Grainger API (our API key) → real-time results            │
│     → Lowe's local index → cached results (last crawl: 2 days) │
│                                                                   │
│  6. Normalize, merge, rank, return                               │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Unified Response                                                 │
│  {                                                                │
│    "results": [                                                   │
│      { "name": "DeWalt DCD771C2 20V Drill/Driver Kit",           │
│        "vendor": "home-depot", "price": 11900,                   │
│        "source": "live_api", "in_stock": true },                 │
│      { "name": "DeWalt DCD777C2 20V Brushless Drill",            │
│        "vendor": "amazon", "price": 12999,                       │
│        "source": "live_api", "in_stock": true },                 │
│      { "name": "DeWalt DCD791D2 20V XR Drill",                   │
│        "vendor": "lowes", "price": 14900,                        │
│        "source": "cached_index", "freshness": "2d" }             │
│    ],                                                             │
│    "sources": {                                                   │
│      "live_api": ["home-depot", "amazon", "grainger"],           │
│      "cached_index": ["lowes"]                                   │
│    }                                                              │
│  }                                                                │
└──────────────────────────────────────────────────────────────────┘
```

### Gateway API Design

**Unified Search:**

```
POST /api/v1/gateway/search
Authorization: Bearer {agent_api_key}

{
  "query": "DeWalt 20V drill",
  "filters": {
    "max_price_cents": 15000,
    "category_gpt_id": 1167,
    "vendors": ["home-depot", "amazon"],    // optional: limit to specific vendors
    "in_stock_only": true
  },
  "options": {
    "prefer_live": true,                     // prefer real-time API over cached index
    "max_results_per_vendor": 5,
    "include_variants": false
  }
}
```

**Vendor-Specific Proxy (for agents that know which vendor they want):**

```
GET /api/v1/gateway/{vendor_slug}/search?q={query}&category={gpt_id}
GET /api/v1/gateway/{vendor_slug}/product/{sku_or_id}
GET /api/v1/gateway/{vendor_slug}/categories
POST /api/v1/gateway/{vendor_slug}/cart/add
GET /api/v1/gateway/{vendor_slug}/cart
```

**Response always includes source transparency:**

```json
{
  "source": "live_api",          // or "cached_index" or "crawled_page"
  "source_api": "Amazon PA-API v5",
  "freshness": "real_time",      // or "2h", "1d", "7d"
  "rate_limit_remaining": 45,
  "next_refresh": "2026-03-28T00:00:00Z"
}
```

### Why Agents Don't Need Their Own API Keys

| Without CreditClaw | With CreditClaw Gateway |
|---|---|
| Agent needs Amazon PA-API key (requires affiliate approval, 30-day wait, revenue threshold) | Agent calls `POST /api/v1/gateway/search`, CreditClaw uses its own PA-API credentials |
| Agent needs Walmart Affiliate API key (requires application, website review) | Same — one CreditClaw call, we hold the Walmart relationship |
| Agent needs Grainger account (B2B only, requires business verification) | Same — CreditClaw has a Grainger API account, agent searches through us |
| Agent needs to handle 4 different auth schemes, rate limits, response formats | Agent learns one API: the CreditClaw Gateway. One auth scheme (Bearer token). One response format. |

**The agent's SKILL.md reflects this:**

```markdown
# Amazon — Agent Procurement Skill

## Product Search
- **Method:** CreditClaw Gateway (you do NOT need your own Amazon API key)
- **Endpoint:** POST https://api.creditclaw.com/api/v1/gateway/search
- **Auth:** Your CreditClaw API key (Bearer token)
- **Example:**
  ```json
  { "query": "Brother TN-760 toner", "filters": { "vendors": ["amazon"] } }
  ```
- **Response:** Normalized product data with price, availability, images, Prime eligibility
- **Freshness:** Real-time (via Amazon PA-API)
- **Rate Limit:** 100 requests/minute per CreditClaw API key

## Direct Search (if you have your own Amazon PA-API key)
- **Endpoint:** Amazon Product Advertising API v5
- **Auth:** AWS Signature v4 (your own credentials)
- **Docs:** https://webservices.amazon.com/paapi5/documentation/
```

### Credential Management

CreditClaw holds vendor API credentials centrally. These are never exposed to agents.

```sql
CREATE TABLE vendor_api_credentials (
  id              SERIAL PRIMARY KEY,
  brand_id        INTEGER NOT NULL REFERENCES brand_index(id),
  api_name        TEXT NOT NULL,              -- e.g. "Amazon PA-API v5"
  auth_type       TEXT NOT NULL,              -- oauth2, api_key, aws_sig_v4, session
  credentials     TEXT NOT NULL,              -- encrypted (same encryption as brand_login_accounts)
  encryption_method TEXT NOT NULL,
  rate_limit_rpm  INTEGER,                    -- requests per minute
  rate_limit_daily INTEGER,                   -- requests per day
  status          TEXT NOT NULL DEFAULT 'active',  -- active, expired, suspended
  expires_at      TIMESTAMP,
  metadata        JSONB,                      -- API-specific config (region, marketplace, etc.)
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

**Rate limit pooling:** If we have multiple API keys for a vendor (e.g., multiple Amazon PA-API accounts), the gateway load-balances across them, maximizing throughput for agents.

### Gateway Usage Tracking

Every request through the gateway gets logged for billing, analytics, and vendor relationship management:

```sql
CREATE TABLE gateway_requests (
  id              SERIAL PRIMARY KEY,
  agent_api_key   TEXT NOT NULL,              -- which agent made the request
  owner_uid       TEXT NOT NULL,              -- agent's owner
  vendor_slug     TEXT NOT NULL,              -- which vendor was queried
  request_type    TEXT NOT NULL,              -- search, product_detail, cart_add, etc.
  source_used     TEXT NOT NULL,              -- live_api, cached_index, crawled_page
  upstream_api    TEXT,                        -- which vendor API was called (if live)
  response_time_ms INTEGER,
  result_count    INTEGER,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX gateway_requests_agent_idx ON gateway_requests(agent_api_key);
CREATE INDEX gateway_requests_vendor_idx ON gateway_requests(vendor_slug);
CREATE INDEX gateway_requests_created_idx ON gateway_requests(created_at);
```

### Fallback Chain

For every vendor request, the gateway follows a fallback chain:

```
1. Live API (if vendor API tier is OPEN, KEYED, or PARTNERED)
   ├─ Success → return real-time data, tag source: "live_api"
   └─ Failure (rate limited, timeout, error)
       │
       ▼
2. Cached Index (from last crawl)
   ├─ Hit → return cached data, tag source: "cached_index", include freshness
   └─ Miss (product not in index)
       │
       ▼
3. On-Demand Crawl (if product URL is known)
   ├─ Success → crawl page, extract data, update index, return
   └─ Failure (blocked, timeout)
       │
       ▼
4. Return partial results with explanation
   { "status": "partial", "message": "Real-time data unavailable for Lowe's. 
     Showing cached results from 3 days ago." }
```

### Revenue from the Gateway

| Model | Description |
|---|---|
| **Included in Tier 3** | Gateway access for vendors the agent's owner subscribes to |
| **Per-query pricing** | For agents making high-volume searches (>10K/month), charge per API call |
| **Priority routing** | Premium tier gets live API results first; free tier gets cached index |
| **Vendor-sponsored** | Vendors pay CreditClaw to prioritize their results (like Google Shopping ads, but for agents) |

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

## Revenue Model & Positioning

**The Pitch:** "Ahrefs for Agentic Commerce." Just like Ahrefs lets you scan your domain and get an SEO score with backlink analysis and recommendations, CreditClaw lets you scan your domain and get an Agent Readiness score with checkout flow analysis and recommendations. Except instead of optimizing for Google's search crawler, you're optimizing for AI shopping agents — the future of search and commerce.

| Tier | Pricing | Pitch | Value |
|---|---|---|---|
| **Tier 1** | Free | "See how agent-ready your store is" | Instant score, basic recommendations, auto-generated SKILL.md. Lead generation for CreditClaw, brand index growth. |
| **Tier 2** | One-time fee per domain | "Make it 10x easier for agents to shop at your store" | Deep browser-controlled audit, premium SKILL.md with selectors and flow data, detailed AXS Rating. Actionable recommendations to improve score. |
| **Tier 3** | Monthly subscription | "A retainer for the future of search" | Weekly product crawl, full index, vector search, gateway access, UCP distribution. Stay on the bleeding edge of AI-generated search placement — Shopify Catalog, Google UCP, and every new agent platform as they launch. |
| **Tier 3 VIP** | Custom retainer | "We work with your dev team" | Dedicated support to integrate your API, push products into UCP and agent ecosystems, optimize checkout for agents, and continuously improve your placement in AI-generated search results. |

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

### Phase 7: Agent Gateway (Tier 3D)
- API analysis engine — detect and classify vendor APIs during Tier 3 onboarding
- Vendor routing config system (OPEN/KEYED/PARTNERED/PRIVATE classification)
- Gateway proxy layer — unified `/api/v1/gateway/search` endpoint
- Credential vault (`vendor_api_credentials` table with encryption)
- Rate limit pooling across multiple API keys per vendor
- Fallback chain: live API → cached index → on-demand crawl → partial results
- Gateway usage tracking and billing (`gateway_requests` table)
- First vendor integrations: Amazon PA-API, Shopify Storefront API, one B2B vendor (Grainger or similar)

### Phase 8: Recommendations Engine
- Auto-generated merchant recommendations based on API analysis
- Include recommendations in scan reports and SKILL.md files
- Sector benchmarking ("Your API readiness is in the top 30% of electronics vendors")
- Proactive outreach templates for merchants with low scores

---

## Competitive Position

**What exists today:**
- **Shopify MCP** — agents can discover Shopify store products. But only Shopify stores.
- **Google UCP** — agents can discover Google-indexed merchant products. But merchants must integrate themselves (or use Shopify/BigCommerce).
- **Firecrawl / Exa** — can crawl sites. But don't categorize, don't maintain indexes, don't submit to platforms.
- **Aggregator APIs** (e.g., RapidAPI marketplace) — provide API access but no agent-specific routing, no SKILL.md, no procurement context.

**What CreditClaw builds:**
- The **universal bridge** between any merchant (Shopify or not) and every agent discovery platform
- A **persistent, categorized product index** mapped to Google's taxonomy
- An **agent readiness scoring system** that creates a quality signal for the ecosystem
- The **SKILL.md standard** — a portable file that any agent can read to learn how to shop at a vendor
- An **agent gateway** that eliminates the need for individual agents to negotiate API access with vendors — one key, one format, every vendor

**Moat:** Every scan grows the brand index. Every Tier 3 crawl grows the product index. Every gateway request trains the routing engine. Every agent purchase through CreditClaw feeds data back. The index gets better with every interaction — a classic data flywheel. And the vendor API credentials we accumulate become a network effect: the more vendors we have keys for, the more valuable the gateway is to agents, which attracts more agents, which makes CreditClaw more valuable to vendors as a distribution channel.

---

## Open Questions

1. **shopy.sh as the output standard.** Resolved — all generated skill files follow the shopy.sh commerce skill standard (see `shopy-sh-commerce-skill-standard.md`). The format extends Vercel's SKILL.md (skills.sh) with commerce-specific metadata, so skills are compatible with any agent that supports SKILL.md. Published at `shopy.sh` (domain owned by CreditClaw).
2. **Privacy/consent for Tier 3 crawls.** Do we need explicit merchant consent before crawling and indexing their products? For public data, probably not (same as Google indexing). For submitting to UCP on their behalf, probably yes. Note: the gateway model (Tier 3D) is a vendor-aware partnership — the brand opts in and benefits from agent distribution.
3. **Vector DB choice.** zVec is file-based and lightweight but newer. LanceDB has more tooling. Chroma is the most mature. Need to evaluate based on our scale (initially thousands of products per vendor, eventually millions across all vendors).
4. **Firecrawl vs Exa vs self-hosted.** Cost comparison needed. Firecrawl charges per page. Exa charges per query. Self-hosted Playwright is cheapest but most maintenance.
5. **Google UCP timeline.** Currently restricted. We should apply to the waitlist now so we're ready when access opens. The Shopify integration can ship first since it's already open.
6. **Gateway as a vendor partnership.** The gateway is a distribution service — vendors are aware of and opt into having CreditClaw route agent traffic to their APIs. This is a partnership model, not proxy/sub-licensing. Vendors benefit because agents find and buy their products. Per-vendor terms may still need review for specific API programs (e.g., Amazon PA-API affiliate requirements).
7. **Vendor-sponsored results.** If vendors can pay to boost their placement in gateway search results, we need to clearly label these as "sponsored" to maintain agent trust. Transparent ranking is critical.
8. **Gateway SLA.** What uptime and latency guarantees do we offer agents? If the gateway goes down, agents can't shop. Need to design for high availability from the start.
9. **Credential rotation.** API keys expire, get revoked, or hit rate limits. Need an automated system to monitor credential health, alert when keys are near expiration, and rotate gracefully without interrupting agent traffic.
