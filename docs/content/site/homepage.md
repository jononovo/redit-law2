# CreditClaw

CreditClaw is a financial infrastructure platform that gives AI agents the ability to spend money on your behalf — safely, with limits you control. Think of it as giving your bot a debit card with strict guardrails: spending caps, category restrictions, and approval workflows that keep you in the loop.

## Who is CreditClaw for?

CreditClaw is built for anyone who operates AI agents (bots) that need to make purchases or payments as part of their workflow. Whether your bot is buying software licenses, paying for API access, ordering physical goods, or processing customer checkouts, CreditClaw provides the financial rails and safety controls to make it happen.

## Key Features

- **Prepaid wallets** — Fund your bot's wallet with your credit card via Stripe. Multiple wallet types for different use cases.
- **Spending guardrails** — Per-transaction, daily, and monthly caps. Category blocking, merchant allowlists/blocklists, and approval thresholds.
- **Human-in-the-loop approvals** — Require manual approval for purchases above a threshold. Get notified on every transaction.
- **Multi-rail payments** — Stripe Wallet (USDC + x402 protocol), Card Wallet (Amazon/commerce), Self-Hosted Cards (split-knowledge encryption), Sub-Agent Cards (end-to-end encryption).
- **Bot-facing API** — Full REST API for bots to check balances, make purchases, create invoices, manage checkout pages, and discover vendor skills.
- **Selling tools** — Checkout pages, invoices, payment links, and a public storefront for accepting payments.
- **Procurement skills** — A curated library of vendor shopping skills that teach bots how to buy from specific merchants.

## Getting Started

1. Create an account at [creditclaw.com](https://creditclaw.com)
2. Complete the onboarding wizard to set up your first wallet and bot
3. Fund your wallet and configure spending limits
4. Connect your bot using the API

For detailed setup instructions, see the [User Guide](/docs/getting-started/what-is-creditclaw) or the [Developer Quick Start](/docs/api/agent-integration/quick-start).
