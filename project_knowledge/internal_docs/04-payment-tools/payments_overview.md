---
name: Payment Tools — Overview
description: What payment tools we offer, why each one exists, current status per rail, and the shared UI conventions across all of them. Start here before touching anything in features/payment-rails/ or components/wallet/.
---

# Payment Tools — Overview

## The bigger picture

CreditClaw is the **financial layer for AI agents**. Agents need to spend money — to buy products, pay for services, fund tools — but no single payment method fits every use case. A bot buying a $5 SaaS sub wants different rails than a bot doing $2k merchant procurement, and an agent paying another agent on-chain wants different rails again.

So Payment Tools is **not a single product** — it's a small portfolio of outbound payment rails, each chosen for a specific class of spend, all wired into one platform with one set of guardrails, one approvals system, one orders ledger, and one UI shell. The owner sees a sidebar with multiple "tiles" (Crypto Wallet, Virtual Cards, Encrypted Card, …) and picks the rail that fits the job. The bot's perspective is even simpler: it asks the platform to pay, and the platform routes through whichever rail the owner has set up for that bot.

The strategic bet is that **agent-native commerce will need all of these rails simultaneously** — stablecoin for crypto-native flows, virtual cards for traditional merchants, self-hosted cards for owner-controlled BYO scenarios. Building all of them under one roof means one auth surface, one guardrails engine, one approvals queue, one transaction view. From the agent's POV, paying is paying — the rail is an implementation detail the platform chooses.

## The rails

| # | Name | Status | Owner-facing tile | What it is |
|---|---|---|---|---|
| 1 | Stablecoin Wallet (Privy) | Live | "Crypto Wallet" | Privy-managed self-custodied stablecoin wallet on Base. Used for x402 payments and crypto-native flows. |
| 2 | Crossmint USDC Wallet | Dormant — likely retired | "Shop Wallet" (deprecated) | Earlier exploration for Worldstore. Rail 1 covers the same use case directly; this rail is not actively developed. |
| 3 | Virtual Cards (Crossmint Card Permissions) | Live | "Virtual Cards" | Owner vaults their own Visa/Mastercard with Crossmint once, then mints N **virtual cards** as OrderIntents — each with its own spending mandate. Real card never leaves Crossmint's PCI vault. One Crossmint agent per owner. Owner-triggered sync ("Refresh from Visa" icon) reconciles local DB ↔ Crossmint truth on demand. |
| 5 | Self-hosted Cards | Live | "My Card · Encrypted" | Owner pastes a real card PAN/CVC, encrypted at rest. Used for BYO scenarios where the owner controls the underlying card and wants no third-party vault. |

(Rail 4 is intentionally absent — the numbering reflects historical exploration order, not a gap to fill.)

## Why multiple rails coexist

Each rail trades off a different axis:

- **Custody:** Rail 1 self-custody; Rail 3 vendor-vaulted; Rail 5 self-encrypted.
- **Settlement:** Rail 1 on-chain stablecoin; Rails 3/5 card networks (Visa/Mastercard).
- **Counterparty trust:** Rail 1 trustless; Rail 3 trusts Crossmint; Rail 5 trusts only the owner.
- **Friction:** Rail 1 lowest for crypto-native merchants; Rails 3/5 needed for the long tail of traditional merchants.

Owners typically enable more than one. The platform's job is to make adding/removing/switching rails feel uniform, not to pick one.

## What's shared across rails

These are the cross-cutting subsystems that **every rail flows through** — touching any of them affects all rails:

- **Guardrails** — per-bot spending limits (per-tx, daily, monthly, approval-above). One engine, applied by every rail before settlement. See `guardrails.md`.
- **Approvals** — unified pending-approvals queue. Every rail that hits an approval threshold drops the request into the same queue and waits for owner action. See `APPROVAL_HISTORY_ON_RAIL_PAGES_PLAN.md` for the per-rail history surface.
- **Orders** — central orders ledger. Every checkout regardless of rail produces one order row. See `ORDERS_PAGE_CLEANUP_PLAN.md`.
- **Bot ↔ rail linking** — every rail uses the same `bot_id` foreign key. One bot can be linked to one card (Rail 3 or Rail 5) and one wallet (Rail 1).
- **Webhooks + fulfillment** — same shipping/order webhook pipeline regardless of which rail funded the checkout.

