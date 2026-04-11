# Sales Tracking

The Sales page gives you a complete view of every payment received through your checkout pages and invoices. Each completed payment creates a sale record you can review and filter.

## Viewing Sales

Navigate to <a href="/sales" target="_blank">**Sales**</a> in the dashboard sidebar. The page displays a table of all incoming payments with the following columns:

| Column | Description |
|--------|-------------|
| **Date** | When the payment was initiated, shown as date and time |
| **Sale ID** | A unique identifier for the sale |
| **Checkout Page** | Which checkout page the payment came through (clickable link) |
| **Amount** | The payment amount in USD |
| **Method** | The payment method used (Card/Bank, USDC Direct, x402, or Base Pay) |
| **Buyer** | The buyer's email or wallet address |
| **Status** | Current status of the sale |

## Sale Statuses

| Status | Meaning |
|--------|---------|
| **Pending** | Payment has been initiated but not yet confirmed |
| **Confirmed** | Payment has been verified and funds are in your wallet |
| **Failed** | The payment attempt failed |
| **Refunded** | The payment was refunded to the buyer |

## Filtering Sales

Use the filters at the top of the page to narrow your results:

- **Status** — Filter by Pending, Confirmed, Failed, or Refunded
- **Payment Method** — Filter by Card/Bank, USDC Direct, or x402

Filters apply immediately, updating the table in real time.

## Sale Details

Click any sale row to open its detail page. The detail view shows:

- Full sale ID and timestamp
- Checkout page information
- Payment amount and method
- Buyer details (email, wallet address, or identifier)
- Confirmation timestamp (when the payment was finalized)
- Transaction status

## Payment Method Badges

Each sale shows a color-coded badge indicating the payment method:

- 🔵 **Card / Bank** — Stripe Onramp payment
- 🟣 **USDC Direct** — Direct USDC transfer
- 🟢 **x402** — x402 protocol payment

## Tips

- **Check regularly** — Sales appear as soon as a payment is initiated, even before confirmation
- **Use filters** — If you have many sales, filter by status to focus on pending or confirmed payments
- **Click through** — Each sale links back to its checkout page for context

## Next Steps

- [Checkout Pages](/docs/selling/checkout-pages) — Create new checkout pages to receive more sales
- [Invoices](/docs/selling/invoices) — Send itemized bills to specific buyers
- [Viewing Transactions](/docs/transactions/viewing-transactions) — See all wallet activity in one place
