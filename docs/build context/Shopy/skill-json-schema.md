# skill.json — Machine-Readable Merchant Metadata Schema

**Date:** 2026-04-02
**Status:** Specification — ready for implementation
**Companion to:** SKILL.md (human/agent-readable guide), agentic-commerce-standard.md (field definitions)
**Implements:** UCP (Universal Category Protocol) with Google Product Taxonomy, 3 levels deep

---

## Purpose

`skill.json` is the structured, machine-readable metadata file that accompanies every `SKILL.md`. While the SKILL.md tells an agent *how* to shop on a merchant's site, `skill.json` tells routing systems *whether* this merchant is relevant to a given query — before the agent ever loads the full skill.

This is the file that powers:
- Agent merchant discovery ("find me a merchant that sells laptops")
- Category-based navigation (sector → category → sub-category → merchants)
- Cross-vendor comparison (filter by payment methods, shipping regions, checkout type, scores)
- The shopy CLI (`shopy merchants --categories "Laptops"`)
- The REST API and MCP tool interfaces
- Edge-cached merchant index (CDN-served, zero origin hits for discovery)

`skill.json` contains the same data as the SKILL.md YAML frontmatter `metadata` block, but in JSON format and with the full UCP taxonomy structure. It is the single source of truth for structured merchant metadata.

---

## Distribution

`skill.json` lives alongside `SKILL.md` in every merchant's skill package:

```
skills/
  amazon/
    SKILL.md          — Agent-readable procurement guide
    skill.json        — Machine-readable metadata (this spec)
  bhphoto/
    SKILL.md
    skill.json
```

It is also:
- Served via the registry API: `GET /api/v1/registry/{vendor}/skill.json`
- Served via the shopy CLI: `shopy info amazon --format json`
- Published to edge CDN for zero-latency agent discovery
- Optionally self-hosted by merchants at `/.well-known/agentic-commerce.json`

---

## Full Schema

```json
{
  "$schema": "https://shopy.sh/schemas/skill.json/v1",
  "version": "1.0",

  "identity": {
    "vendor": "bhphoto",
    "domain": "bhphotovideo.com",
    "displayName": "B&H Photo",
    "logoUrl": "https://cdn.creditclaw.com/brands/bhphoto/logo.png",
    "url": "https://www.bhphotovideo.com"
  },

  "taxonomy": {
    "sector": "electronics",
    "tier": "mid-range",
    "categories": [
      {
        "gptId": 141,
        "name": "Cameras & Optics",
        "path": "Cameras & Optics",
        "depth": 1,
        "primary": true
      },
      {
        "gptId": 149,
        "name": "Camera Lenses",
        "path": "Cameras & Optics > Camera Lenses",
        "depth": 2
      },
      {
        "gptId": 152,
        "name": "Digital Cameras",
        "path": "Cameras & Optics > Digital Cameras",
        "depth": 2
      },
      {
        "gptId": 223,
        "name": "Audio",
        "path": "Electronics > Audio",
        "depth": 1
      },
      {
        "gptId": 242,
        "name": "Audio Players & Recorders",
        "path": "Electronics > Audio > Audio Players & Recorders",
        "depth": 2
      },
      {
        "gptId": 278,
        "name": "Computers",
        "path": "Electronics > Computers",
        "depth": 1
      },
      {
        "gptId": 2636,
        "name": "Lighting",
        "path": "Business & Industrial > Film & Television > Lighting",
        "depth": 2
      }
    ]
  },

  "scoring": {
    "asxScore": 72,
    "asxBreakdown": {
      "clarity": 28,
      "discoverability": 20,
      "reliability": 24
    },
    "asxPillarMax": {
      "clarity": 35,
      "discoverability": 30,
      "reliability": 35
    },
    "scanTier": "agentic",
    "lastScanned": "2026-04-02",

    "axsRating": 4.1,
    "axsBreakdown": {
      "searchAccuracy": 4.3,
      "stockReliability": 4.0,
      "checkoutCompletion": 3.9
    },
    "axsRatingCount": 23
  },

  "access": {
    "apiTier": "keyed",
    "apiName": "B&H Photo API",
    "mcpEndpoint": null,
    "ucpRegistered": false,
    "hasCli": false,
    "searchApi": false,
    "searchUrlTemplate": "https://www.bhphotovideo.com/c/search?q={q}"
  },

  "checkout": {
    "authRequired": false,
    "guestCheckout": true,
    "checkoutSteps": 3,
    "platform": "custom",
    "paymentMethods": [
      "credit_card",
      "debit_card",
      "paypal",
      "apple_pay",
      "google_pay",
      "affirm"
    ],
    "agenticPaymentProtocols": [],
    "poNumberSupported": true,
    "taxExemptSupported": true,
    "businessAccountAvailable": true
  },

  "shipping": {
    "supportedCountries": ["US"],
    "currency": "USD",
    "deliveryOptions": ["standard", "express", "pickup"],
    "freeShippingThreshold": 49.00,
    "shipsInternationally": false
  },

  "returns": {
    "policyUrl": "/helpcenter/Return-Policy/50437",
    "returnWindow": "30 days",
    "returnShippingPaidBy": "customer",
    "refundMethod": "original_payment",
    "policyFormat": "html",
    "policyDiscoverable": true
  },

  "loyalty": {
    "loyaltyProgram": "Payboo Card",
    "agentPurchasesEarnPoints": "unknown",
    "loyaltyAttributionMethod": null
  },

  "skillQuality": {
    "skillVersion": "1.1.0",
    "generatedBy": "creditclaw",
    "generationTier": "agentic",
    "lastVerified": "2026-04-02",
    "verificationStatus": "verified"
  },

  "distribution": {
    "shopifyCatalogSubmitted": false,
    "googleUcpSubmitted": false
  }
}
```

