# TestTopia Shop Brand Guide

TestTopia is the mock e-commerce store used in the Full-Shop Agent Testing Suite. It has its own visual identity separate from the platform tenants (CreditClaw, shopy.sh, brands.sh).

## Color System

### Primary (Call-to-Action)
- **Usage:** Main action buttons only — "Add to Cart", "Proceed to Checkout", "Place Order", "Return to Testing Home"
- **Values:** `indigo-600` / `rgb(79, 70, 229)`, hover `indigo-700`
- **Text:** White
- **Rule:** Reserved for the single most important action on any page. Only one primary button per view.

### Secondary (Selection Indicator)
- **Usage:** Selected variant buttons (color, size), selected shipping/payment options, active states
- **Values:** `indigo-400` / `rgb(99, 102, 241)`, hover `indigo-500`
- **Text:** White
- **Rule:** Visually distinct from primary — slightly lighter/softer. Indicates "this is chosen" without competing with the CTA.

### Neutral (Inactive / Default)
- **Usage:** Unselected variant buttons, inactive search button, quantity +/- buttons, default borders
- **Values:** `gray-200` bg / `gray-300` border / `gray-700` text
- **Rule:** Default resting state. The search button uses this when the input is empty, switching to primary when text is entered.

### Surface
- **Page background:** `gray-50`
- **Cards/containers:** `white`
- **Inputs:** `white` with `gray-300` border

### Text
- **Headings:** `gray-900`
- **Body:** `gray-700`
- **Muted/labels:** `gray-500`
- **Prices:** `indigo-600` (matches primary for visual connection)

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

1. **Primary CTA** — solid indigo-600, white text, full width on product/checkout pages
2. **Selected variant** — solid indigo-400, white text, shadow-sm
3. **Unselected variant** — gray-300 border, gray-900 text, hover darkens border
4. **Search button** — gray when empty input, primary indigo when text entered
5. **Input focus ring** — indigo-500

## Config File

All colors are centralized in `features/agent-testing/full-shop/shared/shop-brand.ts`. Import from there rather than hardcoding Tailwind classes.
