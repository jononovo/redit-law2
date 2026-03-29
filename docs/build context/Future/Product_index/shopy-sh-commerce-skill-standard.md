# shopy.sh — The Open Commerce Skill Standard for AI Agents

## What Is shopy.sh?

**shopy.sh** is the commerce-specific counterpart to Vercel's **skills.sh**. While skills.sh defines how AI agents learn developer tooling (deploy, lint, test), shopy.sh defines how AI agents learn to **shop** — search for products, navigate checkout flows, handle authentication, and complete purchases at any merchant.

The standard extends the existing SKILL.md format (YAML frontmatter + markdown instructions) with commerce-specific metadata fields that let agents understand a merchant's capabilities before reading the full skill instructions.

**Domain:** `shopy.sh` (purchased, owned by CreditClaw)

---

## Relationship to skills.sh

| | skills.sh (Vercel) | shopy.sh (CreditClaw) |
|---|---|---|
| **Focus** | Developer tooling skills | Commerce/procurement skills |
| **Agents** | Coding agents (Cursor, Claude Code, Copilot) | Shopping agents (OpenClaw, custom procurement bots) |
| **Skill examples** | "Deploy to Vercel", "Run ESLint", "Generate tests" | "Shop at Amazon", "Search Home Depot", "Checkout at Staples" |
| **File format** | SKILL.md with YAML frontmatter | Same — SKILL.md with YAML frontmatter |
| **CLI** | `npx skills add` | `npx shopy add` (future) |
| **Directory** | skills.sh leaderboard | shopy.sh catalog |
| **Metadata** | `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools` | Same base fields + commerce-specific extensions (see below) |

The key principle: **shopy.sh skills are valid skills.sh skills.** An agent that supports SKILL.md can load a shopy.sh skill. The commerce-specific metadata fields live in the `metadata` map (which skills.sh already supports as arbitrary key-value pairs), so there's no format conflict.

---

## Commerce-Specific Frontmatter Extensions

The skills.sh standard allows a `metadata` field for arbitrary key-value pairs. shopy.sh defines a structured schema within `metadata` for commerce use cases.

### Full Frontmatter Schema

```yaml
---
name: amazon-procurement
description: >
  Search and purchase products on Amazon.com. Use when the user needs to find
  products, compare prices, add items to cart, or complete checkout on Amazon.
  Supports search by keyword, category, UPC, and ASIN.
license: MIT
compatibility: "Requires CreditClaw API key for gateway access. Direct access requires Amazon PA-API credentials."
metadata:
  # === shopy.sh Commerce Fields ===
  vendor: amazon
  domain: amazon.com
  display_name: Amazon
  logo_url: https://cdn.creditclaw.com/brands/amazon/logo.png
  
  # Taxonomy
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
  
  # Agent Readiness
  axs_rating: 82
  axs_search_accuracy: 90
  axs_stock_reliability: 85
  axs_checkout_completion: 72
  last_scanned: "2026-03-15"
  scan_tier: premium
  
  # API Access
  api_tier: partnered           # open | keyed | partnered | private
  api_name: Amazon PA-API v5
  gateway_available: true       # can agents use CreditClaw gateway?
  direct_api_available: true    # can agents call the vendor API directly?
  mcp_endpoint: null            # Shopify MCP URL if available
  ucp_registered: false         # submitted to Google UCP?
  
  # Checkout Capabilities
  auth_required: true
  guest_checkout: false
  supported_payment_methods:
    - credit_card
    - amazon_pay
    - gift_card
  supported_countries:
    - US
    - CA
    - UK
    - DE
  currency: USD
  
  # Skill Quality
  skill_version: "2.1.0"
  generated_by: creditclaw
  generation_tier: premium      # free | premium | indexed
  last_verified: "2026-03-20"
  verification_status: verified # verified | unverified | outdated
  
  # Distribution
  shopify_catalog_submitted: false
  google_ucp_submitted: false
---
```

### Field Reference

#### Identity Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `vendor` | string | Yes | Unique vendor slug (kebab-case) |
| `domain` | string | Yes | Primary domain of the vendor |
| `display_name` | string | Yes | Human-readable vendor name |
| `logo_url` | string | No | URL to vendor's logo |

#### Taxonomy Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `sector` | string | Yes | CreditClaw sector slug (from 21 defined sectors) |
| `sub_sectors` | string[] | No | Category slugs within the sector |
| `gpt_category_ids` | integer[] | No | Google Product Taxonomy numeric IDs this vendor covers |
| `tier` | string | No | Market positioning: `value`, `mid-range`, `premium`, `luxury`, `wholesale`, `marketplace` |