---

## Field Reference

### `identity` — Who is this merchant?

| Field | Type | Required | Description |
|---|---|---|---|
| `vendor` | string | Yes | Unique vendor slug (kebab-case). Matches SKILL.md filename and URL path. |
| `domain` | string | Yes | Primary domain (no protocol, no www). Used for scan correlation. |
| `displayName` | string | Yes | Human-readable name. |
| `logoUrl` | string | No | URL to merchant's logo. |
| `url` | string | Yes | Full homepage URL. |

### `taxonomy` — What does this merchant sell?

This is the core of UCP. Categories use Google Product Taxonomy IDs exclusively — no freeform strings.

| Field | Type | Required | Description |
|---|---|---|---|
| `sector` | string | Yes | CreditClaw sector slug. One of our 21 sectors. For multi-sector merchants, this is the primary sector. |
| `tier` | string | No | Market positioning: `value`, `mid-range`, `premium`, `luxury`, `wholesale`, `marketplace`. |
| `categories` | array | Yes | UCP category mappings. See below. |

#### `taxonomy.categories[]` — UCP Category Objects

Each object maps this merchant to a Google Product Taxonomy category, up to 3 levels deep.

| Field | Type | Required | Description |
|---|---|---|---|
| `gptId` | integer | Yes | Google Product Taxonomy numeric ID. Stable across locales. |
| `name` | string | Yes | Category name (English). Matches Google's official name. |
| `path` | string | Yes | Full path from root: `"Electronics > Computers > Laptops"`. |
| `depth` | integer | Yes | Depth in the taxonomy tree. 0 = root (L1), 1 = L2, 2 = L3. Max depth for merchant mapping is 2 (L3). |
| `primary` | boolean | No | If `true`, this is the merchant's primary category. At most one category should be marked primary. |

**Rules:**
- Categories are mapped **3 levels deep maximum** for merchants (depth 0, 1, 2).
- The `sector` field constrains which Google root categories are relevant. A fashion merchant only has categories under `Apparel & Accessories` (GPT 166), `Luggage & Bags` (GPT 5181), etc.
- A merchant can have categories across multiple Google roots if they span sectors (e.g., Amazon).
- Depth 0 entries (Google root categories) are optional — include them only if the merchant broadly covers the entire root (rare). Most entries will be depth 1-2.

**Sector → Google Root Category Mapping:**

