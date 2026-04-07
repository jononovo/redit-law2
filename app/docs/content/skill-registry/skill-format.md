# SKILL.md & skill.json

Every brand in the Skill Registry has two representations of its shopping skill: a human-readable markdown file (SKILL.md) and a machine-readable JSON file (skill.json). Together they provide everything an AI agent needs to shop at a given merchant.

## SKILL.md

The SKILL.md file is a markdown document that describes how to shop at a specific vendor. It's designed to be readable by both humans and AI agents.

A typical SKILL.md includes:

- **Vendor overview** — Name, domain, what they sell
- **Checkout methods** — Which payment flows are supported and how to use each one
- **Search patterns** — URL templates and product ID formats for finding products
- **Capabilities** — Guest checkout, order tracking, returns, PO numbers, etc.
- **Shipping details** — Free shipping thresholds, delivery estimates, business shipping options
- **Tips** — Vendor-specific best practices and common pitfalls

### Accessing SKILL.md

```
GET /brands/{slug}/skill
Content-Type: text/markdown
```

Example:
```
GET /brands/amazon/skill
```

## skill.json

The skill.json file is a structured JSON representation of the same information. It's designed for programmatic consumption by agent frameworks.

### Structure

```json
{
  "name": "Amazon",
  "domain": "amazon.com",
  "url": "https://www.amazon.com",
  "sector": "general",
  "tier": "mid_range",
  "checkoutMethods": ["browser", "api"],
  "capabilities": [
    "guest_checkout",
    "price_lookup",
    "stock_check",
    "order_tracking",
    "returns"
  ],
  "search": {
    "urlTemplate": "https://www.amazon.com/s?k={query}",
    "productIdFormat": "ASIN (e.g., B09V3KXJPB)"
  },
  "shipping": {
    "freeThreshold": 35,
    "estimatedDays": "1-5",
    "businessShipping": true
  },
  "checkout": {
    "guestCheckout": true,
    "taxExempt": true,
    "poNumber": false
  },
  "tips": [
    "Use the ASIN for direct product lookup",
    "Prime eligibility affects shipping speed"
  ],
  "taxonomy": ["General", "Electronics", "Home & Garden"],
  "score": 78,
  "maturity": "verified"
}
```

### Accessing skill.json

```
GET /brands/{slug}/skill-json
Content-Type: application/json
```

## How skills are generated

Skills are created through two paths:

1. **ASX Scan** — An automated scan of the merchant's website detects checkout methods, capabilities, and catalog structure. The scan generates both SKILL.md and skill.json automatically.
2. **Manual submission** — Users submit a vendor URL at `/skills/submit`. The system scans the site and generates a draft skill that goes through review before publishing.

Both paths write to the same `brand_index` table in the registry. Skills can be rescanned and updated as merchants improve their agent-readiness.

## Using skills in your agent

The simplest integration pattern:

1. Search the registry for a merchant: `GET /api/v1/bot/skills?q=amazon`
2. Fetch the skill: `GET /brands/amazon/skill` (markdown) or `GET /brands/amazon/skill-json` (structured)
3. Parse the checkout methods and capabilities
4. Follow the skill's instructions to complete the purchase

For deeper integration, see the [Skill Publishing](/docs/skill-publishing/structure) section for the full SKILL.md specification, including commerce frontmatter and taxonomy.

## Next steps

- [Registry API](/docs/skill-registry/registry-api) — All API endpoints for querying the registry
- [SKILL.md Structure](/docs/skill-publishing/structure) — The full SKILL.md specification
- [Commerce Frontmatter](/docs/skill-publishing/frontmatter) — Metadata fields in SKILL.md
