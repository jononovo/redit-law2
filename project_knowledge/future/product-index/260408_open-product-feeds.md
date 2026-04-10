---
name: "Research: Open Product Feed Sources"
description: All known channels for sourcing product data — open storefront feeds, direct APIs, affiliate networks, scraper services. Read this to understand the landscape before building new ingestion adapters.
created: 2026-04-07
last_updated: 2026-04-08
status: ongoing
outcome: Documented six source categories, tested Shopify/WooCommerce/Magento detection reliability, confirmed Google Merchant Center is not a viable source. platformTech storage gap identified.
related:
  - 02-product-index/_overview.md
---

# Open Product Feed Sources

Product data can be sourced through six distinct channels, each with different coverage, cost, and data quality tradeoffs. This document maps the landscape for building out the Product Index.

---

## Source Categories

| Category | Auth Model | Cost | Coverage | Data Quality |
|---|---|---|---|---|
| Storefront Feeds | None | Free | Per-merchant | Good (catalog data) |
| Direct APIs | API key (partnership) | Free/rev-share | Single mega-merchant | Excellent |
| Affiliate Networks | API key (signup) | Free or paid | Aggregated multi-merchant | Good |
| Scraper Services | API key (paid) | $50–500/mo | Any site | Variable |
| Google Merchant Center | Merchant's own credentials | N/A | Not accessible to third parties | N/A |
| Universal Fallbacks | None | Free | Any site with SEO | Basic |

---

## 1. Storefront Feeds (No Auth, Per-Merchant)

Public endpoints exposed by e-commerce platforms. No API key, no merchant cooperation needed.

### Platform Matrix

| Platform | Public Endpoint | Format | Max Products | Update Lag | Market Share |
|---|---|---|---|---|---|
| Shopify | `/products.json` | JSON | 250/page, paginated | 5–15 min (CDN) | ~30% |
| WooCommerce | `/wp-json/wc/store/v1/products` | JSON | Paginated | Near-realtime | ~40% |
| BigCommerce | `/rss/products` | XML/RSS | Full catalog | Unknown | ~5% |
| Squarespace | JSON-LD in HTML | JSON-LD | Per-page | Realtime | ~3% |
| Magento | `/rest/V1/products` | JSON | Paginated | Realtime | ~8% (auth required) |
| Wix | None | — | — | — | ~5% (auth required) |

### Shopify (`/products.json`)

**Endpoint:** `https://{domain}/products.json?limit=250&page={n}`

**Fields:** id, title, handle, body_html, vendor, product_type, tags, variants (id, title, price, available, sku, barcode), images (src).

**Caching behavior:**
- Served through Shopify's Fastly CDN
- Cache invalidated automatically on product edit in admin
- Typical staleness: 5–15 minutes
- Inventory changes can lag more than catalog edits
- Quiet stores may cache up to 2 hours

**Per-product endpoint:** `/{domain}/products/{handle}.js` — lightweight (~5KB), includes variant availability. Useful for delta checks.

**Delta strategies:**
- Compare `updated_at` field — skip re-processing if unchanged
- Use `products.json?fields=id,handle,variants` — strips images/descriptions, 70–90% smaller payload
- Per-product `.js` endpoint for availability-only polling

**Rate limiting:** No documented limit on public endpoint, but aggressive scraping gets throttled. 500ms delay between pages is safe.

**Status:** Currently the only implemented ingestion adapter (`scripts/ingest-shopify-products.ts`).

**Shopify UCP Index:** A community skill for Shopify product indexing exists at `https://clawhub.ai/pushmatrix/shop` — documents patterns for crawling Shopify storefronts at scale.

### WooCommerce Store API

**Endpoint:** `https://{domain}/wp-json/wc/store/v1/products`

**Fields:** id, name, slug, description, short_description, prices (price, regular_price, sale_price, currency_code), images, categories, tags, attributes, stock_status, is_purchasable.

**Category browsing:** `/wp-json/wc/store/v1/products/categories` — full category tree, no auth.

**Key differences from Shopify:**
- Returns structured price objects with currency
- Includes `stock_status` (`instock`, `outofstock`, `onbackorder`)
- Category data embedded in product response
- No CDN caching layer — responses are typically fresher

**Detection:** Check for `/wp-json/` path. WooCommerce sites expose `/wp-json/wc/store/v1/` as a discoverable namespace.

### BigCommerce RSS Feed

**Endpoints:**
- `https://{domain}/rss/products` — full catalog
- `https://{domain}/rss/products/featured` — featured items
- `https://{domain}/rss/products/newest` — new arrivals

