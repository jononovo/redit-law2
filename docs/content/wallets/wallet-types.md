# Wallet Types

CreditClaw supports several wallet types — called **rails** — that give your AI agents different ways to spend money. Each rail is designed for a specific use case, so you can pick the one that fits how your bot operates.

## Stripe / USDC Wallet (Rail 1)

The <a href="/stripe-wallet" target="_blank">**Stripe Wallet**</a> is a custodial USDC wallet powered by Privy and Stripe. It's the fastest way to get started.

- **Currency**: USDC (on Base network)
- **Funding**: Card/Bank via Stripe, Base Pay, or direct crypto transfer
- **Best for**: API payments, x402 protocol purchases, digital services
- **Key features**:
  - Instant wallet creation — no card details required
  - Built-in spending guardrails (per-transaction, daily, monthly limits)
  - Approval workflows for purchases above a threshold
  - Full transaction history with on-chain verification

## Card Wallet (Rail 2)

The <a href="/card-wallet" target="_blank">**Card Wallet**</a> is a custodial wallet powered by Crossmint, designed for purchasing physical goods through the Crossmint WorldStore.

- **Currency**: USDC (on Base network)
- **Funding**: Card/Bank via Stripe, Base Pay, or direct crypto transfer
- **Best for**: Physical goods procurement, e-commerce purchases
- **Key features**:
  - Product search and ordering through Crossmint WorldStore
  - Order tracking with shipping status updates
  - Merchant category controls (allowlist/blocklist)
  - Auto-pause when balance reaches zero

## Sub-Agent Cards (Rail 4)

<a href="/sub-agent-cards" target="_blank">**Sub-Agent Cards**</a> are self-hosted encrypted credit cards that you bring to CreditClaw. You provide your own card details, and CreditClaw encrypts them using split-knowledge encryption so your bot can use the card without ever seeing the full number.

- **Currency**: Your card's native currency (USD, EUR, etc.)
- **Funding**: Your existing credit/debit card — no separate funding step
- **Best for**: Using your existing cards with AI agents, maximum control over card choice
- **Key features**:
  - Split-knowledge encryption — no single system holds the full card number
  - You set the use case and allowance (daily, weekly, or monthly)
  - Decoy profiles add an extra layer of security
  - Download encrypted card file or deliver directly to your bot

## Self-Hosted Encrypted Cards (Rail 5)

<a href="/self-hosted" target="_blank">**Self-Hosted Encrypted Cards**</a> are similar to Sub-Agent Cards but use end-to-end encryption with a key that only you and your bot share. CreditClaw never has access to the decrypted card details.

- **Currency**: Your card's native currency
- **Funding**: Your existing credit/debit card
- **Best for**: Maximum security, compliance-sensitive environments
- **Key features**:
  - End-to-end encryption with AES-256
  - Encryption key is generated in your browser and shared only with your bot
  - Per-transaction, daily, and monthly spending limits
  - Human approval threshold — require your sign-off above a certain amount
  - Card brand and last-4 digits visible for identification without exposing full details

## Choosing the Right Wallet Type

| Feature | Stripe Wallet | Card Wallet | Sub-Agent Card | Self-Hosted Card |
|---------|--------------|-------------|----------------|------------------|
| Setup speed | Instant | Instant | ~5 minutes | ~5 minutes |
| Bring your own card | No | No | Yes | Yes |
| Physical goods | Limited | Yes | Depends on card | Depends on card |
| Digital services | Yes | Limited | Yes | Yes |
| Encryption model | Custodial | Custodial | Split-knowledge | End-to-end |
| Funding required | Yes | Yes | No | No |

Most users start with a **Stripe Wallet** for digital purchases and add a **Card Wallet** if they need physical goods. **Sub-Agent** and **Self-Hosted Cards** are for advanced users who want to use their own payment cards with their bots.


## Next Steps

- [Creating a Wallet](/docs/wallets/creating-a-wallet) — Set up your first wallet
- [Funding Your Wallet](/docs/wallets/funding-your-wallet) — Add funds to get started
- [Self-Hosted & Encrypted Cards](/docs/wallets/encrypted-cards) — Advanced card security options