#### Agent Readiness Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `axs_rating` | integer | Yes | Overall AXS Rating (0–100) |
| `axs_search_accuracy` | integer | No | Search sub-score (0–100) |
| `axs_stock_reliability` | integer | No | Stock accuracy sub-score (0–100) |
| `axs_checkout_completion` | integer | No | Checkout success sub-score (0–100) |
| `last_scanned` | date | No | ISO date of last scan |
| `scan_tier` | string | No | `free` or `premium` |

#### API Access Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `api_tier` | string | Yes | `open`, `keyed`, `partnered`, or `private` |
| `api_name` | string | No | Name of the vendor's API (if available) |
| `gateway_available` | boolean | Yes | Whether CreditClaw gateway supports this vendor |
| `direct_api_available` | boolean | No | Whether agents can call the vendor API directly |
| `mcp_endpoint` | string | No | Shopify MCP URL (e.g., `https://store.myshopify.com/api/mcp`) |
| `ucp_registered` | boolean | No | Whether this vendor is registered with Google UCP |

#### Checkout Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `auth_required` | boolean | Yes | Whether login is needed to purchase |
| `guest_checkout` | boolean | No | Whether guest checkout is available |
| `supported_payment_methods` | string[] | No | List of accepted payment types |
| `supported_countries` | string[] | No | ISO country codes where the vendor ships |
| `currency` | string | No | Primary currency (ISO 4217) |

#### Skill Quality Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `skill_version` | string | No | Semantic version of the skill file |
| `generated_by` | string | No | `creditclaw` or `community` or vendor slug |
| `generation_tier` | string | No | `free`, `premium`, or `indexed` (which CreditClaw tier produced it) |
| `last_verified` | date | No | ISO date when the skill was last tested |
| `verification_status` | string | No | `verified`, `unverified`, or `outdated` |

#### Distribution Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `shopify_catalog_submitted` | boolean | No | Whether products are submitted to Shopify Catalog |
| `google_ucp_submitted` | boolean | No | Whether products are submitted to Google UCP |

---

## Skill Body Structure

Below the frontmatter, the markdown body follows a standard structure for commerce skills. This structure is a recommendation, not a hard requirement — but consistency helps agents parse and execute skills reliably.

```markdown
---
name: vendor-slug
description: ...
metadata:
  vendor: vendor-slug
  # ... commerce fields
---

# {Vendor Name} — Agent Procurement Skill

## Overview
Brief description of the vendor — what they sell, who they serve,
what makes them notable for AI agent procurement.

## Product Discovery

### Via CreditClaw Gateway (Recommended)
Instructions for searching products through the CreditClaw gateway.
Includes: endpoint, auth, example queries, response format.

### Via Direct API (If Available)
Instructions for calling the vendor's own API.
Includes: endpoint, auth requirements, rate limits, example queries.

### Via Website Search
Fallback instructions for searching the vendor's website directly.
Includes: search URL pattern, expected result format.

## Product Detail
How to get full product information — price, availability, images,
variants, shipping options.

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
```

---

## How shopy.sh Skills Are Generated

### Tier 1 (Free Scan)

```
User enters domain → CreditClaw crawls public surface
  → Extracts: structured data, sitemap, search URL, checkout entry points
  → LLM generates SKILL.md body from crawl data
  → Frontmatter populated with: vendor, domain, sector (detected), axs_rating,
    api_tier, auth_required, gateway_available: false
  → Saved to CreditClaw brand_index + published on shopy.sh catalog
```

**Quality:** Basic. Search instructions based on URL patterns. Checkout flow is high-level. No selectors or form field mappings. Verification status: `unverified`.

### Tier 2 (Premium Scan)

```
CreditClaw runs Playwright browser automation
  → Walks full shopping journey: search → PDP → cart → checkout
  → Captures: selectors, form fields, AJAX endpoints, error states
  → LLM generates detailed SKILL.md with step-by-step instructions
  → Frontmatter gets full AXS sub-scores, checkout capabilities, API analysis
  → Verification: CreditClaw runs the skill against a test scenario
  → Saved + published with verification_status: verified
```

**Quality:** Production-grade. Includes CSS selectors, API endpoints (if discovered), form field mappings, error handling. Tested against real checkout flow.

### Tier 3 (Full Index)

```
CreditClaw maintains weekly product crawl + API integration
  → Skill file updated automatically when vendor site changes
  → Gateway routing config embedded in skill instructions
  → Product category mappings from Google Product Taxonomy
  → Distribution status (Shopify/Google UCP) reflected in frontmatter
  → Continuous verification via automated test runs
  → Saved + published with generation_tier: indexed
```

**Quality:** Best possible. Real-time API access via gateway. Full product index. Continuously verified and updated.

---

## shopy.sh Website Structure

The shopy.sh website serves as both the **specification documentation** and the **public catalog** of commerce skills.