| Sector | Google Root IDs |
|---|---|
| pets | 1 |
| fashion | 166, 5181 |
| entertainment | 8, 783 |
| retail | 537, 1239 |
| industrial, construction | 111 |
| electronics | 141, 222 |
| food | 412 |
| home | 436, 536, 632 |
| health, beauty | 469 |
| garden | 536 |
| office | 922 |
| saas | 2092 |
| sports | 988 |
| automotive | 888 |
| construction | 111, 632 |
| luxury | (cross-sector — uses tier field, not root restriction) |
| travel | 5181 |
| education | (custom extension — GPT has no education root) |
| specialty | (custom extension — niche merchants) |

### `scoring` — How agent-ready is this merchant?

| Field | Type | Required | Description |
|---|---|---|---|
| `asxScore` | integer | Yes | Overall ASX Score (0-100). |
| `asxBreakdown` | object | Yes | Per-pillar scores. |
| `asxBreakdown.clarity` | integer | Yes | Clarity pillar score (max 35). |
| `asxBreakdown.discoverability` | integer | Yes | Discoverability pillar score (max 30). |
| `asxBreakdown.reliability` | integer | Yes | Reliability pillar score (max 35). |
| `asxPillarMax` | object | Yes | Maximum possible score per pillar. Allows future rubric changes without breaking consumers. |
| `scanTier` | string | Yes | `free`, `agentic`, or `premium`. |
| `lastScanned` | string (date) | Yes | ISO date of last scan. |
| `axsRating` | number | No | Overall AXS Rating (1.0-5.0). Null until minimum threshold met. |
| `axsBreakdown` | object | No | Per-dimension ratings. |
| `axsBreakdown.searchAccuracy` | number | No | Search accuracy (1.0-5.0). |
| `axsBreakdown.stockReliability` | number | No | Stock reliability (1.0-5.0). |
| `axsBreakdown.checkoutCompletion` | number | No | Checkout completion (1.0-5.0). |
| `axsRatingCount` | integer | No | Total feedback events. |

### `access` — How can agents interact with this merchant programmatically?

| Field | Type | Required | Description |
|---|---|---|---|
| `apiTier` | string | Yes | `open` (no auth), `keyed` (API key), `partnered` (partnership required), `private` (no public API). |
| `apiName` | string | No | Name of the vendor's API. |
| `mcpEndpoint` | string | No | MCP server URL if available. |
| `ucpRegistered` | boolean | No | Whether registered with Google UCP. |
| `hasCli` | boolean | No | Whether a CLI tool exists. |
| `searchApi` | boolean | No | Whether a dedicated search API exists. |
| `searchUrlTemplate` | string | No | URL template for site search. Use `{q}` as query placeholder. |

### `checkout` — How does purchasing work?

| Field | Type | Required | Description |
|---|---|---|---|
| `authRequired` | boolean | Yes | Whether login is needed to purchase. |
| `guestCheckout` | boolean | No | Whether guest checkout is available. |
| `checkoutSteps` | integer | No | Number of steps in checkout flow. |
| `platform` | string | No | E-commerce platform: `shopify`, `woocommerce`, `magento`, `bigcommerce`, `custom`, etc. |
| `paymentMethods` | string[] | No | Accepted payment types. Values: `credit_card`, `debit_card`, `paypal`, `apple_pay`, `google_pay`, `amazon_pay`, `affirm`, `klarna`, `afterpay`, `gift_card`, `crypto`, `wire_transfer`, `purchase_order`. |
| `agenticPaymentProtocols` | string[] | No | Supported agentic payment protocols: `x402`, `acp`, `ap2`, `self_hosted_card`. |
| `poNumberSupported` | boolean | No | Whether PO numbers can be submitted. |
| `taxExemptSupported` | boolean | No | Whether tax exemption is available. |
| `businessAccountAvailable` | boolean | No | Whether B2B accounts are offered. |

### `shipping` — Where and how does the merchant deliver?

| Field | Type | Required | Description |
|---|---|---|---|
| `supportedCountries` | string[] | No | ISO 3166-1 alpha-2 country codes. |
| `currency` | string | No | Primary currency (ISO 4217). |
| `deliveryOptions` | string[] | No | Available methods: `standard`, `express`, `same_day`, `next_day`, `pickup`, `freight`, `digital`. |
| `freeShippingThreshold` | number | No | Minimum order amount for free shipping (in primary currency). Null if no free shipping. |
| `shipsInternationally` | boolean | No | Whether international shipping is available. |

### `returns` — What's the return/refund policy? (new section)

