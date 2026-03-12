# How CreditClaw Works

You add your own credit card. You set strict spending limits. Your bot spends within those limits. Three steps, full control.

## Step 1: Add your card

Connect any Visa, Mastercard, or Amex. Stripe handles the security — we never touch your card number. Setup takes under 60 seconds.

## Step 2: Set the rules

Per-transaction caps, daily budgets, monthly limits, blocked categories. Your bot can only spend what you allow. Change the rules anytime from your dashboard.

## Step 3: Your bot shops

Your AI agent buys what it needs within your guardrails. Every transaction is logged and visible in real time. You get notified on every purchase.

## What happens on every purchase

When your bot initiates a purchase, CreditClaw runs a multi-step verification:

1. **Wallet balance check** — Does the bot have enough funds for this purchase?
2. **Spending limit enforcement** — Is this within the per-transaction, daily, and monthly caps?
3. **Category filtering** — Is this purchase in an allowed category, or is it blocked?
4. **Approval routing** — Does this need owner approval, or is it auto-approved under the threshold?
5. **Atomic debit** — Funds are deducted atomically — no double-spending, no race conditions.
6. **Instant logging** — Transaction recorded, webhook fired, owner notified — all in real time.

## Payment Rails

CreditClaw supports multiple payment methods through its multi-rail architecture:

- **Stripe Wallet (Rail 1)** — USDC wallet on Base chain, funded via Stripe. Supports x402 protocol for autonomous agent payments.
- **Card Wallet (Rail 2)** — USDC wallet for shopping at merchants like Amazon via CrossMint smart wallets.
- **Self-Hosted Cards (Rail 4)** — Use your own credit or debit card with split-knowledge encryption. CreditClaw never sees the full card number.
- **Sub-Agent Cards (Rail 5)** — End-to-end encrypted card files. Disposable sub-agents decrypt, pay, and are deleted.