**Format:** XML/RSS. Includes title, description, link, image. Lacks structured pricing and availability — requires HTML parsing of description field.

**Limitations:** No variant data, no stock status, no GTIN. Useful for catalog discovery but not rich product indexing.

### Squarespace (JSON-LD in HTML)

**Method:** Scrape product pages, extract `<script type="application/ld+json">` blocks.

**Fields (Schema.org Product):** name, description, image, sku, brand, offers (price, priceCurrency, availability, url).

**Detection:** Look for `squarespace.com` in page source or `X-ServedBy: squarespace` header.

**Limitations:** No bulk endpoint — must crawl product pages individually via sitemap.

### Magento / Adobe Commerce (Auth Required)

**Endpoint:** `https://{domain}/rest/V1/products?searchCriteria[pageSize]=250` — bearer token required.

**Workaround:** Magento sites often expose Google Shopping XML feeds, or use JSON-LD on product pages. Sitemap + JSON-LD extraction is more reliable than hoping for API access.

### Wix (Auth Required)

No public product API. Client-side rendered. JSON-LD scraping from product pages works but requires sitemap crawling.

---

## 2. Direct APIs (Partnership/Affiliate Key)

APIs from mega-merchants where we have or can establish a direct relationship. Higher data quality, structured catalogs, but requires signup/approval.

### Amazon Creators API

**Status:** Affiliate account created. Should experiment with integration.

**Docs:** `https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction`

**Operations:** `SearchItems`, `GetItems`, `GetVariations`, `GetBrowseNodes` — same operations as the legacy API, carried over to the new platform.

**Natural language search:** The `keywords` parameter accepts free-text queries — works exactly like Amazon's search bar. `"buy a $2000 gold Rolex"` would go straight into `keywords`. Amazon's search engine handles the NLP.

**Auth:** OAuth 2.0 via Login with Amazon (LwA). Requires Credential ID + Credential Secret (generated in the Creators API settings). Credentials are region-scoped — one set covers all marketplaces in a region.

**Eligibility:** Must be enrolled in Amazon Associates with 10+ qualified sales in the past 30 days. Access is suspended if sales drop below threshold.

**Key parameters (SearchItems):**

| Parameter | What it does |
|---|---|
| `keywords` | Free-text natural language query |
| `searchIndex` | Category scope (`Electronics`, `Clothing`, `All`, etc.) |
| `brand` | Filter to specific brand |
| `minPrice` / `maxPrice` | Price range (in lowest denomination, e.g. 200000 = $2,000) |
| `minReviewsRating` | Minimum star rating (1–5) |
| `sortBy` | `Relevance`, `Featured`, `Price:LowToHigh`, `Price:HighToLow`, `AvgCustomerReviews`, `NewestArrivals` |
| `condition` | `NEW`, `USED`, `COLLECTIBLE`, `REFURBISHED` |
| `deliveryFlags` | `["Prime"]` for Prime-eligible only |
| `itemCount` | Max 10 per request |
| `itemPage` | Pagination |
| `resources` | Explicit field selection — must use `OffersV2` (not legacy `Offers`) |

**Response:** Returns up to 10 items per request with ASIN, title, price (via `OffersV2`), images, features, buy URL (with affiliate tag), Prime eligibility. Pagination via `itemPage`.

**Field naming:** All fields use `lowerCamelCase` (not PascalCase).

**Rate limit:** 1 request/second initially, scales with affiliate revenue.

**Python SDK:**
```python
from amazon_creatorsapi import AmazonCreatorsApi, Country

api = AmazonCreatorsApi(
    credential_id="your_credential_id",
    credential_secret="your_credential_secret",
    version="2.2",
    tag="your-affiliate-tag",
    country=Country.US,
)

results = api.search_items(keywords="gold Rolex watch", max_price=250000)
for item in results.items:
    print(item.item_info.title.display_value)
```

Async variant available via `amazon_creatorsapi.aio.AsyncAmazonCreatorsApi` for parallel queries.

**Why not index Amazon products locally:** Amazon's catalog is too large and changes too frequently to index. The API already provides real-time search with Amazon's own ranking — we should query it live per request rather than trying to replicate it. This is a key architectural decision: Amazon is a **live query source**, not an **index source**.

---

## 3. Affiliate Networks (Aggregated Multi-Merchant)

Affiliate networks aggregate product feeds from thousands of merchants into searchable APIs. Signup is typically free (revenue comes from commission on referred sales). These are high-leverage sources — one integration unlocks thousands of merchants.

### Rakuten Advertising

