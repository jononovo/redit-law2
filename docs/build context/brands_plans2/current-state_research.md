# Brands.sh Scanner Pipeline — Current State Research

_Date: 2026-04-03_

## Test Methodology

Triggered fresh scans of 4 new domains (bestbuy.com, chewy.com, patagonia.com, wayfair.com) via `POST /api/v1/scan` and inspected the resulting database records, API responses, and brandData JSON blobs. Also reviewed all 11 existing brands in the `brand_index` table.

---

## Issue 1: Wrong Brand Names (Critical)

The scanner assigns incorrect names to brands. Out of 4 fresh scans:

| Domain | Expected Name | Got | Source |
|--------|:---:|:---:|:---:|
| patagonia.com | Patagonia | **burger** | Agent `record_findings` |
| wayfair.com | Wayfair | **Previous Slide** | Agent `record_findings` |
| bestbuy.com | Best Buy | **reCAPTCHA** | Agent `record_findings` |
| chewy.com | Chewy | Chewy | Agent `record_findings` |

**Root cause:** The AI agent calls `record_findings` with text scraped from UI elements (hamburger menu labels, carousel buttons, CAPTCHA page text) instead of the actual brand name.

**Name resolution chain** (line 263 in `app/api/v1/scan/route.ts`):
```
existing?.name ?? agentFindings.name ?? meta.name
```
For new brands, `existing` is null, so the agent's bad name wins. The `extractMeta` fallback is also unreliable — many sites serve redirect pages or access-denied pages to server-side fetches:
- Patagonia's `<title>`: "Hang Tight! Routing to checkout..."
- Wayfair's `<title>`: "Access to this page has been denied"

---

## Issue 2: Empty Capabilities (Critical)

Out of 4 freshly scanned brands, **zero** received meaningful capabilities. All show `capabilities: []` in brandData.

The agent collects scoring evidence successfully (18 citations for Wayfair, 34 for Chewy, 12 for Patagonia) but fails to translate that into `record_findings` capability values.

Example: Chewy (a pet store with robust e-commerce) should have capabilities like `price_lookup`, `stock_check`, `order_tracking` — but got none.

**Valid capabilities** (from `lib/procurement-skills/taxonomy/capabilities.ts`):
`price_lookup`, `stock_check`, `programmatic_checkout`, `business_invoicing`, `bulk_pricing`, `tax_exemption`, `account_creation`, `order_tracking`, `returns`, `po_numbers`

---

## Issue 3: Sector Always Falls to "specialty" (Significant)

All 4 new scans got `sector: "specialty"` (the fallback) despite being clearly identifiable:

| Domain | Expected Sector | Got |
|--------|:---:|:---:|
| chewy.com | pets | specialty |
| wayfair.com | home | specialty |
| patagonia.com | fashion | specialty |
| bestbuy.com | electronics | specialty |

The agent either isn't setting sector in `record_findings`, or it's setting an invalid value that gets rejected by the validation at line 418 of `agent-scan.ts`.

**Valid sectors** (from `lib/procurement-skills/taxonomy/sectors.ts`):
`retail`, `office`, `fashion`, `health`, `beauty`, `saas`, `home`, `construction`, `automotive`, `electronics`, `food`, `sports`, `industrial`, `specialty`, `luxury`, `travel`, `entertainment`, `education`, `pets`, `garden`

---

## Issue 4: Legacy Sectors Don't Match Taxonomy (Data Quality)

Older brands in the DB have sectors that are NOT in the valid `VendorSector` type:

| Brand | Current Sector | Should Be |
|-------|:---:|:---:|
| Allbirds | `footwear` | `fashion` |
| Zappos | `footwear` | `fashion` |
| Bombas | `apparel` | `fashion` |
| REI | `outdoor` | `sports` |
| Staples | `uncategorized` | `office` |

These were assigned before the taxonomy was formalized and never migrated. The detail page's `SECTOR_ICONS` and `SECTOR_LABELS` maps won't match these values, causing them to render as raw text.

---

## Issue 5: checkoutMethods Always Defaults to browser_automation (Design Gap)

`buildVendorSkillDraft` hardcodes `checkoutMethods: ["browser_automation"]` at line 109 of `app/api/v1/scan/route.ts`.