These fields capture the *clarity and discoverability* of the policy — not whether it's generous. An agent needs to know: can I find the policy, can I parse it, and what are the key terms?

| Field | Type | Required | Description |
|---|---|---|---|
| `policyUrl` | string | No | URL path or full URL to the returns/refund policy page. |
| `returnWindow` | string | No | Human-readable return window: `"30 days"`, `"90 days"`, `"no returns"`, `"varies"`. |
| `returnShippingPaidBy` | string | No | Who pays for return shipping: `customer`, `merchant`, `varies`, `unknown`. |
| `refundMethod` | string | No | How refunds are issued: `original_payment`, `store_credit`, `exchange_only`, `varies`. |
| `policyFormat` | string | No | Format of the policy page: `html`, `pdf`, `accordion`, `behind_login`, `not_found`. |
| `policyDiscoverable` | boolean | No | Whether an agent can find the policy from the checkout flow or product pages without deep navigation. |

### `loyalty` — Does the merchant have a loyalty/rewards program?

| Field | Type | Required | Description |
|---|---|---|---|
| `loyaltyProgram` | string | No | Name of the loyalty program. Null if none. |
| `agentPurchasesEarnPoints` | string | No | `yes`, `no`, or `unknown`. |
| `loyaltyAttributionMethod` | string | No | `account_linked`, `referral_code`, `api`, or null. |

### `skillQuality` — How trustworthy is this skill file?

| Field | Type | Required | Description |
|---|---|---|---|
| `skillVersion` | string | No | Semantic version of the skill package. |
| `generatedBy` | string | No | Who generated the skill: `creditclaw`, `community`, or vendor slug for self-published. |
| `generationTier` | string | No | `free`, `agentic`, `premium`, `indexed`. |
| `lastVerified` | date | No | ISO date when skill was last tested against live site. |
| `verificationStatus` | string | No | `verified`, `unverified`, `outdated`. |

### `distribution` — Where has this skill been published?

| Field | Type | Required | Description |
|---|---|---|---|
| `shopifyCatalogSubmitted` | boolean | No | Whether submitted to Shopify Catalog. |
| `googleUcpSubmitted` | boolean | No | Whether submitted to Google UCP. |

---

## How `skill.json` Gets Generated

### During a Free/Agentic Scan (v1)

The scan already produces most of the data needed for `skill.json`:

1. **identity** — extracted from homepage meta tags + brand index data
2. **taxonomy.sector** — from brand index or inferred by agent during scan
3. **taxonomy.categories** — **new**: agent maps the merchant to UCP categories during scan (see below)
4. **scoring** — from `computeScoreFromRubric()` output
5. **access** — from evidence map (search API detected, MCP probed, etc.)
6. **checkout** — from evidence map (guest checkout, payment methods, platform detected)
7. **shipping** — partially from evidence map, expanded by agent observations
8. **returns** — **new**: agent evaluates return policy discoverability during scan
9. **loyalty** — from agent observation during scan
10. **skillQuality** — from scan metadata
11. **distribution** — defaults to false, updated when distribution happens

### UCP Category Detection During Scan

The agent already browses the site and observes what the merchant sells. Adding category mapping is a natural extension:

1. The scan knows the merchant's sector (from brand index or homepage analysis)
2. The sector constrains which Google root categories are relevant
3. The agent is given the L2 and L3 categories under those roots (a focused list of ~40-150 categories, not the full 5,600)
4. The agent selects the categories that match based on what it observed during the scan
5. Categories are stored on `brand_categories` and output into `skill.json`

**Agent prompt addition:**

```
Based on your exploration of this website, select the Google Product Taxonomy 
categories that this merchant serves. The merchant's sector is "{sector}", 
so only consider categories under these roots:

{filtered category list for this sector — L2 and L3 only}

Select between 3 and 15 categories. Mark one as primary. Only select categories 
where you have direct evidence the merchant sells those product types.
```

### During a Premium Scan (v2)

The premium scan's 10-step journey produces additional data:

- **checkout.checkoutSteps** — actually counted during the journey
- **checkout.paymentMethods** — actually observed at payment step
- **returns.policyUrl** — actually navigated to and recorded
- **returns.returnWindow** — actually read from policy page
- **returns.policyDiscoverable** — whether the agent could find it from checkout (Step F)
- **shipping.deliveryOptions** — actually observed at shipping step
- **shipping.freeShippingThreshold** — verified at checkout

