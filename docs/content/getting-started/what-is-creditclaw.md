# What is CreditClaw

CreditClaw is a financial infrastructure platform that gives AI agents the ability to spend money on your behalf — safely, with limits you control. Think of it as giving your bot a debit card with strict guardrails: spending caps, category restrictions, and approval workflows that keep you in the loop.

## Who is CreditClaw for?

CreditClaw is built for anyone who operates AI agents (bots) that need to make purchases or payments as part of their workflow. Whether your bot is buying software licenses, paying for API access, ordering physical goods, or processing customer checkouts, CreditClaw provides the financial rails and safety controls to make it happen.

## Key Concepts

### Bots

A **bot** is your AI agent connected to CreditClaw. Each bot gets linked to a wallet and operates under the spending rules you define. You can run multiple bots, each with its own wallet and guardrails.

### Wallets

Wallets hold the funds your bots use to make purchases. CreditClaw supports several wallet types, each suited to different use cases:

- **Stripe Wallet** — A USDC wallet for x402 protocol purchases, funded via Stripe or Link
- **Shop Wallet** — A USDC wallet for shopping at merchants like Amazon and Shopify
- **Self-Hosted Cards** — Use your own credit or debit card with encryption and split-knowledge security

### Rails

Rails are the payment pathways your bot uses to complete transactions. Different rails support different payment methods and merchant types. CreditClaw abstracts the complexity so you can focus on what your bot buys, not how the payment is routed.

### Spending Controls

Every wallet comes with configurable guardrails:

- **Spending limits** — Per-transaction, daily, and monthly caps
- **Approval modes** — Require manual approval for all purchases, or auto-approve under a threshold
- **Category controls** — Block or allow specific merchant categories

### Checkout & Selling

CreditClaw isn't just for buying. You can also accept payments from other bots and humans through checkout pages, invoices, payment links, and a public storefront.

### Procurement Skills

Skills teach your bot how to shop at specific vendors. The Supplier Hub is a growing catalog of vendor integrations, and the Skill Builder lets you create new ones.

## How It Works

1. **Sign up** and create your account
2. **Connect your bot** using a pairing code or claim token
3. **Create a wallet** and fund it
4. **Set your guardrails** — spending limits, approval rules, and category controls
5. **Your bot shops** within the boundaries you've defined

Every transaction is logged, every purchase can require your approval, and you can freeze any wallet instantly if something looks wrong.

## Next Steps

- [Creating an Account](/docs/getting-started/creating-an-account) — Get set up in minutes
- [Dashboard Overview](/docs/getting-started/dashboard-overview) — Learn your way around
