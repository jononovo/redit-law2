---
name: "Research: Open Product Feed Sources"
description: All known channels for sourcing product data — open storefront feeds, direct APIs, affiliate networks, scraper services. Read this to understand the landscape before building new ingestion adapters.
---

# Open Product Feed Sources

Product data can be sourced through five distinct channels, each with different coverage, cost, and data quality tradeoffs. This document maps the landscape for building out the Product Index.

---

## Source Categories

| Category | Auth Model | Cost | Coverage | Data Quality |
|---|---|---|---|---|
| Storefront Feeds | None | Free | Per-merchant | Good (catalog data) |
| Direct APIs | API key (partnership) | Free/rev-share | Single mega-merchant | Excellent |
| Affiliate Networks | API key (signup) | Free or paid | Aggregated multi-merchant | Good |
| Scraper Services | API key (paid) | $50–500/mo | Any site | Variable |
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

### Amazon Product Advertising API (PA-API 5.0)

**Status:** Affiliate account created. Should experiment with integration.

**⚠️ Deprecation:** PA-API 5.0 is being deprecated **April 30, 2026**. Amazon is directing developers to the **Creators API** (`https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction`). Any integration should target the Creators API or be built with migration in mind.

**Endpoint:** `POST https://webservices.amazon.com/paapi5/searchitems`

**Natural language search:** The `Keywords` parameter accepts free-text queries — works exactly like Amazon's search bar. `"buy a $2000 gold Rolex"` would go straight into `Keywords`. Amazon's search engine handles the NLP.

**Key parameters:**

| Parameter | What it does |
|---|---|
| `Keywords` | Free-text natural language query |
| `SearchIndex` | Category scope (`Electronics`, `Apparel`, `All`, etc.) |
| `Brand` | Filter to specific brand |
| `MinPrice` / `MaxPrice` | Price range (in cents) |
| `MinReviewsRating` | Minimum star rating (1–4) |
| `SortBy` | `Relevance`, `Featured`, `Price:LowToHigh`, `Price:HighToLow` |
| `DeliveryFlags` | `["Prime"]` for Prime-eligible only |
| `ItemCount` | Max 10 per request |
| `Resources` | Explicit field selection (images, title, price, reviews, etc.) |

**Response:** Returns up to 10 items per request with ASIN, title, price, images, features, buy URL (with affiliate tag), Prime eligibility, star rating. Pagination via `ItemPage`.

**Auth:** AWS Signature Version 4 signing (AccessKey + SecretKey + PartnerTag).

**Rate limit:** 1 request/second initially, scales with affiliate revenue.

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

## 5. Universal Fallbacks (Any Site, No Auth)

These work regardless of platform when no structured feed is available.

### Sitemaps (`/sitemap.xml`)

Most e-commerce sites expose a sitemap. Product URLs typically follow patterns like `/products/`, `/shop/`, `/p/`. Crawl the sitemap, filter for product URLs, then scrape each page for structured data.

### JSON-LD / Schema.org

The `Product` schema is widely adopted for SEO. Even platforms without public APIs render structured data in their HTML. Fields: `name`, `description`, `image`, `sku`, `brand`, `offers.price`, `offers.availability`.

**Extraction:** Parse HTML → find `<script type="application/ld+json">` → filter for `@type: Product`.

### Google Shopping XML Feeds

Many merchants publish a Google Shopping feed (often at `/feed/google-shopping.xml` or similar). XML files following the Google Merchant Center spec. Fields: `g:id`, `g:title`, `g:description`, `g:price`, `g:availability`, `g:image_link`, `g:gtin`, `g:brand`, `g:google_product_category`.

**Discovery:** Check `/robots.txt` for feed URLs, or probe common paths during brand scanning.

### Open Graph Tags

Every product page has `og:title`, `og:description`, `og:image`, `og:url`. Less structured than JSON-LD but universally present. Last-resort fallback.

---

## Detection Strategy

During brand scanning, the pipeline could probe for feed availability and store the result:

```
1. Try /products.json                    → Shopify
2. Try /wp-json/wc/store/v1/products     → WooCommerce
3. Try /rss/products                     → BigCommerce
4. Check for JSON-LD on a product page   → Any platform
5. Check /sitemap.xml for product URLs   → Fallback crawl
```

Store the detected feed type in `brand_index` (new column or in `brandData` JSONB) so the ingestion pipeline knows which adapter to use per merchant.

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

Shopify + WooCommerce storefront feeds cover ~70% of e-commerce. Adding Amazon's direct API and one affiliate network (Rakuten or CJ) covers the mega-merchant and multi-merchant segments. JSON-LD scraping fills the remaining gaps.

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
- **Rate limits under load:** Amazon PA-API starts at 1 req/s. Multiple concurrent agent queries could hit this quickly. Need queuing or caching strategy.

---

## QMD-Style Hybrid Retrieval (Future Direction)

The current retrieval pipeline uses FTS for category matching and vector search for product matching as separate stages. A QMD-inspired approach would fuse these into a unified hybrid pipeline:

1. **BM25 keyword search** against product names/descriptions (exact term matching)
2. **Vector semantic search** against embeddings (conceptual matching)
3. **Re-ranking** — fuse and sort by combined relevance

This could be implemented entirely within PostgreSQL using `ts_rank` (BM25-equivalent) and `<=>` (cosine distance) in a single query, with application-level score fusion. No external dependencies required.

This pattern applies to the **local** product search (Stage 4a). External sources (Amazon, affiliates) handle their own retrieval — we only need to merge and rank their results alongside ours.
