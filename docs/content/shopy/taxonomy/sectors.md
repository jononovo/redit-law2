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

Each sector has a set of subcategories (typically 2–25 entries). During scanning, the system:

1. Determines the merchant's sector
2. Retrieves the subcategories for that sector from the taxonomy tree
3. Uses an AI classifier to select which subcategories match the merchant
4. Stores the mappings with a primary category designation

For example, scanning `sweetwater.com` with sector `arts-entertainment` might assign:
- **Musical Instruments** (primary)
- **Musical Instrument Accessories**
- **Sound & Recording Equipment**

### Category IDs

Categories use Google's numeric taxonomy IDs directly. For custom sectors (food-services, travel, education, events), custom IDs starting at 100001 are used.

### Depth levels

| Depth | Level | Used for | Example |
|---|---|---|---|
| 1 | Root | Sector identification | Electronics (222) |
| 2 | Subcategory | Merchant classification | Audio (223), Computers (278) |
| 3 | Sub-subcategory | Merchant classification | Headphones (543), Laptops (328) |
| 4–5 | Deep categories | Future product-level classification | Wireless Headphones, Gaming Laptops |

Merchant-level classification uses depth 2–3, preferring the most specific level available. Deeper levels (4–5) are available in the taxonomy for future product-level indexing.

## How taxonomy appears in skill.json

The taxonomy block in `skill.json` includes both human-readable strings and structured objects:

```json
{
  "taxonomy": {
    "sector": "apparel-accessories",
    "tier": "premium",
    "productCategories": [
      "5322 - Apparel & Accessories > Clothing > Activewear",
      "203 - Apparel & Accessories > Clothing > Outerwear",
      "204 - Apparel & Accessories > Clothing > Pants",
      "212 - Apparel & Accessories > Clothing > Shirts & Tops",
      "170 - Apparel & Accessories > Clothing Accessories > Gloves & Mittens",
      "173 - Apparel & Accessories > Clothing Accessories > Hats",
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

- `productCategories` — one string per category in Google Product Taxonomy format: `"{id} - {full path}"`. Each category is individually addressable by its numeric ID.
- `categories` — structured objects with IDs for programmatic use and cross-referencing with the Google Product Taxonomy

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

## For merchants

When you scan your store, sectors and categories are assigned automatically. If you claim your brand, you can review the classification on your brand page and request corrections if the AI classified your store incorrectly.

Multi-category merchants (like Amazon or Walmart) receive a single primary sector based on their dominant product category, with multiple subcategories reflecting their full range.
