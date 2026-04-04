# Scan → Taxonomy → Skills Pipeline — Internal Developer Guide

> Last updated: 2026-04-03

## Overview

This document explains how the core pipeline works end-to-end: a domain is submitted, scanned, classified, scored, assigned product categories from our taxonomy, and turned into structured skill output (SKILL.md + skill.json). Every step is described in sequence with the files involved, data flow, and key design decisions.

---

## End-to-End Flow

```
User submits domain
  ↓
POST /api/v1/scan (or scan-queue worker)
  ↓
  ├── Cache check: brand_index row < 30 days old? → return cached
  ↓
  ├── Call 1: classifyBrand(domain) ──────────────── Perplexity (sonar)
  │     Returns: name, sector, brandType, sectors[],
  │              tier, subCategories, capabilities, description
  │
  ├── Call 2: auditSite(domain) ─────────────────── Perplexity (sonar)
  │     Returns: 40+ boolean/string signals about
  │              the site's agent-readiness
  │
  ↓ (parallel — both run simultaneously)
  │
  computeScoreFromRubric() ──── 11 signals, 100 pts
  buildVendorSkillDraft()  ──── VendorSkill object
  generateVendorSkill()    ──── SKILL.md markdown
  ↓
  upsertBrandIndex() ──── write to brand_index table
  ↓
  Call 3: resolveProductCategories(domain, sector, brandType, sectors) ── Perplexity (sonar)
    │  Depth and scope vary by brand type:
    │    brand/retailer/independent → single sector, L2+L3 categories
    │    department_store/supermarket → multi-sector, L1+L2 categories
    │    mega_merchant → L1 root categories only (no Perplexity call)
    │  Validates IDs against product_categories table
    ↓
  setBrandCategories() ──── write to brand_categories junction table
  ↓
  Return score + breakdown + recommendations to client
```

### Entry points

| Path | Purpose |
|------|---------|
| `app/api/v1/scan/route.ts` | Public scan API — user-triggered via the scanner form |
| `lib/scan-queue/process-next.ts` | Background scan queue worker — same logic, different entry |

Both follow the identical pipeline. The only differences are rate limiting (API route) and queue management (worker).

---

## Step 1: Brand Classification

**File:** `lib/agentic-score/classify-brand.ts`

A single Perplexity `sonar` call that returns structured JSON about the brand:

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Official brand name (cleaned of Inc/LLC suffixes) |
| `sector` | VendorSector | One of 26 assignable sectors (see Taxonomy below) |
| `tier` | BrandTier | Pricing position: ultra_luxury, luxury, premium, mid_range, value, budget, commodity |
| `subCategories` | string[] | Up to 5 freeform product category descriptions |
| `capabilities` | VendorCapability[] | Detected e-commerce capabilities |
| `description` | string | One-sentence summary |
| `guestCheckout` | boolean | Whether guest checkout is available |

The sector is constrained to `ASSIGNABLE_SECTORS` (26 entries — all 27 minus luxury, which is tier-driven). If Perplexity returns an unknown value, it falls back to `"specialty"`.

### Fallback behavior

If classification fails (API error, timeout, missing key), the pipeline continues with:
- Name → derived from domain (e.g., `nike.com` → `"Nike"`)
- Sector → existing value from DB, or `"specialty"` as last resort
- Tier → existing value or null

Classification failure never blocks a scan.

---

## Step 2: Site Audit

**File:** `lib/agentic-score/audit-site.ts`

A second Perplexity `sonar` call (runs in parallel with classification) that evaluates the site against 40+ technical signals:

- JSON-LD presence, schema types, Open Graph tags
- Sitemap availability, structure, product URLs
- robots.txt rules, AI-agent blocking
- Search functionality, URL patterns, autocomplete
- Checkout flow: guest checkout, cart page, payment methods
- Bot tolerance: CAPTCHAs, rate limiting
- Agent metadata: llms.txt, ai-plugin.json, OpenAPI docs, MCP endpoints

Returns a `SiteAudit` object with boolean/string/numeric values for each signal.

---

## Step 3: Scoring

**File:** `lib/agentic-score/scoring-engine.ts`, `lib/agentic-score/rubric.ts`

The audit results are converted to evidence and scored against the ASX rubric:

| Pillar | Points | Signals |
|--------|--------|---------|
| Clarity | 35 | JSON-LD (15), Product Feed/Sitemap (10), Agent Metadata (10) |
| Reliability | 35 | Access & Auth (10), Order Management (10), Checkout Flow (10), Bot Tolerance (5) |
| Discoverability | 30 | Search API/MCP (10), Site Search (10), Page Load (5), Product Page Quality (5) |

Output: overall score (0-100), per-pillar breakdown, and ranked recommendations for improvement.

---

