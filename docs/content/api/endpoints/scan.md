# Scan

The Scan endpoint lets you programmatically scan any merchant domain and retrieve its ASX Score (Agent Shopping Experience Score) — a 0–100 rating of how well the site supports AI shopping agents.

---

## Scan a Domain

Scan a merchant's website and get the ASX Score with a full signal breakdown and recommendations.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/v1/scan` |
| **Auth** | Optional — Bearer token for paid tier features |

### Request Body

```json
{
  "domain": "staples.com"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `domain` | string | Yes | The merchant domain to scan (e.g. `staples.com`, `gucci.com`). Protocol and path are stripped automatically. |

### Response

```json
{
  "domain": "staples.com",
  "score": 72,
  "label": "Good",
  "cached": false,
  "scannedAt": "2026-03-31T12:00:00Z",
  "breakdown": {
    "clarity": {
      "score": 27,
      "max": 35,
      "signals": [
        { "key": "json_ld", "label": "JSON-LD / Structured Data", "score": 12, "max": 15, "detail": "3 JSON-LD blocks found. Product schema detected. Offer/pricing data in schema." },
        { "key": "product_feed", "label": "Product Feed / Sitemap", "score": 7, "max": 10, "detail": "sitemap.xml found. Valid XML sitemap structure. Product URLs detected." },
        { "key": "clean_html", "label": "Clean HTML / Semantic Markup", "score": 8, "max": 10, "detail": "Partial semantic structure (3/7 landmark elements). Good heading hierarchy." }
      ]
    },
    "discoverability": {
      "score": 20,
      "max": 30,
      "signals": [
        { "key": "search_api", "label": "Search API / MCP", "score": 3, "max": 10, "detail": "Versioned API endpoint detected." },
        { "key": "site_search", "label": "Internal Site Search", "score": 8, "max": 10, "detail": "Search form detected. Search autocomplete capability detected." },
        { "key": "page_load", "label": "Page Load Performance", "score": 4, "max": 5, "detail": "Good load time: 1200ms" },
        { "key": "product_page", "label": "Product Page Quality", "score": 5, "max": 5, "detail": "Clear pricing, variant selectors, direct product URLs." }
      ]
    },
    "reliability": {
      "score": 25,
      "max": 35,
      "signals": [
        { "key": "access_auth", "label": "Access & Authentication", "score": 7, "max": 10, "detail": "Guest checkout available. Direct checkout links found." },
        { "key": "order_management", "label": "Order Management", "score": 7, "max": 10, "detail": "Add to cart action detected. Predictable cart URL structure." },
        { "key": "checkout_flow", "label": "Checkout Flow", "score": 8, "max": 10, "detail": "Clearly labeled payment methods detected. Shipping options described." },
        { "key": "bot_tolerance", "label": "Bot Tolerance", "score": 3, "max": 5, "detail": "robots.txt allows general crawling. No CAPTCHA on homepage." }
      ]
    }
  },
  "recommendations": [
    {
      "signal": "search_api",
      "impact": "high",
      "title": "Expose a search API or MCP endpoint",
      "description": "Provide a programmatic search endpoint that AI agents can query directly.",
      "potentialGain": 7
    }
  ]
}
```

### Caching

Scan results are cached for 30 days. If a domain was scanned within the last 30 days, the cached result is returned immediately with `"cached": true`. Authenticated users on paid plans can force a re-scan regardless of cache age.

### Errors

| Status | Meaning |
|---|---|
| `400` | Invalid domain format |
| `422` | Domain could not be reached or resolved |
| `429` | Rate limit exceeded |
| `500` | Internal scan error |