When adding a new payment capability, **prefer extending these shared systems over branching them per rail**. If you find yourself writing rail-specific guardrail logic, stop — the engine is supposed to absorb that.

## Shared UI conventions (`components/wallet/`)

All cross-rail payment UI lives in **`components/wallet/`**. The folder name is historical (the first rail was a crypto wallet) — it covers wallets AND cards AND dialogs AND transaction/order/approval lists. Do not create `components/cards/`, `components/payments/`, or `components/shared/` — the umbrella already exists.

**Folder layout:**

```
components/wallet/
  card-visual.tsx              ← Rail 3/5 card visual (floor+ceiling baked in)
  crypto-card-visual.tsx       ← Rail 1/2 wallet visual
  credit-card-item.tsx         ← shared card+actionbar tile
  credit-card-list-page.tsx    ← master listing template, consumed via config
  wallet-action-bar.tsx        ← shared action-bar primitive
  credit-card-action-bar.tsx   ← per-rail wrapper (cards)
  crypto-action-bar.tsx        ← per-rail wrapper (wallets)
  card-detail-shell.tsx        ← shared detail-page shell
  dialogs/                     ← cross-rail dialogs (freeze, add agent, …)
  hooks/                       ← cross-rail hooks (wallet actions, bot linking, …)
  rail3/                       ← rail3-specific UI (Crossmint provider, add-card dialog)
  types.ts                     ← NormalizedCard + per-rail normalizers
```

**Conventions:**

- **Top of `components/wallet/` is shared.** Per-rail subfolders (`rail3/`) hold rail-specific UI. Don't put per-rail files at the top, don't put shared files in a subfolder.
- **Wrapper-around-primitive pattern.** Visual primitives (`WalletActionBar`, `CardVisual`, `CardDetailShell`) own the markup. Per-rail wrappers (`CreditCardActionBar`, `CryptoActionBar`) configure them with rail-specific actions/handlers. Adding a new rail's action bar = new ~70-line wrapper, not new bar markup. Hide/show via `hidden: boolean` on action/menu items, not via conditional JSX.
- **Master-page pattern.** `CreditCardListPage` is a template; rail consumers (`virtual-cards/page.tsx`, `sub-agent-cards/page.tsx`) are ~43-line config objects. Detail pages are not unified (genuinely different domain content) — they just share `CardDetailShell` + `CardVisual`.
- **Card sizing.** Floor + ceiling (`min-w-[22rem] max-w-[26rem]`) live on `CardVisual`. Listing grids and detail pages don't override.
- **Test IDs.** Every interactive element gets one: `button-{action}-{id}`, `menu-{action}-{id}`, `badge-{type}-{id}`, `card-{type}-{id}`.
- **Promotion path for rail-specific UI.** Start in `components/wallet/{railN}/`. Graduate to the top of `components/wallet/` once a second rail needs it.

## What's in this folder

| File / folder | Purpose |
|---|---|
| `payments_overview.md` | This file — entry point, big picture, conventions. |
| `guardrails.md` | Cross-rail spending-limit engine reference. |
| `rail1-stripe-wallet-technical-spec.md` | Rail 1 (Privy stablecoin) deep dive. |
| `rail3-virtual-cards.md` | Rail 3 (Crossmint Card Permissions) canonical operational doc. |
| `managed-agents/` | Managed agents — remote runtimes CreditClaw orchestrates on the owner's behalf (vs user-linked bots). Overview + the Crossmint Agent Checkout runtime (Captain Crunch), which pays with Rail 3 virtual cards. |
| `rail3/` | Rail 3 sub-tree: open-points tracker, refresh-token plan, master-agent plan, archived `_completed/` plans, `_images/`. |
| `rail5-overview_260309.md` | Rail 5 (self-hosted cards) deep dive. |
| `APPROVAL_HISTORY_ON_RAIL_PAGES_PLAN.md` | Plan for per-rail approval history surface. |
| `ORDERS_PAGE_CLEANUP_PLAN.md` | Orders ledger cleanup notes. |
| `_complete/` | Archived completed plans. |
| `_context_260410/` | Dated context snapshots from prior work. |
| `_payment_build_ideas/` | Forward-looking ideas not yet planned. |
| `_research/` | Industry research and decision reasoning. |

Rail 3's canonical operational doc is `rail3-virtual-cards.md` (sibling in this folder). Its deeper plans + archived work live under the `rail3/` subfolder.