## Step 4: SKILL.md Generation

**Files:** `lib/agentic-score/scan-utils.ts`, `lib/procurement-skills/generator.ts`

`buildVendorSkillDraft()` assembles a `VendorSkill` object from the classification and audit data. `generateVendorSkill()` converts it to a markdown file that AI agents consume at runtime:

1. YAML frontmatter — score, maturity, capabilities, checkout methods
2. Overview — what the store sells
3. How to Search — instructions for product discovery
4. How to Checkout — step-by-step flow
5. Tips — practical advice from the scan
6. Known Issues — CAPTCHAs, login walls, broken flows

---

## Step 5: Persistence

**File:** `server/storage/brand-index.ts`

`upsertBrandIndex()` writes everything to the `brand_index` table using `domain` as the unique conflict key. Key columns:

- **Identity:** slug, name, domain, url, logoUrl, description
- **Classification:** sector, brandType, subSectors (freeform text[]), tier, maturity
- **Scoring:** overallScore, scoreBreakdown (JSONB), recommendations (JSONB)
- **Capabilities:** hasMcp, hasApi, capabilities[], checkoutMethods[]
- **Payloads:** brandData (full VendorSkill JSONB), skillMd (markdown text)

---

## Step 6: Product Category Resolution

**File:** `lib/agentic-score/resolve-categories.ts`

After the brand is persisted, a third Perplexity call classifies the brand into specific product categories from our taxonomy. This is the final step — it runs sequentially after upsert and is non-critical (wrapped in try/catch).

### How it works

Resolution behavior varies by brand type. The `resolveProductCategories()` function accepts `brandType` and `sectors[]` from the classification call and routes accordingly:

**Focused merchants** (brand, retailer, independent):
1. Look up the single sector's root ID in `SECTOR_ROOT_IDS`
2. Query `product_categories` for L2 and L3 categories under that root (depth ≤ 3)
3. Send compact menu to Perplexity, get back up to 10 category IDs
4. Sector stays as assigned (e.g., `health-beauty`)

**Department stores / supermarkets** (department_store, supermarket, chain, marketplace with multiple sectors):
1. Query `product_categories` for L1 and L2 categories across ALL sectors returned by classification
2. Send combined multi-sector menu to Perplexity, get back up to 20 category IDs
3. Sector set to `multi-sector`

**Mega merchants** (mega_merchant):
1. No Perplexity call — directly map each sector to its L1 root category ID
2. Sector set to `multi-sector`

For all paths:
- Validate every returned ID against the queried subtree (reject unknown IDs)
- Build `ResolvedCategory[]` and call `setBrandCategories(brandId, categories)`
- Set `brand_index.brand_type` to the classified value

### Why a second Perplexity call instead of local matching?

The original approach used fuzzy string matching — mapping freeform `subCategories` from the classification call against taxonomy entries by name similarity. This produced poor results (e.g., Grainger → "Dental Tools" instead of Manufacturing, Heavy Machinery, Safety Equipment). Perplexity actually understands what the brand sells and picks appropriate categories from the menu.

### Storage

**File:** `server/storage/brand-categories.ts`

`setBrandCategories(brandId, categories)` always:
1. Deletes all existing rows for the brand (clears stale mappings on rescan)
2. Inserts new rows with `categoryId` and `isPrimary` flag
3. Handles empty arrays (clears categories for brands where resolution returned nothing)

---

## Taxonomy System

### Sectors (28 entries)

**File:** `lib/procurement-skills/taxonomy/sectors.ts`

The sector system is a hybrid of Google Product Taxonomy roots and custom additions:

**21 Google Product Taxonomy roots:**
animals-pet-supplies, apparel-accessories, arts-entertainment, baby-toddler, business-industrial, cameras-optics, electronics, food-beverages-tobacco, furniture, hardware, health-beauty, home-garden, luggage-bags, mature, media, office-supplies, religious-ceremonial, software, sporting-goods, toys-games, vehicles-parts

**7 custom/special sectors:**
food-services, travel, education, events, luxury, specialty, multi-sector

### Key constants

| Constant | What it is |
|----------|-----------|
| `SECTOR_ROOT_IDS` | Maps every sector → its root category ID. Google sectors use Google IDs (< 100000). Custom sectors use IDs ≥ 100001. `multi-sector` has root ID 0 (placeholder) |
| `GOOGLE_ROOT_IDS` | Derived from SECTOR_ROOT_IDS — only the 21 Google-mapped sectors |
| `ASSIGNABLE_SECTORS` | 26 entries — all sectors minus luxury and multi-sector (neither is directly assignable by Perplexity) |
| `SECTOR_LABELS` | Display names for all 28 sectors |

### multi-sector is special

