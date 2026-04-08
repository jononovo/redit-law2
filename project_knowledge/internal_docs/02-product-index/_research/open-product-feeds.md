---
name: "Research: Open Product Feed Sources"
description: Platform-by-platform analysis of publicly accessible product data endpoints. What's available without auth, update frequency, format, and ingestion strategy.
---

# Open Product Feed Sources

Survey of public (unauthenticated) product data endpoints across major e-commerce platforms. Focused on what an external indexer can access without merchant cooperation or API keys.

## Platform Matrix

| Platform | Public Endpoint | Auth | Format | Max Products | Update Lag |
|---|---|---|---|---|---|
| Shopify | `/products.json` | None | JSON | 250/page, paginated | 5–15 min (CDN) |
| WooCommerce | `/wp-json/wc/store/v1/products` | None | JSON | Paginated | Near-realtime |
| BigCommerce | `/rss/products` | None | XML/RSS | Full catalog | Unknown |
| Squarespace | JSON-LD in HTML | None (scrape) | JSON-LD | Per-page | Realtime |
| Magento | `/rest/V1/products` | Bearer token | JSON | Paginated | Realtime |
| Wix | None | OAuth | JSON | — | — |

---

## Tier 1 — No Auth, Structured JSON

### Shopify (`/products.json`)

**Endpoint:** `https://{domain}/products.json?limit=250&page={n}`

**Available fields:** id, title, handle, body_html, vendor, product_type, tags, variants (id, title, price, available, sku, barcode), images (src).

**Useful variant fields:** `available` (boolean), `barcode` (often GTIN/UPC), `sku`, `price`.

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

**Market share:** ~30% of all e-commerce sites. Dominant in DTC brands.

### WooCommerce Store API (`/wp-json/wc/store/v1/products`)

**Endpoint:** `https://{domain}/wp-json/wc/store/v1/products`

**Available fields:** id, name, slug, description, short_description, prices (price, regular_price, sale_price, currency_code), images, categories, tags, attributes, stock_status, is_purchasable.

**Category browsing:** `/wp-json/wc/store/v1/products/categories` — full category tree, no auth.

**Key differences from Shopify:**
- Returns structured price objects with currency
- Includes `stock_status` (`instock`, `outofstock`, `onbackorder`)
- Category data embedded in product response
- No CDN caching layer — responses are typically fresher

**Detection:** Check for `/wp-json/` path. WooCommerce sites also expose `/wp-json/wc/store/v1/` as a discoverable namespace.

**Market share:** ~40% of all e-commerce sites (WordPress ecosystem). Heavily represented in SMB.

---

## Tier 2 — No Auth, Non-JSON

### BigCommerce RSS Feed

**Endpoints:**
- `https://{domain}/rss/products` — full catalog
- `https://{domain}/rss/products/featured` — featured items
- `https://{domain}/rss/products/newest` — new arrivals

**Format:** XML/RSS. Includes title, description, link, image. Lacks structured pricing and availability — requires HTML parsing of description field.

**Limitations:** No variant data, no stock status, no GTIN. Useful for catalog discovery but not for rich product indexing.

**Market share:** ~5% of e-commerce. Stronger in mid-market/enterprise.

### Squarespace (JSON-LD in HTML)

**Method:** Scrape product pages, extract `<script type="application/ld+json">` blocks.

**Available fields (Schema.org Product):** name, description, image, sku, brand, offers (price, priceCurrency, availability, url).

**Detection:** Look for `squarespace.com` in page source or `X-ServedBy: squarespace` header.

**Limitations:** No bulk endpoint — must crawl product pages individually via sitemap. Rate-sensitive.

**Market share:** ~3% of e-commerce. Concentrated in creative/lifestyle brands.

---

## Tier 3 — Auth Required

### Magento / Adobe Commerce

**Endpoint:** `https://{domain}/rest/V1/products?searchCriteria[pageSize]=250`

**Auth:** Bearer token required. Merchants must explicitly create an integration or enable anonymous guest access (most don't).

**Workaround:** Magento sites often expose a Google Shopping XML feed at a custom URL, or use structured data (JSON-LD) on product pages. Sitemap crawl + JSON-LD extraction is more reliable than hoping for API access.

**Market share:** ~8% of e-commerce. Enterprise-heavy.

### Wix

**No public product API.** Everything requires OAuth through Wix's proprietary SDK. Product data is rendered client-side via JavaScript — standard HTML scraping returns empty shells.

**Workaround:** Wix sites do render JSON-LD for SEO. Scraping `<script type="application/ld+json">` from product pages works but requires sitemap crawling.

**Market share:** ~5% of e-commerce.

---

## Universal Fallbacks

These work regardless of platform:

### Sitemaps (`/sitemap.xml`)

Most e-commerce sites expose a sitemap. Product URLs typically follow patterns like `/products/`, `/shop/`, `/p/`. Crawl the sitemap, filter for product URLs, then scrape each page for structured data.

### JSON-LD / Schema.org

The `Product` schema is widely adopted for SEO. Even platforms without public APIs render structured data in their HTML. Fields: `name`, `description`, `image`, `sku`, `brand`, `offers.price`, `offers.availability`.

**Extraction:** Parse HTML → find `<script type="application/ld+json">` → filter for `@type: Product`.

### Google Shopping XML Feeds

Many merchants publish a Google Shopping feed (often at `/feed/google-shopping.xml` or similar). These are XML files following the Google Merchant Center spec. Fields include: `g:id`, `g:title`, `g:description`, `g:price`, `g:availability`, `g:image_link`, `g:gtin`, `g:brand`, `g:google_product_category`.

**Discovery:** Check `/robots.txt` for feed URLs, or try common paths. The scan engine could probe for known feed URL patterns during brand scanning.

### Open Graph Tags

Every product page has `og:title`, `og:description`, `og:image`, `og:url`. Less structured than JSON-LD but universally present. Useful as a last-resort fallback.

---

## Detection Strategy

During brand scanning, the pipeline could probe for feed availability:

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

## Coverage Estimate

Shopify + WooCommerce alone cover ~70% of the e-commerce market. Adding BigCommerce RSS and JSON-LD scraping for Squarespace/Magento/Wix brings practical coverage to ~85%+. The remaining long tail runs on custom platforms — sitemap + JSON-LD is the universal fallback.

## QMD-Style Hybrid Retrieval (Future Direction)

The current retrieval pipeline uses FTS for category matching and vector search for product matching as separate stages. A QMD-inspired approach would fuse these into a unified hybrid pipeline:

1. **BM25 keyword search** against product names/descriptions (exact term matching)
2. **Vector semantic search** against embeddings (conceptual matching)
3. **Re-ranking** — fuse and sort by combined relevance

This could be implemented entirely within PostgreSQL using `ts_rank` (BM25-equivalent) and `<=>` (cosine distance) in a single query, with application-level score fusion. No external dependencies required. The re-ranking step could use a lightweight model or a weighted score formula.
