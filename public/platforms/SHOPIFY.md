---
name: platform-shopify
platform: shopify
updated: 2026-03-16
phase: procurement / browsing / navigation
---

# Shopify — Platform Guide

Use this guide when browsing, navigating, or shopping on a Shopify store. For filling payment forms at checkout, see `checkouts/SHOPIFY.md`.

---

## Detection Signals

Run on any page (homepage, collection, product) to confirm Shopify:

### Tier 1 — Definitive (any one = Shopify)

| Signal | How to check |
|--------|-------------|
| `window.Shopify` global | `typeof Shopify !== 'undefined'` — always present on every Shopify page |
| `Shopify.shop` | Returns the `.myshopify.com` domain |
| `Shopify.theme` | Returns `{ name, id }` of the active theme |
| `cdn.shopify.com` in scripts | Any `<script src="...cdn.shopify.com...">` |
| `monorail-edge.shopifysvc.com` | In `<link rel="preconnect">` — Shopify's analytics edge |

### Tier 2 — Structural DOM patterns

| Signal | How to check |
|--------|-------------|
| Section IDs | `document.querySelectorAll('[id^="shopify-section"]')` — template sections |
| Payment button | `[data-shopify="payment-button"]` or `.shopify-payment-button` — "Buy it now" |
| Add to cart form | `form[action*="/cart/add"]` |
| Cart form | `form[action="/cart"]` |
| `ShopifyAnalytics` global | `typeof ShopifyAnalytics !== 'undefined'` |

### Detection Script

```javascript
var isShopify = (typeof Shopify !== 'undefined' && !!Shopify.shop)
  || !!document.querySelector('script[src*="cdn.shopify.com"]')
  || !!document.querySelector('link[href*="monorail-edge.shopifysvc.com"]');
```

One line. No snapshots needed.

---

## Useful Globals

Once confirmed Shopify, these are available:

| Global | Value |
|--------|-------|
| `Shopify.shop` | Store domain (e.g. `legoclaw.myshopify.com`) |
| `Shopify.locale` | Language (e.g. `en`) |
| `Shopify.currency.active` | Currency code (e.g. `USD`) |
| `Shopify.routes.root` | Store root path |
| `Shopify.theme.name` | Theme name (e.g. `Horizon`, `Dawn`) |

---

## URL Patterns

Shopify stores follow a consistent URL structure regardless of theme:

| Page type | URL pattern | Example |
|-----------|-------------|---------|
| Homepage | `/` | `store.com/` |
| All products | `/collections/all` | `store.com/collections/all` |
| Collection | `/collections/{handle}` | `store.com/collections/shirts` |
| Product | `/products/{handle}` | `store.com/products/short-sleeve-shirt` |
| Cart | `/cart` | `store.com/cart` |
| Search | `/search?q={query}` | `store.com/search?q=shirt` |
| Checkout | `/checkouts/cn/...` | Redirects to Shopify-hosted checkout |

---

## Navigation Flow

### Browsing Products

Don't snapshot the full page — Shopify pages can be large. Target specific sections:

**On collection/catalog pages:**
- Products are in a grid. Each product links to `/products/{handle}`.
- Look for product cards with price and title.

**On product pages:**
- Product info is structured: title, price, variant selectors, add-to-cart.
- Target the product form: `form[action*="/cart/add"]`

### Variant Selection

Shopify products can have variants (size, color, etc.). These appear as:
- **Buttons/swatches** — click to select (most common in modern themes)
- **Dropdowns** — `<select>` elements inside the product form

Selecting a variant updates the URL with `?variant={id}` and may change the price.

### Adding to Cart

Two paths:

1. **"Add to cart"** → adds item, stays on page (or opens cart drawer)
   - Form: `form[action*="/cart/add"]`
   - Button: `button[type="submit"]` inside that form

2. **"Buy it now"** → skips cart, goes straight to checkout
   - Button: `[data-shopify="payment-button"]` or `.shopify-payment-button`
   - This triggers Shopify's dynamic checkout — redirects to `/checkouts/cn/...`

**Recommendation:** Use "Buy it now" when purchasing a single item. It saves a step (skips the cart page entirely).

### Cart Page

If items were added to cart:
- Navigate to `/cart`
- The checkout button is typically `button[name="checkout"]` or a link to `/checkout`
- Some stores use cart drawers (slide-out panels) instead of a separate cart page

---

## Shopify Themes

Themes change the visual layout but not the underlying structure. Common themes:
- **Dawn** (default) — clean, grid-based
- **Horizon** — editorial style
- **Refresh**, **Taste**, **Sense** — various Shopify 2.0 themes

The detection signals, URL patterns, and form structures are the same across all themes.

---

## After Detection → Checkout

When the agent is ready to purchase:
1. Click "Buy it now" or proceed from cart
2. The checkout page loads at `/checkouts/cn/...`
3. Switch to `checkouts/SHOPIFY.md` for payment form filling instructions
