# Checkout Pages

Checkout pages are shareable payment pages you create to accept payments from anyone — bots, humans, or other agents. Each page gets a unique URL that buyers visit to complete a payment.

## Creating a Checkout Page

Navigate to <a href="/checkout/create" target="_blank">**Checkout**</a> in the dashboard sidebar, then click **Create Checkout Page**. You'll need to fill in a few fields:

### Required Fields

- **Title** — A name for the checkout page (e.g., "API Access Plan" or "Premium Subscription")
- **Wallet** — The Stripe Wallet where funds will be deposited. Only active wallets are shown.

### Optional Fields

- **Description** — A brief explanation of what the buyer is paying for
- **Amount (USD)** — A fixed price. Leave blank to let the buyer enter any amount.
- **Lock Amount** — When enabled, the buyer cannot change the price. When disabled, the amount is a suggestion they can adjust.
- **Page Type** — Choose between "Product" (standard checkout), "Event" (shows a buyer count on the page), or "Digital Product" (delivers a URL to the buyer after payment)
- **Digital Product URL** — When "Digital Product" is selected, enter the URL that buyers will receive after payment. Use a secure or signed URL. This field only appears when Digital Product is selected as the page type.
- **Product Image URL** — An image displayed on the checkout page
- **Collect Buyer Name** — When toggled on, buyers are prompted for their name before payment
- **Payment Methods** — Select which payment methods buyers can use (x402 Protocol, USDC Direct, Stripe Onramp, Base Pay)
- **Custom Success URL** — Redirect buyers to a specific URL after payment
- **Custom Success Message** — Display a custom thank-you message after payment
- **Expiry** — Set a date/time after which the checkout page is no longer active

### Seller Info

Your seller profile information (business name, logo, email) is automatically pulled from the **Your Details** section on the [Shop](/docs/selling/shop) page. All checkout pages use the same seller identity.

## Sharing a Checkout Page

After creating a page, you'll see a confirmation banner with the checkout URL. Click **Copy** to copy the link to your clipboard. You can share this URL anywhere — in emails, on your website, in chat messages, or in your bot's responses.

Each checkout page URL follows the pattern: `https://creditclaw.com/pay/{checkout-page-id}`

## Managing Existing Pages

All your checkout pages are listed below the creation form. Each card shows:

- **Title and status** (active, paused, expired)
- **Amount** — Fixed price or "Open amount"
- **Payment count** — How many payments have been made
- **Total received** — Sum of all confirmed payments
- **View count** — How many times the page has been visited

### Editing a Page

Click the **pencil icon** on any checkout page card to open the edit drawer. You can update:

- Title and description
- Amount and lock setting
- Payment methods
- Status (active or paused)
- Success URL and message
- Expiry date

### Pausing and Reactivating

Set the status to **paused** to temporarily stop accepting payments without deleting the page. Switch back to **active** to resume.

## Payment Methods

When creating a checkout page, you choose which payment methods are available to buyers:

| Method | Description |
|--------|-------------|
| **x402 Protocol** | Bot-to-bot payments using the x402 standard |
| **USDC Direct** | Direct USDC transfer from any wallet |
| **Stripe Onramp (Card/Bank)** | Traditional card or bank payment via Stripe |
| **Base Pay (USDC)** | One-tap USDC payment from a Base wallet |

You must enable at least one method. Most sellers enable multiple methods to give buyers flexibility.

## Next Steps

- [Payment Methods](/docs/selling/payment-methods) — Learn how each payment option works
- [Invoices](/docs/selling/invoices) — Send itemized bills to specific recipients
- [Shop & Storefront](/docs/selling/shop) — Display your checkout pages in a public storefront
