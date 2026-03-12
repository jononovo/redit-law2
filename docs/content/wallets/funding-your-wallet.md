# Funding Your Wallet

Stripe Wallets (Rail 1) and Card Wallets (Rail 2) need to be funded before your bot can make purchases. CreditClaw supports several funding methods.

> **Note**: Sub-Agent Cards (Rail 4) and Self-Hosted Cards (Rail 5) use your existing credit/debit cards directly and don't require separate funding.

## Opening the Fund Wallet Sheet

1. Go to your wallet page (<a href="/stripe-wallet" target="_blank">**Stripe Wallets**</a> or <a href="/card-wallet" target="_blank">**Card Wallets**</a>)
2. Select the wallet you want to fund
3. Click the **Fund** button in the wallet action bar
4. The funding sheet opens on the right side of the screen

## Setting the Amount

Enter the amount you want to add in USD. The minimum is **$1** and the maximum is **$10,000** per transaction. The amount is converted to USDC at the current rate.

## Funding Methods

### Card / Bank (Stripe)

Pay with a credit card, debit card, or bank account through Stripe's secure payment flow.

1. Enter your funding amount
2. Select **Card / Bank**
3. Complete the Stripe payment form
4. Funds appear in your wallet once the payment is confirmed

This is the most common funding method and supports most major card networks and bank transfers.

### Base Pay

Base Pay lets you fund your wallet with a single tap if you have a Base-compatible wallet (like Coinbase Wallet) connected to your browser.

1. Enter your funding amount
2. Select **Base Pay**
3. Approve the USDC transfer in your connected wallet
4. Funds arrive in your CreditClaw wallet within seconds

Base Pay is the fastest option if you already hold USDC on the Base network.

### Crypto Wallet (QR Code)

Send USDC from any crypto wallet by scanning a QR code or copying the wallet address.

1. Enter your funding amount
2. Select **Crypto Wallet**
3. A QR code and wallet address are displayed
4. Send USDC (on Base) to the displayed address from your external wallet
5. CreditClaw monitors the address and credits your wallet when the transfer is confirmed

This method works with any wallet that supports USDC on Base — hardware wallets, mobile wallets, or exchange withdrawals.

## Wallet Address

Every Stripe Wallet and Card Wallet has a unique USDC address on the Base network. You can find this address:

- In the funding sheet (displayed at the top with a copy button)
- On the wallet detail page

You can send USDC directly to this address at any time, even without using the funding sheet. The balance updates automatically.

## Transfers Between Wallets

You can transfer USDC between your own wallets:

1. Open the wallet you want to transfer **from**
2. Click **Transfer** in the action bar
3. Select the destination wallet
4. Enter the amount
5. Confirm the transfer

Transfers between your own wallets are instant and free. You can transfer between Stripe Wallets and Card Wallets in either direction.

## Funding Tips

- **Start small**: Fund with a small amount first to test your bot's purchasing behavior before adding larger sums
- **Set guardrails first**: Configure spending limits and approval modes before funding to ensure your bot operates within your comfort zone
- **Monitor balances**: Check wallet balances regularly from the dashboard — you can see all wallet balances at a glance
- **Auto-pause**: Card Wallets support auto-pause when the balance hits zero, preventing failed transactions


## Next Steps

- [Freezing & Controls](/docs/wallets/freezing-and-controls) — Set up spending limits and guardrails
- [Spending Limits](/docs/guardrails/spending-limits) — Configure per-transaction and daily caps
- [Checkout Pages](/docs/selling/checkout-pages) — Accept payments from others
