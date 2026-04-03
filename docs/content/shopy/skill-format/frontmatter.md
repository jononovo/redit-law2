# Commerce Frontmatter

The commerce-specific metadata lives in the `metadata` map of the YAML frontmatter. This extends the standard skills.sh frontmatter with fields that AI shopping agents need.

## Core fields

```yaml
metadata:
  vendor_domain: sweetwater.com
  vendor_slug: sweetwater
  vendor_name: Sweetwater
  sector: arts-entertainment
  tier: premium
```

| Field | Type | Description |
|---|---|---|
| `vendor_domain` | string | The primary domain of the store |
| `vendor_slug` | string | URL-safe identifier used in the catalog |
| `vendor_name` | string | Display name of the vendor |
| `sector` | string | Primary sector slug — one of 27 values from the [sector taxonomy](/docs/shopy/taxonomy/sectors) (e.g., `electronics`, `apparel-accessories`, `business-industrial`) |
| `tier` | string | Market position: `commodity`, `budget`, `value`, `mid_range`, `premium`, `luxury`, `ultra_luxury` |

## Taxonomy fields

```yaml
metadata:
  product_categories:
    - "505 - Arts & Entertainment > Musical Instruments > Guitars"
    - "506 - Arts & Entertainment > Musical Instruments > Drums & Percussion"
    - "510 - Arts & Entertainment > Musical Instrument Accessories > Instrument Cables"
  categories:
    - id: 505
      name: Guitars
      path: "Arts & Entertainment > Musical Instruments > Guitars"
      depth: 3
      primary: true
    - id: 506
      name: Drums & Percussion
      path: "Arts & Entertainment > Musical Instruments > Drums & Percussion"
      depth: 3
    - id: 510
      name: Instrument Cables
      path: "Arts & Entertainment > Musical Instrument Accessories > Instrument Cables"
      depth: 3
```

| Field | Type | Description |
|---|---|---|
| `product_categories` | string[] | Category strings in Google Product Taxonomy format: `"{id} - {full path}"`. One entry per category. |
| `categories` | object[] | Structured category mappings using Google Product Taxonomy IDs |
| `categories[].id` | integer | Taxonomy ID — Google Product Taxonomy number for Google categories, 100001+ for custom sectors |
| `categories[].name` | string | Category display name |
| `categories[].path` | string | Full path from root (e.g., `"Electronics > Computers > Laptops"`) |
| `categories[].depth` | integer | Depth in taxonomy tree (1 = root, 2 = subcategory, 3 = sub-subcategory). Merchant-level uses depth 2-3. |
| `categories[].primary` | boolean | Whether this is the merchant's primary category |

Categories are assigned automatically during scanning using the Google Product Taxonomy. The full structured taxonomy data (including `product_categories` and `categories` arrays) is currently served through the `skill.json` companion file at `/brands/{slug}/skill-json`. Basic sector and tier values are included in SKILL.md frontmatter.

See the [taxonomy documentation](/docs/shopy/taxonomy/sectors) for details on how sectors and categories work.

## Scoring fields

```yaml
metadata:
  asx_score: 82
  asx_tier: good
  axs_rating: 4.2
  axs_rating_count: 47
```

| Field | Type | Description |
|---|---|---|
| `asx_score` | number | ASX Score (0–100) from the most recent scan |
| `asx_tier` | string | `excellent`, `good`, `fair`, or `needs_work` |
| `axs_rating` | number | Crowdsourced AXS Rating (1–5) |
| `axs_rating_count` | number | Number of feedback submissions |

## Capability fields

```yaml
metadata:
  api_access: keyed
  guest_checkout: true
  payment_methods:
    - credit_card
    - paypal
    - apple_pay
  shipping_options:
    - standard
    - express
    - same_day
  checkout_type: multi_step
```

| Field | Type | Description |
|---|---|---|
| `api_access` | string | `open`, `keyed`, `partnered`, or `private` |
| `guest_checkout` | boolean | Whether guest checkout is available |
| `payment_methods` | string[] | Accepted payment methods |
| `shipping_options` | string[] | Available shipping tiers |
| `checkout_type` | string | `single_page`, `multi_step`, or `api` |

## Distribution fields

```yaml
metadata:
  generated_by: creditclaw
  generated_at: 2026-04-03T00:00:00Z
  verified: true
  verified_at: 2026-04-03T00:00:00Z
```

| Field | Type | Description |
|---|---|---|
| `generated_by` | string | Who generated the skill |
| `generated_at` | string | ISO 8601 timestamp of generation |
| `verified` | boolean | Whether the skill has been verified against the live store |
| `verified_at` | string | ISO 8601 timestamp of last verification |