### Pages

| Route | Purpose |
|---|---|
| `/` | Landing page — what shopy.sh is, how it works, install instructions |
| `/spec` | Full specification — frontmatter fields, body structure, validation rules |
| `/catalog` | Searchable directory of all published commerce skills |
| `/catalog/[vendor]` | Individual vendor skill page — metadata, AXS score, download |
| `/sectors` | Browse skills by sector (maps to CreditClaw sector taxonomy) |
| `/sectors/[sector]` | All skills in a sector |
| `/leaderboard` | Top-rated vendors by AXS score (like skills.sh's leaderboard) |
| `/submit` | For vendors/community to submit new skills |
| `/docs` | Integration guide for agent developers |
| `/docs/gateway` | CreditClaw gateway documentation |

### CLI (Future)

```bash
# Install a commerce skill
npx shopy add amazon

# Install multiple skills
npx shopy add amazon walmart staples

# Install all skills in a sector
npx shopy add --sector electronics

# List available skills
npx shopy list

# Search for skills
npx shopy search "office supplies"

# Update installed skills to latest version
npx shopy update
```

The CLI would install SKILL.md files into the agent's skill directory — compatible with any agent that supports the skills.sh format (Claude Code, Cursor, Copilot, Gemini, etc.).

---

## How shopy.sh Connects to CreditClaw

```
┌─────────────────────────────────────────────────────────────────┐
│                        CreditClaw Platform                       │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Tier 1   │  │ Tier 2   │  │ Tier 3   │  │ Agent Gateway    │ │
│  │ Free     │  │ Premium  │  │ Full     │  │ API Proxy +      │ │
│  │ Scan     │  │ Scan     │  │ Index    │  │ Credential Vault │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
│       │              │              │                 │           │
│       └──────────────┴──────────────┴─────────────────┘           │
│                              │                                    │
│                     Generates / Updates                           │
│                              │                                    │
│                              ▼                                    │
│                    ┌──────────────────┐                           │
│                    │ SKILL.md Files   │                           │
│                    │ (shopy.sh format)│                           │
│                    └────────┬─────────┘                           │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                    Published to
                              │
                              ▼
                    ┌──────────────────┐
                    │   shopy.sh       │
                    │   Public Catalog │
                    │   + Spec Site    │
                    └────────┬─────────┘
                             │
               Installed by agents via
                             │
                    ┌────────┴────────┐
                    │  npx shopy add  │
                    │  or manual      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   AI Agents      │
                    │   (Any agent     │
                    │   supporting     │
                    │   SKILL.md)      │
                    └──────────────────┘
```

### Data Flow

1. CreditClaw scans/indexes a vendor → generates a SKILL.md in shopy.sh format
2. The SKILL.md is published to the shopy.sh catalog
3. An agent installs the skill via `npx shopy add {vendor}` or by downloading from shopy.sh
4. The agent reads the skill and knows how to shop at that vendor
5. For vendors with `gateway_available: true`, the skill routes product searches and checkout through the CreditClaw gateway
6. For vendors with `direct_api_available: true`, the skill includes instructions for direct API access (agent needs own credentials)
7. For vendors with `api_tier: private`, the skill uses CreditClaw's cached product index + browser automation instructions

---

## Monetization Through shopy.sh

| Revenue Stream | Description |
|---|---|
| **Free skills** | Basic skills from Tier 1 scans — drives traffic to CreditClaw for upgrades |
| **Premium skills** | Tier 2 skills with verified checkout flows — one-time purchase |
| **Indexed skills** | Tier 3 skills with gateway access — included in subscription |
| **Vendor-sponsored skills** | Vendors pay to have their skill promoted/featured in the catalog |
| **Gateway usage** | Agents using gateway-routed skills generate per-query revenue |
| **Certification badge** | Vendors who pass premium scan get a "shopy.sh verified" badge for their site |

---

## Open Questions

1. **CLI naming.** Is `npx shopy` the right CLI name? It mirrors `npx skills` cleanly. Alternative: `npx shopy-skills` to avoid confusion with unrelated "shopy" brands.
2. **Catalog hosting.** Should shopy.sh be a separate Next.js site, or a section within creditclaw.com? Separate site gives it more legitimacy as an open standard. Same site is simpler to maintain.
3. **Community contributions.** Should third parties be able to submit skills to the shopy.sh catalog? If yes, we need a review/validation pipeline. If no, it's a CreditClaw-only catalog.
4. **Versioning.** When a vendor's site changes (new checkout flow, new API), the skill needs updating. How do we handle version bumps? Automated re-scan + re-generation? Manual review?
5. **Skill signing.** Should CreditClaw cryptographically sign generated skills so agents can verify authenticity? Prevents tampered skill files from being installed.