**Endpoints:**
- Product Search: `https://api.rakutenadvertising.com/productsearch/1.0`
- Offers/Deals: `https://api.rakutenadvertising.com/offers`

**Docs:** `https://developers.rakutenadvertising.com/guides/product_search/reference`

**What it provides:** Product search across Rakuten's merchant network. Fields include product name, price, category, merchant, image, buy URL. Offers endpoint surfaces deals and promotions.

### Commission Junction (CJ)

**Status:** Signup started.

**What it provides:** Product catalog API across CJ's advertiser network. Structured product feeds with pricing, availability, categories, and deep links.

### datafeedr.com

**Cost:** Paid service starting at ~$50/month.

**What it provides:** Aggregates product feeds from multiple affiliate networks (CJ, ShareASale, Rakuten, etc.) into a single searchable API. Acts as a meta-aggregator — one integration covers feeds from many networks.

**Value:** Reduces integration complexity. Instead of building adapters for each affiliate network, datafeedr normalizes everything into a consistent format.

### Other Affiliate Networks

The affiliate ecosystem is large. Additional networks to evaluate:
- **ShareASale** — large merchant network, product datafeed API
- **Awin** — global network, product feed access
- **Impact** — modern affiliate platform, API access to merchant catalogs
- **Partnerize** — enterprise-focused, product-level data

Commission structure means referral revenue is possible even from catalog indexing that leads to purchases.

---

## 4. Scraper Services (Paid, Any Site)

Third-party APIs that handle the scraping infrastructure. Useful for sites without public feeds (Magento, Wix, custom platforms) or for scaling crawls without building proxy infrastructure.

### ScraperAPI

**URL:** `https://www.scraperapi.com/`

**What it provides:** Proxy-based scraping API. Handles CAPTCHAs, IP rotation, JavaScript rendering. You send a URL, get back HTML. Product data extraction is on our side.

**Use case:** Fallback for sites that block direct scraping. Pair with JSON-LD / structured data extraction.

### RapidAPI Marketplace

**URL:** `https://rapidapi.com/`

RapidAPI hosts many purpose-built product/merchant scrape APIs:

- **Walmart Data API** — `https://rapidapi.com/mahmudulhasandev/api/walmart-data` — structured product search, pricing, reviews from Walmart's catalog
- **Etsy API** — `https://rapidapi.com/belchiorarkad-FqvHs2EDOtP/api/etsy-api2` — product listings, shop data, pricing from Etsy

**Pattern:** These are wrappers around specific retailer sites. Useful for accessing mega-merchants that don't offer direct public feeds. Pay-per-request pricing.

---

## 5. Google Merchant Center / Content API — Not a Public Data Source

A common question: can we access merchants' Google Shopping product feeds via Google's APIs?

**Short answer: No.** The Google Content API for Shopping (v2.1) and its replacement (Merchant API, Beta) are strictly authenticated — they require the **merchant's own Google account credentials**. There is no way to query another merchant's product data through Google's APIs. These APIs exist for merchants to manage their own listings, not for third parties to read them.

### What Google Shopping APIs Actually Offer

