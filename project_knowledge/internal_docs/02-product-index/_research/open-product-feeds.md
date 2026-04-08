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

### Amazon Product Advertising API

**Status:** Affiliate account already created.

**What it provides:** Product search, lookup by ASIN/UPC, pricing, availability, images, reviews, category browsing. Full Amazon catalog access.

**Auth:** API key + secret from affiliate signup. Request signing (HMAC-SHA256).

**Rate limit:** 1 request/second initially, scales with revenue.

**Value:** Amazon's catalog is the single largest product database. ASIN cross-referencing enables deduplication against other sources. Price/availability data is near-realtime.

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

## QMD-Style Hybrid Retrieval (Future Direction)

The current retrieval pipeline uses FTS for category matching and vector search for product matching as separate stages. A QMD-inspired approach would fuse these into a unified hybrid pipeline:

1. **BM25 keyword search** against product names/descriptions (exact term matching)
2. **Vector semantic search** against embeddings (conceptual matching)
3. **Re-ranking** — fuse and sort by combined relevance

This could be implemented entirely within PostgreSQL using `ts_rank` (BM25-equivalent) and `<=>` (cosine distance) in a single query, with application-level score fusion. No external dependencies required.
