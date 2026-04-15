# TestTopia Shop Brand Guide

TestTopia is the mock e-commerce store used in the Full-Shop Agent Testing Suite. It has its own visual identity separate from the platform tenants (CreditClaw, shopy.sh, brands.sh).

## Config File

All colors are centralized in:

```
features/agent-testing/full-shop/shared/shop-brand.ts
```

Every shop page imports from this file. No hardcoded color classes in page files — change the brand once, it flows everywhere.

## Color System

### Primary — Teal 700 (Call-to-Action)
- **Usage:** Main action buttons — "Add to Cart", "Proceed to Checkout", "Pay Now", search button (active), "Return to Testing Home"
- **Tailwind:** `bg-teal-700` / `hover:bg-teal-800`
- **Hex:** `#0f766e`
- **Text:** White
- **Rule:** Reserved for the single most important action on any page. Only one primary button per view.

### Secondary — Teal 500 (Selection Indicator)
- **Usage:** Selected variant buttons (color, size), selected shipping/payment radio options
- **Tailwind:** `bg-teal-500` / `border-teal-500` / selected radio: `border-teal-500 bg-teal-50`
- **Hex:** `#14b8a6`
- **Text:** White (variant buttons), dark (radio labels)
- **Rule:** Indicates "this is chosen" without competing with the CTA.

### Focus Ring — Teal 600
- **Usage:** All form inputs and selects across checkout and payment pages
- **Tailwind:** `focus:ring-teal-600`
- **Rule:** Consistent across every input. Bridges primary and secondary visually.

### Neutral (Inactive / Default)
- **Usage:** Unselected variant buttons, inactive search button, quantity +/- buttons, default borders
- **Values:** `gray-200` bg / `gray-300` border / `gray-700` text
- **Rule:** Default resting state. Search button uses this when input is empty, switches to primary when text is entered.

### Surface
- **Page background:** `gray-50`
- **Cards/containers:** `white`
- **Inputs:** `white` with `gray-300` border

### Text
- **Headings:** `gray-900`
- **Body:** `gray-700`
- **Muted/labels:** `gray-500`
- **Prices:** `text-teal-700` (matches primary for visual connection)
- **Hover links:** `group-hover:text-teal-700` (product names on homepage/search)

### State Colors
- **Success:** `green-500` (e.g., "Added to Cart" confirmation)
- **Disabled:** `gray-300` background, `gray-400` text

## Typography

- **Font family:** System UI stack (`system-ui, -apple-system, sans-serif`)
- **Headings:** Bold (`font-bold`)
- **Body:** Normal (`font-normal`)
- **Labels:** Medium (`font-medium`)
- **Buttons:** Semibold (`font-semibold`)

## Component Hierarchy

1. **Primary CTA** — solid teal-700, white text, full width on product/checkout/payment pages
2. **Selected variant** — solid teal-500, white text, shadow-sm
3. **Unselected variant** — gray-300 border, gray-900 text, hover darkens border
4. **Selected radio** — teal-500 border, teal-50 background
5. **Search button** — gray when empty input, teal-700 when text entered
6. **Input focus ring** — teal-600
7. **Price text** — teal-700
8. **Hover links** — teal-700

## Pages Using Brand

All import from `shop-brand.ts` or use the teal values directly:

- `layout.tsx` — header search input/button, timeout screen CTA
- `page.tsx` — category card hover
- `search/page.tsx` — product name hover
- `product/[slug]/page.tsx` — price color, variant buttons, add-to-cart CTA
- `cart/page.tsx` — checkout CTA
- `checkout/page.tsx` — form inputs, shipping/payment radios, continue CTA
- `payment/page.tsx` — card form inputs, pay CTA
