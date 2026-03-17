---
name: creditclaw-procurement
version: 2.9.0
updated: 2026-03-16
description: "Discover vendors, identify platforms, and navigate stores — everything before checkout."
parent: ./SKILL.md
api_base: https://creditclaw.com/api/v1
credentials: [CREDITCLAW_API_KEY]
---

# CreditClaw — Procurement

> **Companion file.** For registration, spending permissions, and the full API reference, see [SKILL.md](./SKILL.md).

This guide covers everything that happens **before checkout**: identifying what kind of site you're on, navigating it efficiently, finding products, and getting to the point of purchase.

---

## Step 1: Check for a Known Vendor Skill

Before navigating manually, check if CreditClaw has a verified skill for this merchant:

```bash
curl "https://creditclaw.com/api/v1/bot/skills?search=MERCHANT_NAME" \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY"
```

If a vendor skill exists → use it. It contains merchant-specific instructions that are faster and more reliable than generic navigation.

If no vendor skill exists → continue to Step 2.

---

## Step 2: Identify the Platform

Land on the site and run platform detection. This tells you what e-commerce platform powers the site, which determines how to navigate, browse, and eventually check out.

**Run this via `evaluate` (OpenClaw) or `javascript_tool` (Claude) on any page:**

```javascript
var p = 'unknown';
if (typeof Shopify !== 'undefined' && Shopify.shop) p = 'shopify';
else if (document.querySelector('link[href*="woocommerce"], .woocommerce')) p = 'woocommerce';
else if (document.querySelector('script[src*="squarespace.com"]')) p = 'squarespace';
else if (document.querySelector('script[src*="cdn-bc.com"]') || typeof BCData !== 'undefined') p = 'bigcommerce';
else if (document.querySelector('meta[name="generator"][content*="Wix"]')) p = 'wix';
p;
```

**Route to the platform guide:**

| Result | Platform Guide | Checkout Guide |
|--------|---------------|----------------|
| `shopify` | → `platforms/SHOPIFY.md` | → `checkouts/SHOPIFY.md` |
| `woocommerce` | → `platforms/GENERIC.md` | → `checkouts/GENERIC.md` |
| `squarespace` | → `platforms/GENERIC.md` | → `checkouts/GENERIC.md` |
| `bigcommerce` | → `platforms/GENERIC.md` | → `checkouts/GENERIC.md` |
| `unknown` | → `platforms/GENERIC.md` | → `checkouts/GENERIC.md` |

**Read the matching platform guide** for navigation instructions, URL patterns, and shopping flow.

---

## Step 3: Browse & Select Products

Follow the platform guide to:
1. Navigate to the product or collection page
2. Select the correct variant (size, color, quantity)
3. Add to cart or use "Buy it now"

**General tips (all platforms):**
- Don't snapshot full pages — scope to product forms or specific sections
- Use URL patterns when possible (faster than clicking through navigation)
- Confirm price and item name before proceeding to checkout

---

## Step 4: Proceed to Checkout

When ready to purchase:
1. Navigate to or trigger checkout (platform guide explains how)
2. Switch to `CHECKOUT-GUIDE.md` for the purchase flow
3. The checkout guide handles: approval, decryption, form filling, confirmation

---

## Vendor Discovery API

Find vendors and merchants that CreditClaw has verified checkout skills for:

```bash
curl "https://creditclaw.com/api/v1/bot/skills" \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY"
```

**Query parameters** (all optional):

| Parameter | Description | Example |
|-----------|-------------|---------|
| `search` | Search by name or slug | `?search=amazon` |
| `category` | Filter by category | `?category=saas` |
| `checkout` | Filter by checkout method | `?checkout=guest,api` |
| `capability` | Filter by capability (all must match) | `?capability=returns,tracking` |
| `maturity` | Filter by skill maturity | `?maturity=verified,stable` |

Response:
```json
{
  "vendors": [
    {
      "slug": "cloudserve-pro",
      "name": "CloudServe Pro",
      "category": "saas",
      "url": "https://cloudserve.example.com",
      "checkout_methods": ["guest", "api"],
      "capabilities": ["returns", "tracking"],
      "maturity": "verified",
      "agent_friendliness": 0.85,
      "guest_checkout": true,
      "success_rate": 0.92,
      "skill_url": "https://creditclaw.com/api/v1/bot/skills/cloudserve-pro"
    }
  ],
  "total": 1,
  "categories": ["saas", "retail", "marketplace", "food", "software", "payments"]
}
```

## Get a Vendor Skill

```bash
curl "https://creditclaw.com/api/v1/bot/skills/cloudserve-pro" \
  -H "Authorization: Bearer $CREDITCLAW_API_KEY"
```

Returns the vendor's complete checkout instructions as Markdown.

| Field | Meaning |
|-------|---------|
| `agent_friendliness` | 0–1 score of how easy the checkout is for an agent |
| `guest_checkout` | Whether the vendor supports checkout without an account |
| `maturity` | Skill reliability: `verified`, `stable`, `beta`, `experimental` |
| `success_rate` | Historical success rate for agent checkouts |
