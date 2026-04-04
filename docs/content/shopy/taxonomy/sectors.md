# Taxonomy & Sectors

Every merchant in the catalog is classified into a sector and assigned product categories from a structured taxonomy. This classification drives catalog browsing, sector landing pages, agent search, and the taxonomy block in `skill.json` and SKILL.md.

## How classification works

When a domain is scanned, an AI classifier determines:

1. **Sector** — the primary business category (e.g., `electronics`, `apparel-accessories`, `food-services`)
2. **Tier** — the market position (e.g., `value`, `premium`, `luxury`)
3. **Product categories** — specific subcategories from the Google Product Taxonomy that describe what the merchant sells

All three are assigned automatically during scanning. Merchants who claim their brand can review and correct these values.

## The 27 sectors

The sector system is built on top of the Google Product Taxonomy — the most widely adopted product classification standard, used by Google Shopping, Facebook Commerce, and most feed management tools.

21 sectors map directly to Google Product Taxonomy root categories. 6 additional sectors cover industries that Google's product-focused taxonomy doesn't address.

### Google Product Taxonomy sectors (21)

| Sector | Display Name | Google Taxonomy ID |
|---|---|---|
| `animals-pet-supplies` | Animals & Pet Supplies | 1 |
| `apparel-accessories` | Apparel & Accessories | 166 |
| `arts-entertainment` | Arts & Entertainment | 8 |
| `baby-toddler` | Baby & Toddler | 537 |
| `business-industrial` | Business & Industrial | 111 |
| `cameras-optics` | Cameras & Optics | 141 |
| `electronics` | Electronics | 222 |
| `food-beverages-tobacco` | Food, Beverages & Tobacco | 422 |
| `furniture` | Furniture | 436 |
| `hardware` | Hardware | 632 |
| `health-beauty` | Health & Beauty | 469 |
| `home-garden` | Home & Garden | 536 |
| `luggage-bags` | Luggage & Bags | 110 |
| `mature` | Mature | 772 |
| `media` | Media | 783 |
| `office-supplies` | Office Supplies | 922 |
| `religious-ceremonial` | Religious & Ceremonial | 988 |
| `software` | Software | 313 |
| `sporting-goods` | Sporting Goods | 990 |
| `toys-games` | Toys & Games | 1239 |
| `vehicles-parts` | Vehicles & Parts | 888 |

### Custom sectors (6)

| Sector | Display Name | What it covers |
|---|---|---|
| `food-services` | Food Services | Restaurants, meal delivery, catering, ghost kitchens |
| `travel` | Travel | Flights, hotels, car rental, tours, vacation rentals |
| `education` | Education | Online courses, tutoring, certifications, test prep |
| `events` | Events | Concert tickets, sports tickets, conferences, festivals |
| `luxury` | Luxury | A special filter view — see below |
| `specialty` | Specialty | Fallback for merchants that don't fit other sectors |

### Luxury is not a sector assignment

Luxury appears in the catalog navigation alongside other sectors, but it works differently. A luxury brand is assigned to its actual product sector (e.g., `apparel-accessories` for a luxury fashion house) and receives a `tier` of `luxury` or `ultra_luxury`. The luxury catalog page shows all brands with those tiers, regardless of sector.

This means a luxury electronics brand appears in both the Electronics sector page and the Luxury page.

## Product categories

Below sectors, merchants are classified into specific product categories from the Google Product Taxonomy — a hierarchy of approximately 5,600 categories organized up to 5 levels deep.

### How it works

Category resolution depends on the merchant's **brand type** — an 8-value classification assigned during scanning:

**Focused brands** (`brand`, `retailer`, `independent`, `chain`, `marketplace`):
1. Determines up to 2 sectors for the merchant
2. Retrieves L2 and L3 subcategories under those sector roots
3. Uses an AI classifier to select up to 10 matching subcategories
4. Stores the mappings with a primary category designation

For example, scanning `sweetwater.com` (brand type: `retailer`, sector: `arts-entertainment`) might assign:
- **Musical Instruments** (primary)
- **Musical Instrument Accessories**
- **Sound & Recording Equipment**

**Department stores and supermarkets** (`department_store`, `supermarket`):
1. Sector is set to `multi-sector` automatically
2. Retrieves L1 and L2 categories across all classified sectors
3. AI classifier selects up to 20 matching categories

