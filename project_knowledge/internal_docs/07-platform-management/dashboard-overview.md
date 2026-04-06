---
name: Dashboard Overview Page
description: Layout and component structure of the /overview page. Read when modifying the main dashboard landing.
---

# Dashboard Overview Page

**Route:** `/overview` (CreditClaw tenant)

## Layout (top to bottom)

1. **Stats bar** — 3-column grid: Total Bots, Wallet Balance, Pending Claim
2. **Add Funds card** — dark CTA bar, only shown if user has a wallet (`balance.has_wallet`)
3. **My Bots** — grid of `BotCard` components, or empty state with Get Started / Claim a Bot buttons
4. **Approvals** — up to 5 recent approvals via `ApprovalList` with `showRailBadge`, only shown if approvals exist. "See all" links to `/transactions`
5. **Cards & Wallets** — 2-column grid:
   - **Agent Wallet (Rail 1)**: `CryptoWalletItem` with full action bar (Fund, Freeze, Guardrails, Activity → `/stripe-wallet`), or empty state
   - **My Card (Rail 5)**: `CreditCardItem` with action bar, or placeholder `CardVisual` with "Add Your Card" overlay → navigates to `/setup/rail5`
6. **PaymentLinksPanel**
7. **OpsHealth**
8. **ActivityLog**
9. **WebhookLog**

## Hooks

Each rail uses separate hook instances to avoid state collisions:

| Hook | Rail 1 | Rail 5 |
|------|--------|--------|
| `useWalletActions` | Yes | Yes |
| `useBotLinking` | Yes | Yes |
| `useGuardrails` | Yes (crypto variant) | No |
| `useTransfer` | Yes | No |

## Dialogs rendered on this page

GuardrailDialog, LinkBotDialog (×2 — one per rail), UnlinkBotDialog (×2), TransferDialog, FundWalletSheet, FreezeDialog (Rail 5), Delete confirmation (Rail 5)

## Key files

- `app/(dashboard)/overview/page.tsx` — single client component, fetches all data in parallel on mount
- `components/wallet/` — shared wallet/card components and hooks
- `lib/payments/components/fund-wallet-sheet.tsx` — funding sheet

## Data fetching

All fetches fire in parallel on mount when `user` is available:
- `GET /api/v1/bots/mine` + `GET /api/v1/wallet/balance` — bots and legacy balance
- `GET /api/v1/stripe-wallet/list` — privy wallets
- `GET /api/v1/rail5/cards` — rail 5 cards
- `GET /api/v1/approvals` — pending approvals
