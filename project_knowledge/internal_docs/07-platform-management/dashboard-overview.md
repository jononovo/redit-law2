---
name: Dashboard Overview Page
description: Layout and component structure of the /overview page. Read when modifying the main dashboard landing.
---

# Dashboard Overview Page

**Route:** `/overview`

## Layout

- **Approvals section** (above cards, only shown if approvals exist): Shows up to 5 recent approvals using `ApprovalList` with `showRailBadge`. Has a "See all" link to `/transactions`. Approve/reject actions work in-place.
- **Cards & Wallets section** (below "My Bots") with per-card titles ("Agent Wallet" / "My Card") and info tooltips matching sidebar descriptions. Shows:
  - **Privy Wallet (Rail 1)**: Full interactive `CryptoWalletItem` with action bar (Fund, Freeze, Guardrails, Activity → navigates to `/stripe-wallet`)
  - **Rail 5 Sub-Agent Card**: Full interactive `CreditCardItem` with action bar. If no card exists, shows placeholder `CardVisual` with semi-transparent overlay and "Add Your Card" button that opens `Rail5SetupWizard` in-place.

## Hooks and Dialogs

- Uses separate hook instances for each rail: `useWalletActions`, `useBotLinking`, `useGuardrails` (Rail 1 only), `useTransfer` (Rail 1 only)
- All required dialogs (GuardrailDialog, LinkBotDialog, UnlinkBotDialog, TransferDialog, FundWalletSheet, FreezeDialog, Rail5SetupWizard) are rendered on the overview page