| API | What It Does | Auth Model | Can We Use It? |
|---|---|---|---|
| Content API v2.1 | Merchants manage their own product listings | OAuth2 (merchant's Google account) | No — requires each merchant's credentials |
| Merchant API (Beta) | Same as Content API, new version | Same | No |
| Google Shopping CSS API | For Comparison Shopping Service partners | Partnership + OAuth2 | Unlikely — requires CSS partner status |
| Manufacturer Center API | Brand owners manage product data | Brand's Google account | No |

### What About Public Google Shopping Feeds?

Merchants submit product feeds to Google Merchant Center, but these feeds stay inside Google's system. They are **not publicly accessible**. Common feed URL patterns (`/feed/google-shopping.xml`, `/feeds/google-shopping.xml`, `/product-feed.xml`) were tested against known merchants (allbirds.com, everlane.com, brooklinen.com) — **none returned valid data**. These feeds are typically submitted directly to Google via the Content API or file upload, not hosted at predictable public URLs.

### Alternatives for Structured Product Data at Scale

| Service | What It Does | Cost | Coverage |
|---|---|---|---|
| SerpApi Google Shopping | Scrapes Google Shopping search results | $50/mo (5K searches) | Any product Google has indexed |
| Diffbot Product API | Extracts structured product data from any URL | ~$300/mo | Any product page |
| UPCitemdb.com | Product lookup by UPC/barcode | Free (100 req/day) | Products with UPCs |
| Open Food Facts | Open product database (food/cosmetics) | Free | Food & cosmetics only |

Of these, **SerpApi is the most interesting** for federated search — it would let us query Google Shopping results as a live source alongside Amazon. But it's a scraper service, not an official API, with corresponding reliability risks.

---

## 6. Universal Fallbacks (Any Site, No Auth)

These work regardless of platform when no structured feed is available.

### Sitemaps (`/sitemap.xml`)

Most e-commerce sites expose a sitemap. Product URLs typically follow patterns like `/products/`, `/shop/`, `/p/`. Crawl the sitemap, filter for product URLs, then scrape each page for structured data.

**Shopify sitemaps are auto-generated** and well-structured: `sitemap_products_1.xml` contains all product URLs with `lastmod` dates. Tested on allbirds.com and brooklinen.com — both return clean sitemapindex files with separate product, collection, and page sitemaps.

### JSON-LD / Schema.org

The `Product` schema is widely adopted for SEO. Even platforms without public APIs render structured data in their HTML. Fields: `name`, `description`, `image`, `sku`, `brand`, `offers.price`, `offers.availability`.

**Extraction:** Parse HTML → find `<script type="application/ld+json">` → filter for `@type: Product`.

### Google Shopping XML Feeds

~~Many merchants publish a Google Shopping feed at public URLs.~~ **Testing showed this is rare.** Most merchants submit feeds directly to Google Merchant Center via the Content API or file upload — the feeds are not hosted at public URLs. Probing common paths (`/feed/google-shopping.xml`, etc.) returned 404 on all tested sites.

**Better approach:** Focus on the merchant's own native feed (Shopify `/products.json`, WooCommerce Store API, etc.) rather than hunting for Google Shopping XML exports.

### Open Graph Tags

Every product page has `og:title`, `og:description`, `og:image`, `og:url`. Less structured than JSON-LD but universally present. Last-resort fallback.

---

## Detection Strategy

### Current State: `platformTech` Is Detected But Not Stored

The scan pipeline asks Perplexity to identify the e-commerce platform (`platformTech` field in `auditSite()`). This is a required field in the audit schema and Perplexity returns it. **However, `buildVendorSkillDraft()` in `scan-utils.ts` does not include `platformTech` in the VendorSkill object stored as `brand_data`.** The `skill-json.ts` reads `brandData.platformTech` for `checkout.platform`, but it's always `null`.

**Fix:** Add `platformTech` to the VendorSkill draft, or persist it as a top-level column on `brand_index`.

### Perplexity Detection vs. Direct HTTP Probing

Perplexity-based detection is a "best guess" based on Perplexity's knowledge of the site. It has no way to actually probe endpoints. For accurate feed detection, direct HTTP fingerprinting is more reliable.

### Live Test Results (April 2026)

**Shopify `/products.json` endpoint — inconsistent even across known Shopify sites:**

| Domain | `/products.json` | Shopify Headers | `_shopify_` Cookies | Actual Platform |
|---|---|---|---|---|
| allbirds.com | ✅ 200 | ✅ 9 matches | ✅ 5 | Shopify |
| brooklinen.com | ✅ 200 | ✅ 9 matches | ✅ 5 | Shopify |
| everlane.com | ✅ 200 | ✅ 9 matches | ✅ 5 | Shopify |
| skullcandy.com | ✅ 200 | ✅ Shopify headers | ✅ cookies | Shopify |
| gymshark.com | ❌ 403 | ✅ cdn.shopify.com in CSP | ❌ | Headless Shopify (Next.js frontend) |
| bombas.com | ❌ 404 | ❌ none | ❌ | Migrated off Shopify or heavily customized |
| chubbies.com | ✅ 200 (on bare domain) | ✅ 3 matches | ✅ 1 | Shopify |
| ruggable.com | ❌ 404 | ❌ none | ❌ | Migrated off Shopify |

**Key finding:** `/products.json` alone is unreliable — only 5/8 sites returned 200. Header fingerprinting (`cdn.shopify.com` in Link headers, `_shopify_` cookies) catches headless Shopify stores too. The most reliable Shopify detection is: `cdn.shopify.com` appears anywhere in response headers.

**WooCommerce Store API — mostly broken for public access:**

| Domain | `/wp-json/wc/store/v1/products` | `/wp-json/` |
|---|---|---|
| flavorgod.com | ❌ 400 | ❌ 400 |
| flaviar.com | ❌ 400 | ❌ 400 |

The WooCommerce Store API frequently returns 400 errors even on known WooCommerce sites. The `/wp-json/` root endpoint is more reliable for detection (returns 200 on WordPress sites), but product data access varies by site configuration.

**Magento detection — HTML fingerprinting works:**

Magento sites reliably contain `Magento_`, `requirejs-config`, or `mage` in their HTML source. No reliable header-based detection.

### Recommended Detection Pipeline

During brand scanning, add a lightweight HTTP probe step (parallel with existing Perplexity calls):

```
1. Fetch homepage headers (HEAD request, ~100ms):
   ├─ cdn.shopify.com in headers?        → feedType = "shopify"
   ├─ _shopify_ in set-cookie?           → feedType = "shopify"  
   └─ x-powered-by: Next.js + shopify?   → feedType = "shopify_headless"

2. If feedType == "shopify", verify /products.json (HEAD, ~100ms):
   ├─ 200 + content-type: application/json? → feedAvailable = true
   └─ 403/404?                              → feedAvailable = false (headless or blocked)

3. If no Shopify indicators, try WP detection:
   ├─ /wp-json/ returns 200?             → feedType = "woocommerce"
   └─ Magento_ in HTML?                  → feedType = "magento"

4. Fallback: check sitemap.xml for product URLs → feedType = "sitemap_crawl"
```

Store `feedType` and `feedAvailable` in `brand_data` alongside `platformTech`.

### Additional Shopify Endpoints Discovered

Beyond `/products.json`, Shopify exposes several other useful public endpoints:

| Endpoint | Returns | Auth | Notes |
|---|---|---|---|
| `/products.json?limit=250&page={n}` | Full product catalog | None | Primary ingestion endpoint (already used) |
| `/collections.json` | All collections with metadata | None | Useful for category mapping |
| `/collections/all.atom` | Product Atom feed | None | Alternative format, includes all products |
| `/search/suggest.json?q={query}&resources[type]=product` | Real-time search results | None | Returns title, price, image, URL — lightweight, fast |
| `/products/{handle}.js` | Single product detail | None | ~5KB, includes variant availability |

**`/search/suggest.json` is particularly valuable** — it's a built-in search API that returns structured product data. Tested and working on all Shopify sites that have it enabled. Returns: title, price, compare_at_price, image, URL, body, tags, vendor, type, availability. Could be used for real-time search without needing to index products at all.

---

## Availability-Only Updates

Full re-ingestion is expensive (embedding generation). For stock/price freshness, lighter approaches exist:

| Platform | Lightweight Check | What It Returns |
|---|---|---|
| Shopify | `/products/{handle}.js` | Single product with variant availability, ~5KB |
| Shopify | `/products.json?fields=id,variants` | IDs + availability only, 70–90% smaller |
| WooCommerce | Store API with `include` filter | Specific product IDs only |
| Any | JSON-LD re-scrape | `offers.availability` field |

**Pattern:** Full ingestion weekly. Availability-only refresh daily or more frequently. Only re-embed when `updated_at` changes or product title/description differs from stored version.

---

## Coverage & Priority

| Source | Coverage | Effort to Build | Priority |
|---|---|---|---|
| Shopify `/products.json` | ~30% of e-commerce | Built | ✅ Done |
| WooCommerce Store API | ~40% of e-commerce | Low (similar to Shopify adapter) | High |
| Amazon Product API | Single mega-merchant, massive catalog | Medium (auth + signing) | High |
| Affiliate networks (Rakuten, CJ) | Thousands of merchants per network | Medium | High |
| BigCommerce RSS | ~5% of e-commerce | Low (XML parsing) | Medium |
| JSON-LD scraping | Any site with SEO | Medium | Medium (universal fallback) |
| Scraper services | Any site | Low (API wrapper) | Low (cost per request) |
| datafeedr | Meta-aggregator | Low | Evaluate ROI at $50/mo |

Shopify storefront feeds are the strongest starting point — high reliability, no auth, rich data. WooCommerce coverage is theoretically large (~40% market share) but the Store API is unreliable in practice. Amazon's Creators API and one affiliate network (Rakuten or CJ) cover the mega-merchant and multi-merchant segments. JSON-LD scraping fills the remaining gaps. Google Shopping XML feeds are **not** a viable source — they're private to Google Merchant Center.

---

## Existing Infrastructure Readiness

Before building new capabilities, it's worth mapping what already exists that directly supports the plans in this document. This section was compiled from a codebase audit (April 2026).

### What's Already Built

**Recommend API pipeline is stage-tracked.** The response includes `stages_executed` (e.g. `["intake", "categories", "merchants", "products"]`) and timing metadata (`query_time_ms`, `intake_time_ms`). Federated sources would be additional stages (`"amazon"`, `"affiliate"`) — the response shape doesn't need to change.

**POST endpoint already supports skipping stages.** `POST /api/v1/recommend` accepts pre-resolved `category_ids` and skips Perplexity entirely. This maps directly to the SDK pattern — an agent that already knows what category it wants can go straight to merchant ranking and product search without NLP overhead.

**Bot API auth is consistent and ready.** Bots authenticate with `Bearer cck_live_...` keys. The `withBotApi` middleware handles auth, rate limiting, and bot status checks. A product search endpoint for external agents would use the same middleware — no new auth patterns needed.

**The Registry API is a pattern for product search.** `GET /api/v1/registry` is a public, searchable, filterable, cached JSON endpoint with its own schema (`$schema: "https://shopy.sh/schemas/registry/v1"`). A product search endpoint would follow the same conventions (caching headers, pagination, consistent JSON structure).

**`product_feed` scoring can drive auto-ingestion priority.** The ASX rubric's `product_feed` signal (10 pts, Clarity pillar) evaluates sitemap quality and product URL discoverability. Brands that score high are the best candidates for automatic product ingestion — they have accessible, structured data. This score is already computed and stored.

**skill.json already exposes platform type to agents** — under `checkout.platform`. When the `platformTech` storage gap is fixed (see Detection Strategy), agents consuming skill data will know if a merchant is Shopify-based. An agent could crawl products itself using the right approach based on this data, or it could go through our search API.

### What's Missing

**No product storage abstraction.** Product queries use raw SQL in `recommend/route.ts`. There's no `searchProducts(query, brandIds)` method in `server/storage/`. Federated search and a dedicated product search endpoint would both benefit from centralizing this.

**No streaming anywhere in the API.** The recommend API returns a single synchronous JSON response. SSE/streaming would be a new pattern for the codebase, but Next.js App Router supports it natively via `ReadableStream`.

**`platformTech` is detected but not persisted.** See Detection Strategy section above. The audit captures it, but `buildVendorSkillDraft()` drops it before storage.

**No external source integrations.** Amazon Creators API, affiliate networks, and SerpApi are not yet integrated. Product search is local-only (pgvector).

### Stack Alignment

Nothing in these plans conflicts with the existing stack. It's all Next.js App Router, Postgres/Drizzle, pgvector. The federated search, streaming, and SDK features would be extensions of patterns already in use — not a new stack. The main new things are the SSE streaming pattern and the external API integrations.

---

## Federated Product Search — The Aggregation Problem

The product index will pull from multiple sources: our own `product_listings` table, Amazon's API, possibly affiliate network APIs. A query like `"buy a $2000 gold Rolex"` needs to hit all of them and return a unified, ranked result set — fast.

### The Core Challenge

Some sources are **indexed** (our Postgres DB — milliseconds to query) and some are **live** (Amazon API — 200–500ms round-trip). Waiting for all sources to respond before returning anything makes the whole system as slow as the slowest API.

### Three Merging Strategies

| Strategy | How It Works | Latency | Freshness |
|---|---|---|---|
| **Index-time** | Pre-ingest everything into one index, query locally | Fast (~50ms) | Stale (hours/days) |
| **Search-time** | Fan out to all sources live, merge results | Slow (500ms+) | Real-time |
| **Hybrid** | Local index for our data + live queries for external APIs | Medium | Mixed |

**Hybrid is the right model for us.** We index Shopify/WooCommerce products locally (they don't change minute-to-minute). We query Amazon and affiliate APIs live (their catalogs are too large and dynamic to index). We merge the results.

### Progressive / Streaming Response Pattern

Instead of waiting for all sources to respond before returning, stream results as they arrive:

```
Agent sends query: "buy a $2000 gold Rolex"
    │
    ├─ T+0ms:   Parse query, extract intent (category: watches, brand: Rolex, price: ~$2000)
    │
    ├─ T+10ms:  Fire in parallel:
    │            ├─ Local pgvector search (product_listings)
    │            ├─ Amazon SearchItems API
    │            └─ Affiliate network API (if applicable)
    │
    ├─ T+30ms:  Local results ready → stream first batch (3–5 products from our index)
    │
    ├─ T+300ms: Amazon responds → merge, re-rank, stream additional products
    │
    └─ T+500ms: Affiliate API responds → merge final batch, stream remaining
```

**Implementation options:**
- **SSE (Server-Sent Events):** Endpoint streams JSON chunks as each source responds. Agent/client renders progressively.
- **Two-phase response:** Return local results immediately with a `partial: true` flag. Client polls or subscribes for the full merged set.
- **Timeout-based cutoff:** Wait up to N ms (e.g. 400ms) for all sources. Return whatever has responded. Late results are discarded or cached for next query.

### Unified Ranking Across Sources

Products from different sources have different relevance signals. A normalized scoring model:

| Signal | Source | Weight |
|---|---|---|
| Semantic similarity | Local pgvector cosine distance | High |
| Amazon relevance rank | Position in Amazon's search results | High |
| Price match to query | Parsed from query intent | Medium |
| Brand match | Exact brand match from query | High |
| ASX score of merchant | Brand Index (local sources only) | Low |
| Availability | In-stock flag | Binary filter |

**Normalization:** Each source returns items with a position (rank 1–10). Normalize to a 0–1 score: `score = 1 - (rank - 1) / max_rank`. Then apply source-specific weights and merge into a single ranked list.

**Deduplication:** Same product from multiple sources (e.g. a Rolex listed on our indexed merchant AND on Amazon). Match by GTIN/UPC if available, fallback to fuzzy title + brand matching. Keep the listing with the best price or highest source trust.

### What This Looks Like for the Recommend API

The current `POST /api/v1/recommend` pipeline would extend to:

```
Stage 1 — Query Understanding (existing)
Stage 2 — Category Resolution (existing)
Stage 3 — Merchant Ranking (existing, for local sources)
Stage 4 — Product Search (extended):
    4a. Local: pgvector lateral join (existing, ~30ms)
    4b. Amazon: SearchItems with Keywords + filters (parallel, ~300ms)
    4c. Affiliate: network API call (parallel, ~400ms)
Stage 5 — Merge & Rank (new):
    Normalize scores, deduplicate, sort, return unified list
```

Stages 4a/4b/4c run in parallel. Stage 5 can begin as soon as any source responds (progressive merge).

### Open Questions

- **How many external sources before latency becomes unacceptable?** 2–3 live APIs in parallel is probably the practical limit. Beyond that, consider pre-indexing.
- **Should we cache external API results?** Short TTL cache (5–15 min) for identical queries would reduce API calls and latency on repeat searches.
- **Commission/revenue model:** Amazon affiliate links earn commission. Affiliate network links earn commission. Should ranking factor in revenue potential? (Probably not for trust reasons, but worth noting.)
- **Rate limits under load:** Amazon Creators API starts at 1 req/s. Multiple concurrent agent queries could hit this quickly. Need queuing or caching strategy.

---

## SDK & Developer Experience — Product Search as a Tool Call

The product search API isn't just internal infrastructure — it's an external product. Any agent, platform, or company that wants to offer product discovery to their users should be able to plug in with minimal effort, the same way agents already integrate web search tool calls.

### The Mental Model

Web search tools work like this: agent detects informational intent → extracts query → calls search API → renders results. Product search should work the same way:

```
Agent detects purchase intent ("buy", "find", "shop for", "I need a...")
    → Extracts product query ("$2000 gold Rolex")
    → Calls product search API (single tool call)
    → Receives structured product results
    → Renders using provided component (or custom UI)
```

The developer adds one tool definition to their agent, and their users can now shop through the agent. No product database, no feed management, no ranking logic — we handle all of it.

### Tool Call Definition (What the Developer Adds)

```json
{
  "name": "search_products",
  "description": "Search for products to buy. Use when the user wants to purchase, find, or compare products.",
  "parameters": {
    "query": { "type": "string", "description": "Natural language product search query" },
    "max_price": { "type": "number", "description": "Maximum price in USD (optional)" },
    "brand": { "type": "string", "description": "Specific brand filter (optional)" }
  }
}
```

### API Response Schema

The API returns a normalized product list regardless of which sources contributed:

```json
{
  "query": "gold Rolex watch",
  "results": [
    {
      "id": "prod_abc123",
      "name": "Rolex Submariner Date 41mm Gold",
      "brand": "Rolex",
      "price": { "amount": 1999.00, "currency": "USD" },
      "image_url": "https://...",
      "product_url": "https://...",
      "source": "brand_index",
      "merchant": { "name": "Bob's Watches", "domain": "bobswatches.com" },
      "in_stock": true,
      "relevance_score": 0.94
    }
  ],
  "partial": false,
  "sources_queried": ["brand_index", "amazon", "rakuten"]
}
```

### Streaming vs. Single Response

Two modes, developer's choice:

**Single response (simple):** Wait up to ~1.5s for all sources, return one complete JSON payload. Developer renders all at once. Simpler to integrate, slightly slower.

```
GET /api/v1/products/search?q=gold+rolex&mode=complete
→ 200 OK (after ~1s)
→ { "results": [...all products...], "partial": false }
```

**Streaming (progressive):** SSE stream that sends batches as each source responds. Developer renders incrementally — first batch appears in ~50ms, more arrive over the next second.

```
GET /api/v1/products/search?q=gold+rolex&mode=stream
→ 200 OK (SSE)
→ event: products
→ data: { "results": [...local results...], "partial": true, "source": "brand_index" }
→
→ event: products
→ data: { "results": [...amazon results...], "partial": true, "source": "amazon" }
→
→ event: done
→ data: { "total": 12, "sources_completed": ["brand_index", "amazon", "rakuten"] }
```

### Drop-In UI Component

Provide a ready-made component (React/shadcn) that handles the full rendering lifecycle:

1. **Skeleton cards** appear immediately on query (3–4 placeholder cards with pulsing animation)
2. **First batch** populates — text content fills in instantly (name, price, merchant), image starts loading
3. **Images load** asynchronously — each card transitions from placeholder to loaded image independently
4. **More cards** append to the row as external sources respond — smooth animation, no layout shift
5. **Final state** — all cards rendered, all images loaded, streaming complete

```
┌──────────────────────────────────────────────────────────────┐
│  T+0ms:   [░░░░░░] [░░░░░░] [░░░░░░] [░░░░░░]              │
│           skeleton  skeleton  skeleton  skeleton              │
│                                                              │
│  T+50ms:  [Rolex ] [Cartier] [Omega  ] [░░░░░░]              │
│           $1,999   $2,100    $1,850    skeleton               │
│           🖼 loading 🖼 loading 🖼 loaded                      │
│                                                              │
│  T+400ms: [Rolex ] [Cartier] [Omega  ] [Rolex  ] [Tudor   ] │
│           $1,999   $2,100    $1,850    $2,200    $1,750      │
│           🖼 loaded  🖼 loaded  🖼 loaded  🖼 loading 🖼 loading │
│           local     local     local     amazon    amazon     │
└──────────────────────────────────────────────────────────────┘
```

The component would be:
- **Self-contained** — single import, works with any React app using shadcn/Tailwind
- **Configurable** — dark/light mode, card style, grid vs. row layout, max cards to show
- **SSE-aware** — handles streaming natively, with graceful fallback to single-response mode
- **Image-optimized** — lazy loading, placeholder blur, progressive decode

### SDK Distribution

| Package | What It Contains |
|---|---|
| `@creditclaw/product-search` | API client (typed, SSE support, auth) |
| `@creditclaw/product-ui` | React component (shadcn cards, skeleton, streaming) |
| Tool definition JSON | Copy-paste tool call definition for any agent framework |

### Agent Platform Plugins

We are building first-party plugins for major agent ecosystems so adoption is frictionless:

- **OpenClaw plugin** — product search as a native OpenClaw tool. Any OpenClaw user can enable it and their agent gets shopping capabilities immediately.
- **Claude agent plugin** — same integration for the Claude agent ecosystem.

These plugins wrap the same API and component — the plugin handles auth, tool registration, and rendering within each platform's conventions. Developers in those ecosystems don't need to build anything — they just enable the plugin.

### Value Proposition for Integrators

- **Zero infrastructure** — no product database, no feed management, no ML models
- **One tool call** — agent detects intent, sends query, gets products
- **Drop-in UI** — pre-built component renders results with streaming, skeletons, lazy images
- **Multi-source** — searches across indexed merchants + Amazon + affiliate networks in one call
- **Affiliate revenue** — purchases through the component generate commission (shared or pass-through)
- **Platform plugins** — pre-built plugins for OpenClaw and Claude agents for instant adoption within those ecosystems

---

## QMD-Style Hybrid Retrieval (Future Direction)

The current retrieval pipeline uses FTS for category matching and vector search for product matching as separate stages. A QMD-inspired approach would fuse these into a unified hybrid pipeline:

1. **BM25 keyword search** against product names/descriptions (exact term matching)
2. **Vector semantic search** against embeddings (conceptual matching)
3. **Re-ranking** — fuse and sort by combined relevance

This could be implemented entirely within PostgreSQL using `ts_rank` (BM25-equivalent) and `<=>` (cosine distance) in a single query, with application-level score fusion. No external dependencies required.

This pattern applies to the **local** product search (Stage 4a). External sources (Amazon, affiliates) handle their own retrieval — we only need to merge and rank their results alongside ours.