The agent never overrides this because `record_findings` doesn't have a `checkoutMethods` field — it has `checkoutProviders` and `paymentMethods` but those map to different concepts. There's no logic to promote findings into actual checkout method values.

**Valid checkout methods** (from `lib/procurement-skills/taxonomy/checkout-methods.ts`):
`native_api`, `acp`, `x402`, `crossmint_world`, `self_hosted_card`, `browser_automation`

---

## Issue 6: No Taxonomy Object Generated (Structural)

Home Depot (the only brand with good data — scanned pre-fix with manual enrichment) has a `taxonomy` object:
```json
{
  "taxonomy": {
    "sector": "home",
    "subSectors": ["building materials", "tools", "appliances", "plumbing", "electrical", "paint"],
    "tier": "mid_range",
    "tags": ["pro xtra", "diy", "contractors", "home improvement"]
  }
}
```

None of the 4 new scans produced a taxonomy object. `buildVendorSkillDraft` doesn't create one even when the agent provides `subSectors`, `tier`, and `tags` via `record_findings`.

---

## Full Data Snapshot (All 11 Brands)

| Brand | Name Correct? | Sector Valid? | Capabilities | Checkout | brandData Quality |
|-------|:---:|:---:|:---:|:---:|:---:|
| Home Depot | Yes | Yes (`home`) | 4 real caps | `self_hosted_card` | Good (1995 bytes) |
| Bombas | Yes | No (`apparel`) | 5 caps in DB column | empty | Empty `{}` (pre-fix scan) |
| Chewy | Yes | No (`uncategorized`) | empty | `browser_automation` | Skeleton only (652 bytes) |
| Patagonia | **"burger"** | No (`uncategorized`) | empty | `browser_automation` | Skeleton only (666 bytes) |
| Wayfair | **"Previous Slide"** | No (`uncategorized`) | empty | `browser_automation` | Skeleton only (676 bytes) |
| Best Buy | **"reCAPTCHA"** | No (`uncategorized`) | empty | `browser_automation` | Skeleton only (666 bytes) |
| Allbirds | Yes | No (`footwear`) | empty | empty | Empty `{}` (pre-fix scan) |
| REI | Yes | No (`outdoor`) | empty | empty | Empty `{}` (pre-fix scan) |
| Staples | Yes | No (`uncategorized`) | empty | empty | Empty `{}` (pre-fix scan) |
| Target | Yes | Yes (`retail`) | empty | empty | Empty `{}` (pre-fix scan) |
| Zappos | Yes | No (`footwear`) | empty | empty | Empty `{}` (pre-fix scan) |

---

## Root Cause Summary

The AI agent is effective at collecting **scoring evidence** (visits pages, records rubric signals, produces decent ASX scores) but poor at calling `record_findings` with accurate metadata. The agent prompt treats `record_findings` as a secondary task ("Step 4") after evidence gathering, so it often:
1. Misidentifies brand names by picking up UI text (menu labels, carousel controls, CAPTCHA text)
2. Skips or rushes the sector/capability/taxonomy identification
3. Never constructs a proper taxonomy object

Additionally, `buildVendorSkillDraft` has structural gaps:
- Hardcodes `checkoutMethods` to `["browser_automation"]`
- Doesn't build a `taxonomy` object from available findings
- Uses the agent's potentially-bad name with no sanity check against the domain

The `extractMeta` fallback is also unreliable for bot-hostile sites that serve redirect/CAPTCHA/access-denied pages.

---

## Key Files

| File | Role |
|---|---|
| `app/api/v1/scan/route.ts` | Scan API route, name resolution, `buildVendorSkillDraft`, upsert |
| `lib/agentic-score/agent-scan.ts` | AI agent loop, `record_findings` tool schema, sector/capability validation |
| `lib/agentic-score/extract-meta.ts` | Title-tag-based name extraction fallback |
| `lib/procurement-skills/taxonomy/sectors.ts` | Valid sector enum and labels |
| `lib/procurement-skills/taxonomy/capabilities.ts` | Valid capability enum and labels |
| `lib/procurement-skills/taxonomy/checkout-methods.ts` | Valid checkout method enum and labels |
