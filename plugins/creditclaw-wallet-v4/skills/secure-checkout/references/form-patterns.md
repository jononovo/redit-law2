# Checkout Form Patterns by Platform

Reference for identifying and filling payment form fields across common e-commerce platforms.

## Platform Detection

Before filling fields, identify the platform from the page source:

| Signal | Platform |
|--------|----------|
| `cdn.shopify.com` or `Shopify.theme` | Shopify |
| `/wp-content/plugins/woocommerce/` | WooCommerce |
| `static.squarespace.com` | Squarespace |
| `wixstatic.com` | Wix |
| `js.stripe.com` in scripts or iframes | Stripe Elements (any platform) |
| `adyen` in scripts or iframes | Adyen |
| `braintreegateway.com` | Braintree |

## Shopify

Card fields are inside **cross-origin iframes** — one iframe per field (number, expiry, CVV, name). `javascript_tool` cannot access them. `form_input` cannot set their values (container is a DIV, not an input). Use the `checkout-shopify` skill for the complete approach.

Key facts:
- Iframe names: `card-fields-number-*`, `card-fields-expiry-*`, `card-fields-verification_value-*`, `card-fields-name-*`
- Expiry field requires individual key presses with 2-second delays (auto-formatting)
- Single-page checkout: shipping + payment on same page
- Phone number is often required
- Address autocomplete suggestions appear after typing — click to auto-fill city/state/zip
- Submit button: "Pay now" (`button[type=submit]`)
- "Same as billing" checkbox is often pre-checked; leave it
- Fill order: email, name, address (click autocomplete), phone, then card fields, then Pay now

## WooCommerce

Card fields are usually inside a **Stripe iframe**.

1. Fill billing fields on the main page first
2. If a "Credit Card" radio button exists, click it
3. Locate the Stripe iframe: look for `iframe[src*='js.stripe.com']`
4. Fill card fields inside the iframe context using `javascript_tool`
5. Switch back to main page context to click "Place order"

## Stripe Elements (Any Platform)

Stripe uses cross-origin iframes (`js.stripe.com`). May be one combined iframe or separate iframes per field.

**Single iframe (Card Element):**
- One iframe contains all fields: `cardnumber`, `exp-date`, `cvc`
- Iframe src contains `js.stripe.com`

**Split iframes (individual elements):**
- Separate iframes for number, expiry, CVC
- Each needs individual filling via `computer` tool clicking + typing

**Fill approach (same as Shopify):** `javascript_tool` cannot access cross-origin Stripe iframes. Use `find` to locate fields, `computer` to click + type values. The submit button is always on the main page, not inside the iframe.

A dedicated `checkout-stripe` skill is planned.

## Multi-Step Checkouts

BigCommerce, some Magento, some custom sites use multi-step flows.

After each "Continue" or "Next" click, wait for the page to update before reading the next section. Fill visible fields, click continue, repeat.

## Handling Dropdowns

**Native `<select>` elements:** Use `form_input` with the value text.

**Custom/React dropdowns:** Click the trigger element, type to filter, then press Enter. If typing doesn't filter, use arrow keys to navigate, then Enter.

## Common Field Labels

| What to Fill | Common Labels |
|-------------|---------------|
| Card number | "Card number", "Credit card number", "Card No." |
| Expiry | "Expiration date", "MM/YY", "Exp. date", "Valid thru" |
| CVV | "Security code", "CVV", "CVC", "Card code" |
| Name | "Name on card", "Cardholder name", "Card holder" |

## When to Stop

Immediately stop and tell the user if:
- A CAPTCHA appears
- 3D Secure verification is triggered
- An OTP/SMS code is requested
- The page asks for a password or account login

These require human intervention. Report the situation and let the user complete manually.