`multi-sector` is NOT an assignable sector. It is set programmatically by the category resolution step when a merchant's brand type indicates it spans multiple root sectors (department_store, supermarket, mega_merchant). Perplexity never assigns `sector = "multi-sector"` directly.

### Brand Types (8 values)

**File:** `lib/procurement-skills/taxonomy/brand-types.ts`

| Type | Description | Category depth | Sector behavior |
|------|------------|----------------|-----------------|
| `brand` | DTC / own-brand (Nike, Glossier) | L3 | Single sector |
| `retailer` | Specialist retailer (Best Buy, Sephora) | L3 | Single sector |
| `independent` | Small independent shop | L3 | Single sector |
| `chain` | Multi-location chain | L2 | Single or multi-sector |
| `marketplace` | Multi-seller platform (Etsy, eBay) | L2 | Single or multi-sector |
| `department_store` | General multi-category (Target, Macy's) | L2 | multi-sector |
| `supermarket` | Grocery + general merchandise | L2 | multi-sector |
| `mega_merchant` | Massive all-category (Amazon, Walmart) | L1 roots only | multi-sector |

### Luxury is special

Luxury is NOT a sector assignment. It's a tier-driven filter view:
- The `/c/luxury` page queries brands where `tier IN ('ultra_luxury', 'luxury')`
- It appears in catalog navigation alongside real sectors (injected by `getAllBrandFacets()` when luxury-tier brands exist)
- The Perplexity classifier never assigns `sector = "luxury"` — a luxury brand gets its actual product sector (e.g., `apparel-accessories`) and `tier = "luxury"`

### Product Categories (5,638 entries)

**Table:** `product_categories` (seeded by `scripts/seed-google-taxonomy.ts`)

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial (PK) | The taxonomy ID — Google's numeric ID for Google categories, 100001+ for custom |
| `name` | text | Category name (e.g., "Audio") |
| `slug` | text | URL-friendly name |
| `parentId` | integer | Parent category ID (null for roots) |
| `depth` | integer | Hierarchy depth (1 = root, 2 = L2, etc.) |
| `path` | text | Full path (e.g., "Electronics > Audio") |

**Important:** The `id` IS the taxonomy identifier. There is no separate `gptId` column — the Google taxonomy number is the primary key value. This was a deliberate simplification to avoid ID mapping layers.

Breakdown:
- 5,595 Google Product Taxonomy entries (from `data/google-product-taxonomy.txt`)
- 43 custom entries for non-Google sectors:
  - Food Services (100001-100008): Restaurant Delivery, Meal Kits, Catering, Grocery Delivery, Ghost Kitchens, Coffee & Beverage, Bakery & Desserts
  - Travel (100010-100017): Flights, Hotels & Lodging, Car Rental, Cruises, Tours & Activities, Travel Insurance, Vacation Rentals
  - Education (100020-100026): Online Courses, Tutoring, Certifications, Educational Materials, Test Prep, Language Learning
  - Events (100030-100036): Concert Tickets, Sports Tickets, Conferences, Festivals, Theater & Shows, Workshops & Classes
  - Luxury (100040-100046): Luxury Fashion, Fine Jewelry, Luxury Watches, Luxury Home, Luxury Automotive, Luxury Beauty
  - Specialty (100050-100055): General Specialty, Subscription Services, Custom & Personalized, Marketplace & Platform, Rental & Lease

### Brand Categories Junction

**Table:** `brand_categories`

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial (PK) | Row ID |
| `brandId` | integer | FK to brand_index.id |
| `categoryId` | integer | FK to product_categories.id (the taxonomy ID) |
| `isPrimary` | boolean | One primary category per brand |

Unique constraint on `(brandId, categoryId)` prevents duplicates.

### Depth limits

- **Merchant-level classification uses depth 2-3** — L2 subcategories and L3 sub-subcategories. The Perplexity prompt instructs the classifier to prefer the most specific level available.
- **L4+ categories** (depth 4-5) exist in `product_categories` but are reserved for future product-level classification (Tier 3 Product Index).

---

## skill.json Output

**Files:** `lib/procurement-skills/skill-json.ts`, `app/brands/[slug]/skill-json/route.ts`

The skill.json route at `/brands/{slug}/skill-json` assembles the machine-readable metadata package:

1. Fetch brand from `brand_index` by slug
2. Fetch category objects from `brand_categories` + `product_categories` (join query)
3. Build the skill.json structure

### Taxonomy block format

```json
{
  "taxonomy": {
    "sector": "apparel-accessories",
    "tier": "premium",
    "productCategories": [
      "5322 - Apparel & Accessories > Clothing > Activewear",
      "203 - Apparel & Accessories > Clothing > Outerwear",
      "187 - Apparel & Accessories > Shoes"
    ],
    "categories": [
      {
        "id": 5322,
        "name": "Activewear",
        "path": "Apparel & Accessories > Clothing > Activewear",
        "depth": 3,
        "primary": true
      },
      {
        "id": 203,
        "name": "Outerwear",
        "path": "Apparel & Accessories > Clothing > Outerwear",
        "depth": 3
      },
      {
        "id": 187,
        "name": "Shoes",
        "path": "Apparel & Accessories > Shoes",
        "depth": 2
      }
    ]
  }
}
```

Two representations of the same data:
- `productCategories` — one string per category in Google Product Taxonomy format: `"{id} - {full path}"`. Each category individually addressable by numeric ID.
- `categories` — structured objects with IDs for programmatic use

### Other skill.json blocks

| Block | Source | Purpose |
|-------|--------|---------|
| `identity` | brand_index columns | Vendor slug, domain, display name, logo, URL |
| `scoring` | overallScore, scoreBreakdown | ASX score, per-pillar breakdown, scan tier |
| `access` | brandData, hasApi, hasMcp | API tier, MCP endpoint, search API availability |
| `checkout` | brandData | Auth requirements, payment methods, PO/tax-exempt support |
| `shipping` | brandData | Free shipping threshold, delivery estimate |
| `loyalty` | brandData | Loyalty program info |
| `skillQuality` | metadata | Version, generation method, last verified date |

---

## Key File Reference

| File | Role |
|------|------|
| `app/api/v1/scan/route.ts` | Public scan API entry point |
| `lib/scan-queue/process-next.ts` | Background scan queue worker |
| `lib/agentic-score/classify-brand.ts` | Perplexity brand classification (Call 1) |
| `lib/agentic-score/audit-site.ts` | Perplexity site audit (Call 2) |
| `lib/agentic-score/resolve-categories.ts` | Perplexity category resolution (Call 3) |
| `lib/agentic-score/scoring-engine.ts` | Score computation from evidence |
| `lib/agentic-score/rubric.ts` | ASX rubric definition (11 signals, 100 pts) |
| `lib/agentic-score/scan-utils.ts` | VendorSkill draft builder, domain utilities |
| `lib/procurement-skills/generator.ts` | SKILL.md markdown generation |
| `lib/procurement-skills/skill-json.ts` | skill.json builder |
| `app/brands/[slug]/skill-json/route.ts` | skill.json HTTP route |
| `lib/procurement-skills/taxonomy/sectors.ts` | 27 sectors, root IDs, helpers |
| `shared/schema.ts` | product_categories, brand_categories, brand_index tables |
| `server/storage/brand-index.ts` | brand_index CRUD operations |
| `server/storage/brand-categories.ts` | brand_categories CRUD operations |
| `scripts/seed-google-taxonomy.ts` | Seeds product_categories (Google + custom) |

---

## Fragile Areas & Design Decisions

### Three Perplexity calls per scan

Each scan makes 3 API calls to Perplexity:
1. Classification (parallel) — determines sector, tier, name
2. Site audit (parallel) — 40+ technical signals
3. Category resolution (sequential, after upsert) — maps to taxonomy

Calls 1 and 2 run in parallel. Call 3 runs after upsert because it needs the resolved sector. If any call fails, the pipeline continues with degraded data (no name/sector, lower score, no categories) — nothing ever blocks the scan.

### subSectors vs categories — they are different things

`subSectors` (text[] on brand_index) are freeform strings from Perplexity's classification call (e.g., "Musical Instruments", "Audio Equipment"). They're displayed on vendor cards and detail pages as human-readable labels.

`brand_categories` (junction table) are structured taxonomy references with validated IDs. They power the skill.json taxonomy output and will be used for category-based search/filtering.

Both exist and serve different purposes. Do not confuse them.

### Category resolution is non-critical

The try/catch around `resolveProductCategories()` and `setBrandCategories()` is intentional. A brand with no categories is valid — it just has an empty `taxonomy.categories` array in skill.json. The scan response is returned before category resolution completes in the queue worker path.

### Stale sector values in the database

Brands scanned before the April 3, 2026 sector overhaul may have old sector slugs (e.g., `"retail"`, `"home"`, `"pets"`). These are handled:
- The scan route falls back to `"specialty"` if the existing sector is `"uncategorized"` or `"retail"`
- `getAllBrandFacets()` filters sectors to only known slugs from `SECTOR_LABELS`
- UI displays raw values via `SECTOR_LABELS[sector] ?? sector` fallback

Rescanning a brand fixes its sector to the current system.

### Seed script resets the serial sequence

When seeding `product_categories`, the script sets specific `id` values (Google taxonomy numbers) and then resets the PostgreSQL serial sequence to the max ID. This prevents auto-increment collisions if new categories are ever inserted without explicit IDs.
