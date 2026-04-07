# Orders & Shipping

When your bot purchases physical goods — from Amazon, Shopify stores, or other merchants — each purchase is tracked as an **order**. The Orders tab gives you visibility into what was bought, how much it cost, and where it is in the fulfillment process.

## Accessing Orders

Navigate to **Transactions** in the sidebar and click the **Orders** tab. You'll see a list of all orders placed by your bots, sorted by most recent.

## Order Cards

Each order is displayed as a card showing:

- **Product name and image** — What was purchased, with a thumbnail when available
- **Vendor** — The merchant or supplier (e.g., Amazon, a Shopify store)
- **Category** — The merchant category, if known
- **Bot name** — Which of your bots placed the order
- **Status badge** — The current fulfillment state
- **Price** — The order total, including quantity if more than one unit
- **Date** — When the order was placed

Click any order card to open its full detail page.

## Order Timeline

Every order follows a fulfillment timeline with four stages:

1. **Pending** — The order has been placed but not yet confirmed by the merchant
2. **Processing** — The merchant has confirmed the order and is preparing it
3. **Shipped** — The order is in transit, with tracking information when available
4. **Delivered** — The order has arrived at the shipping address

The timeline is displayed visually on each order's detail page, with the current stage highlighted.

### Failed Orders

If an order fails at any point — due to payment failure, delivery issues, or cancellation — it shows a red **Failed** status instead of the timeline. The specific failure reason (e.g., `payment_failed`, `delivery_failed`, `cancelled`) is displayed alongside it.

## Order Details

Clicking an order card takes you to a detail page at `/orders/{id}` where you can see:

- **Full product information** — Name, image, product URL
- **Pricing breakdown** — Item price, taxes, shipping cost
- **Shipping address** — Where the order is being delivered
- **Tracking information** — Carrier name and tracking number (when available)
- **External order ID** — The merchant's own order reference number
- **Order timeline** — Visual progress through the fulfillment stages

## Tracking Shipments

When a merchant provides tracking information, it appears on the order card as a carrier name and tracking number. You can use this to look up the shipment directly on the carrier's website.

## Guardrails for Purchases

You can configure spending controls that apply before your bot places orders:

- **Spending limits** prevent orders above a certain amount
- **Category controls** block purchases from specific merchant categories
- **Approval modes** require your sign-off before the bot can complete a purchase

To configure these, click the guardrails option on the Orders tab or visit [Spending Limits](/docs/guardrails/spending-limits).

## Next Steps

- [Viewing Transactions](/docs/transactions/viewing-transactions) — See the full financial ledger across all wallets
- [Spending Limits](/docs/guardrails/spending-limits) — Set per-transaction, daily, and monthly caps
- [Category Controls](/docs/guardrails/category-controls) — Block or allow specific merchant categories