The premium scan enriches `skill.json` with ground-truth data from actual interaction, replacing estimates from the passive scan.

---

## Relationship to Other Files

| File | Format | Purpose | Audience |
|---|---|---|---|
| `SKILL.md` | Markdown with YAML frontmatter | How to shop on this merchant — step-by-step guide | AI agents executing purchases |
| `skill.json` | JSON | What this merchant is and what it offers — structured index data | Routing systems, discovery APIs, CLIs, comparison tools |
| `.well-known/agentic-commerce.json` | JSON (same schema as `skill.json`) | Self-hosted by merchant on their own domain | Any agent discovering merchants by domain |

`skill.json` and the SKILL.md frontmatter `metadata` block contain the same information. `skill.json` is the canonical machine-readable form. The SKILL.md frontmatter is the embedded copy for agents that only load the skill file.

When a skill is generated or updated, `skill.json` is produced first, and the SKILL.md frontmatter is derived from it.

---

## Querying with UCP Categories

### Agent Discovery Flow

```
1. Agent intent: "I need to buy a DSLR camera"

2. Sector identification:
   Intent → sector: electronics
   
3. Category narrowing (sector pre-segments the tree):
   GET /api/v1/categories?sector=electronics
   Returns ~80 categories (L2 + L3 under Electronics, Cameras & Optics roots)
   
4. Agent selects categories:
   → "Digital Cameras" (GPT ID 152, depth 2)
   
5. Merchant lookup:
   GET /api/v1/merchants?categoryIds=152&limit=10
   Returns merchants tagged with GPT 152, ranked by ASX score:
   
   [
     { "vendor": "bhphoto", "displayName": "B&H Photo", "asxScore": 72, "guestCheckout": true, ... },
     { "vendor": "amazon", "displayName": "Amazon", "asxScore": 94, "guestCheckout": false, ... },
     { "vendor": "adorama", "displayName": "Adorama", "asxScore": 65, "guestCheckout": true, ... }
   ]

6. Agent loads full skill for chosen merchant:
   GET /api/v1/registry/bhphoto/SKILL.md
```

### SQL Backing

```sql
-- Categories for a sector
SELECT c.gpt_id, c.name, c.path, c.depth
FROM ucp_categories c
WHERE c.sector_slug = 'electronics'
  AND c.depth <= 2
ORDER BY c.depth, c.name;

-- Merchants for a category (includes parent matches)
SELECT bi.slug, bi.name, bi.overall_score, bi.domain
FROM brand_index bi
JOIN brand_categories bc ON bc.brand_id = bi.id
JOIN ucp_categories c ON c.id = bc.category_id
WHERE c.gpt_id = 152
   OR c.gpt_id IN (SELECT parent.gpt_id FROM ucp_categories parent WHERE parent.id = c.parent_id)
ORDER BY bi.overall_score DESC
LIMIT 10;
```

---

## Validation Rules

1. `identity.vendor` must be a valid slug (lowercase, hyphens, no spaces).
2. `identity.domain` must not include protocol or path.
3. `taxonomy.categories` must contain at least one entry.
4. Every `taxonomy.categories[].gptId` must exist in the `ucp_categories` table.
5. Every `taxonomy.categories[].depth` must be ≤ 2 (L3 max for merchants).
6. At most one category may have `primary: true`.
7. `scoring.asxScore` must be 0-100.
8. `scoring.asxBreakdown` values must not exceed their corresponding `asxPillarMax` values.
9. `scoring.axsRating` must be 1.0-5.0 or null.
10. `checkout.paymentMethods` values must be from the defined enum.
11. `shipping.supportedCountries` values must be ISO 3166-1 alpha-2 codes.
12. `shipping.currency` must be ISO 4217.
13. `skillQuality.skillVersion` must be valid semver.

---

## Versioning

The schema version is in the top-level `version` field. Current: `"1.0"`.

Breaking changes (new required fields, removed fields, type changes) increment the major version. Additive changes (new optional fields) increment the minor version.

The `$schema` URL points to the JSON Schema definition hosted on shopy.sh, which agents and tools can use for validation.
