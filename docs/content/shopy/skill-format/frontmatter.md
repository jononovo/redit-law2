# Commerce Frontmatter

The commerce-specific metadata lives in the `metadata` map of the YAML frontmatter. This extends the standard skills.sh frontmatter with fields that AI shopping agents need.

## Core fields

```yaml
metadata:
  vendor_domain: amazon.com
  vendor_slug: amazon
  vendor_name: Amazon
  sector: general
  maturity: established
```

| Field | Type | Description |
|---|---|---|
| `vendor_domain` | string | The primary domain of the store |
| `vendor_slug` | string | URL-safe identifier used in the catalog |
| `vendor_name` | string | Display name of the vendor |
| `sector` | string | Primary business sector (general, electronics, office, fashion, etc.) |
| `maturity` | string | `emerging`, `growing`, or `established` |

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
  generated_at: 2025-01-15T00:00:00Z
  verified: true
  verified_at: 2025-01-15T00:00:00Z
```

| Field | Type | Description |
|---|---|---|
| `generated_by` | string | Who generated the skill |
| `generated_at` | string | ISO 8601 timestamp of generation |
| `verified` | boolean | Whether the skill has been verified against the live store |
| `verified_at` | string | ISO 8601 timestamp of last verification |