**Mega merchants** (`mega_merchant`):
1. Sector is set to `multi-sector` automatically
2. Each classified sector maps directly to its L1 root category — no AI classification needed

### Category IDs

Categories use Google's numeric taxonomy IDs directly. For custom sectors (food-services, travel, education, events), custom IDs starting at 100001 are used.

### Depth levels

| Depth | Level | Used for | Example |
|---|---|---|---|
| 1 | Root | Sector identification; mega merchant categories | Electronics (222) |
| 2 | Subcategory | Department store/supermarket + focused brand classification | Audio (223), Computers (278) |
| 3 | Sub-subcategory | Focused brand classification | Headphones (543), Laptops (328) |
| 4–5 | Deep categories | Future product-level classification | Wireless Headphones, Gaming Laptops |

The depth used for merchant-level classification depends on brand type. Focused brands use depth 2–3 (preferring the most specific level). Department stores and supermarkets use depth 1–2. Mega merchants use depth 1 only. Deeper levels (4–5) are available in the taxonomy for future product-level indexing.

## How taxonomy appears in skill.json

The taxonomy block in `skill.json` includes structured category objects for programmatic use:

```json
{
  "taxonomy": {
    "brandType": "brand",
    "sector": "apparel-accessories",
    "tier": "premium",
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

- `categories` — structured objects with numeric IDs for programmatic use and cross-referencing with the Google Product Taxonomy. Each category includes `id`, `name`, `path`, `depth`, and an optional `primary` flag.

## Market tiers

Every merchant is also classified by market position:

| Tier | Description |
|---|---|
| `commodity` | Lowest-cost, undifferentiated goods |
| `budget` | Budget-focused, price-driven retailers |
| `value` | Value-oriented, balancing price and quality |
| `mid_range` | Mainstream brands, moderate pricing |
| `premium` | Higher-end brands, quality-focused |
| `luxury` | Luxury goods, exclusive brands |
| `ultra_luxury` | Top-tier luxury, limited availability |

Tiers help agents make purchasing decisions — a `budget` merchant might prioritize coupon checking, while a `premium` merchant might emphasize product quality and exclusivity.

## Why Google Product Taxonomy?

The Google Product Taxonomy was chosen because:

- It's the most widely adopted product classification system in e-commerce
- Used by Google Shopping, Facebook Commerce, and most feed management tools
- Approximately 5,600 categories with stable numeric IDs
- Hierarchical structure (up to 5 levels deep) with clear parent-child relationships
- Updated periodically by Google with backward-compatible additions
- Using the same IDs means our taxonomy is interoperable with existing merchant feeds, shopping APIs, and product data services

## Brand types

Every merchant is also assigned a **brand type** during scanning, which determines how sectors and categories are resolved:

| Brand Type | Description | Sector Behavior |
|---|---|---|
| `brand` | Direct-to-consumer or manufacturer brand (e.g., Glossier, Patagonia) | Keeps primary sector |
| `retailer` | Curated retailer in a specific vertical (e.g., Sweetwater, REI) | Keeps primary sector |
| `independent` | Small or niche merchant | Keeps primary sector |
| `chain` | Multi-location chain in a focused category (e.g., Sephora) | Keeps primary sector |
| `marketplace` | Third-party marketplace in a focused vertical (e.g., Chewy) | Keeps primary sector |
| `department_store` | Multi-department retailer (e.g., Target, Costco) | Set to `multi-sector` |
| `supermarket` | Grocery/general merchandise (e.g., Walmart) | Set to `multi-sector` |
| `mega_merchant` | Massive cross-sector marketplace (e.g., Amazon) | Set to `multi-sector` |

Focused types (brand, retailer, independent, chain, marketplace) keep their primary sector and can span categories across up to 2 sector roots. Multi-sector types have their sector set to `multi-sector` automatically.

## For merchants

When you scan your store, sectors, brand type, and categories are assigned automatically. If you claim your brand, you can review the classification on your brand page and request corrections if the AI classified your store incorrectly.

Multi-category merchants like Amazon or Walmart are classified as `mega_merchant` or `supermarket` and receive the `multi-sector` designation, with broad L1 categories reflecting their full range. Focused brands keep their primary sector with more specific L2–L3 categories.
