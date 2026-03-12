# Payment Methods

CreditClaw checkout pages support multiple payment methods so buyers can pay in the way that's most convenient for them. As a seller, you choose which methods to enable on each checkout page.

## Available Methods

### Card / Bank (Stripe Onramp)

The most familiar payment method for human buyers. Powered by Stripe, this option lets buyers pay with a credit card, debit card, or bank account. The payment is converted to USDC and deposited into your Stripe Wallet.

**How it works for buyers:**
1. Buyer selects "Card / Bank" on the checkout page
2. A Stripe payment form appears
3. Buyer enters card or bank details
4. Payment is processed and converted to USDC
5. Funds arrive in your wallet

**Best for:** Human buyers, traditional e-commerce, anyone without a crypto wallet.

### Base Pay (USDC)

A one-tap payment option for buyers who have a Base wallet with USDC. No card details needed — the buyer approves a single transaction from their wallet.

**How it works for buyers:**
1. Buyer selects "Base Pay" on the checkout page
2. A wallet connection prompt appears
3. Buyer approves the USDC transfer
4. Funds arrive in your wallet instantly

**Best for:** Crypto-native buyers, bot-to-human payments, fast settlements.

### x402 Protocol

The x402 protocol is a machine-to-machine payment standard. It allows bots and AI agents to make payments programmatically without human intervention. When a bot encounters a checkout page that supports x402, it can complete the payment automatically.

**How it works:**
1. Bot discovers the checkout page URL
2. Bot sends an x402 payment request with a signed payment header
3. Payment is verified on-chain and confirmed
4. Funds arrive in your wallet
5. If the checkout page is a **Digital Product**, the product URL is included in the payment response — the bot receives the deliverable automatically

x402 payments support **idempotent retry** — if a bot's connection drops after payment but before receiving the response, it can safely retry with the same payment and receive the original result (including the product URL) without being charged again.

**Best for:** Bot-to-bot commerce, API access payments, digital product delivery, automated procurement.

### USDC Direct

A straightforward USDC transfer. The buyer sends USDC directly to your wallet address. The checkout page displays the wallet address and monitors for incoming transfers.

**How it works for buyers:**
1. Buyer selects "USDC Direct" on the checkout page
2. The wallet address is displayed
3. Buyer sends USDC from any wallet or exchange
4. CreditClaw detects the transfer and confirms the sale

**Best for:** Buyers who already hold USDC and prefer a direct transfer.

## Choosing Methods for Your Checkout Page

When creating or editing a checkout page, you can enable or disable each method individually. At least one method must be enabled at all times.

**Recommended combinations:**

| Use Case | Suggested Methods |
|----------|-------------------|
| General e-commerce | Card/Bank + Base Pay + USDC Direct |
| Bot-facing API access | x402 + USDC Direct |
| Crypto-native audience | Base Pay + USDC Direct |
| Maximum reach | All methods enabled |

## How Sellers Receive Funds

Regardless of which payment method a buyer uses, all funds are deposited as USDC into the Stripe Wallet you selected when creating the checkout page. You can view incoming payments in the <a href="/sales" target="_blank">Sales</a> section of the dashboard, or read the [Sales Tracking](/docs/selling/sales-tracking) docs.

## Next Steps

- [Checkout Pages](/docs/selling/checkout-pages) — Create and manage your payment pages
- [Sales Tracking](/docs/selling/sales-tracking) — Monitor incoming payments
- [Invoices](/docs/selling/invoices) — Send itemized bills with payment links
