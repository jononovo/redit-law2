# Invoices

Invoices let you send itemized bills to specific recipients. Each invoice generates a checkout page behind the scenes, so buyers pay through the same secure flow used by standalone checkout pages.

## Creating an Invoice

Navigate to <a href="/invoices" target="_blank">**Invoices**</a> in the dashboard sidebar, then click **Create Invoice**.

### Setting Up the Invoice

1. **Select a Checkout Page** — Choose which checkout page to associate the invoice with. The wallet linked to that checkout page will receive the payment.

2. **Add Line Items** — Each line item has:
   - **Description** — What the item or service is (e.g., "Monthly API access")
   - **Quantity** — How many units
   - **Unit Price (USD)** — Price per unit

   You can add multiple line items. The subtotal is calculated automatically.

3. **Tax (optional)** — Add a flat tax amount in USD if applicable.

4. **Recipient Details**:
   - **Recipient Name** — The person or company being billed
   - **Recipient Email** — Where the invoice will be sent

5. **Due Date (optional)** — Set a payment deadline.

6. **Notes (optional)** — Add any additional information for the recipient.

### Totals

The invoice automatically calculates:
- **Subtotal** — Sum of all line items (quantity × unit price)
- **Tax** — The tax amount you entered
- **Total** — Subtotal + Tax

## Sending an Invoice

After creating an invoice, it starts in **Draft** status. To send it:

1. Open the invoice detail page by clicking on it in the invoice list
2. Click **Send Invoice**
3. The recipient receives an email with the invoice details and a payment link

The invoice status changes to **Sent** after sending.

## Invoice Statuses

| Status | Meaning |
|--------|---------|
| **Draft** | Created but not yet sent to the recipient |
| **Sent** | Email delivered to the recipient |
| **Viewed** | The recipient has opened the payment link |
| **Paid** | Payment has been completed |
| **Cancelled** | Invoice was cancelled by the seller |

## Managing Invoices

### Viewing All Invoices

The Invoices page shows a table of all your invoices with:
- **Date** — When the invoice was created
- **Reference Number** — A unique identifier (e.g., `INV-001`)
- **Recipient** — Name or email of the billed party
- **Product** — Summary of line items
- **Amount** — Total amount due
- **Due Date** — Payment deadline (if set)
- **Status** — Current invoice status

### Filtering

Use the filters at the top of the page to narrow your view:
- **Status** — Show only drafts, sent, paid, or cancelled invoices
- **Date Range** — Filter by creation date (From / To)

### Invoice Detail Page

Click any invoice row to open its detail page, where you can:
- View the full invoice with all line items
- Copy the payment link
- Send (or re-send) the invoice via email
- Cancel the invoice

### Cancelling an Invoice

On the invoice detail page, click **Cancel Invoice** to void it. This prevents the recipient from making a payment. Cancelled invoices remain in your list for record-keeping.

## Next Steps

- [Checkout Pages](/docs/selling/checkout-pages) — The payment pages behind every invoice
- [Sales Tracking](/docs/selling/sales-tracking) — Track when invoices get paid
- [Shop](/docs/selling/shop) — Set up your business details for invoices
