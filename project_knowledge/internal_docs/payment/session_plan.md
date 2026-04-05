# Objective

Reorganize wallet/card page UI into a dedicated `components/wallet/` folder with shared types, hooks, dialogs, and action bar components — eliminating duplication across Rails 1, 2, 4, and 5. This is about the wallet/card **page UI only** (not setup wizards).

**Guiding principles:**
- Types first, then hooks, then shared UI components
- Credit card side (Rails 4 & 5) first as a low-risk proving ground, then crypto wallets (Rails 1 & 2)
- Rail 1 (stripe-wallet) is the starting point for "crypto wallet" UI
- Rail 5 (sub-agent-cards) is the starting point for "credit card" UI
- The sub-menu/action bar below cards should be a base component with variants
- Don't over-abstract — only extract what's duplicated across 3+ rails
- Page files become thin composers of shared components

---

# Tasks

### T001: Create shared wallet types
- **Blocked By**: []
- **Details**:
  - Create `components/wallet/types.ts`
  - Unify `WalletInfo`, `BotInfo`, `TransactionInfo`, `ApprovalInfo` types currently defined independently in each page file (stripe-wallet, card-wallet, sub-agent-cards, self-hosted)
  - Use discriminated unions or optional fields where rail-specific properties differ (e.g. `address` exists on crypto wallets but not credit cards, `card_brand`/`card_last4` exist on Rail 5 but not Rail 1)
  - Include shared utility types: `RailType`, `WalletStatus`, currency formatting helpers
  - Files: `components/wallet/types.ts` (new)
  - Reference: type definitions in `app/app/stripe-wallet/page.tsx` (lines 17-68), `app/app/card-wallet/page.tsx` (lines 17-83), `app/app/sub-agent-cards/page.tsx` (lines 16-34), `app/app/self-hosted/page.tsx` (lines 15-32)
  - Acceptance: All four page files can import from `components/wallet/types.ts` instead of defining their own types

### T002: Create shared wallet hooks
- **Blocked By**: [T001]
- **Details**:
  - Create `components/wallet/hooks/use-wallet-actions.ts` — shared freeze, sync balance, copy address handlers
  - Create `components/wallet/hooks/use-bot-linking.ts` — shared link/unlink bot state and handlers
  - Create `components/wallet/hooks/use-transfer.ts` — shared transfer dialog state and handler (used by Rail 1 and Rail 2)
  - Each hook accepts rail-specific config (API endpoint prefix, rail identifier) so the same hook works for different rails
  - Files: `components/wallet/hooks/use-wallet-actions.ts`, `components/wallet/hooks/use-bot-linking.ts`, `components/wallet/hooks/use-transfer.ts` (all new)
  - Reference: duplicated handler functions in `app/app/stripe-wallet/page.tsx` (handleFreeze ~lines 252-267, syncWalletBalance ~lines 154-199, handleLinkBot ~lines 333-356, handleUnlinkBot ~lines 309-331, handleTransfer ~lines 409-471), `app/app/card-wallet/page.tsx` (same patterns), `app/app/sub-agent-cards/page.tsx` (handleFreezeConfirm ~lines 99-129, handleLinkBot ~lines 131-154, handleUnlinkBot ~lines 156-178)
  - Acceptance: Hooks are importable and can replace the inline handler functions in page files

### T003: Create shared dialog components
- **Blocked By**: [T001]
- **Details**:
  - Create `components/wallet/dialogs/freeze-dialog.tsx` — freeze/unfreeze confirmation dialog (used by Rails 1, 2, 4, 5)
  - Create `components/wallet/dialogs/link-bot-dialog.tsx` — link bot to wallet/card dialog (used by Rails 1, 5)
  - Create `components/wallet/dialogs/unlink-bot-dialog.tsx` — unlink bot confirmation dialog (used by Rails 1, 5)
  - Create `components/wallet/dialogs/transfer-dialog.tsx` — USDC transfer dialog (used by Rails 1, 2)
  - Create `components/wallet/dialogs/guardrail-dialog.tsx` — guardrail editor dialog (used by Rails 1, 2, with variant fields)
  - Each dialog accepts callbacks and state props from the parent/hook
  - Files: `components/wallet/dialogs/*.tsx` (all new)
  - Reference: dialog JSX in `app/app/stripe-wallet/page.tsx` (lines 973-1370), `app/app/card-wallet/page.tsx` (lines 945-1342), `app/app/sub-agent-cards/page.tsx` (lines 209-307), `app/app/self-hosted/page.tsx` (lines 149-179)
  - Acceptance: Dialogs render identically to current inline versions

### T004: Create shared action bar (sub-menu) component
- **Blocked By**: [T001]
- **Details**:
  - Create `components/wallet/wallet-action-bar.tsx` — base action bar component (the white rounded bar below each card/wallet with buttons separated by dividers)
  - Accepts an array of action items (icon, label, onClick, variant) and a "more" dropdown menu config
  - Create `components/wallet/credit-card-action-bar.tsx` — credit card variant (Manage, Freeze, Add Agent/Bot badge, More menu) using Rail 5 as starting point
  - Create `components/wallet/crypto-action-bar.tsx` — crypto wallet variant (Fund, Freeze, Guardrails, Activity) using Rail 1 as starting point
  - Files: `components/wallet/wallet-action-bar.tsx`, `components/wallet/credit-card-action-bar.tsx`, `components/wallet/crypto-action-bar.tsx` (all new)
  - Reference: sub-menu JSX in `app/app/sub-agent-cards/page.tsx` (lines 350-425), `app/app/self-hosted/page.tsx` (lines 222-275), `app/app/stripe-wallet/page.tsx` (lines 798-838), `app/app/card-wallet/page.tsx` (lines 755-793)
  - Acceptance: Action bars look and behave identically to current inline versions

### T005: Move and re-export CardVisual, create StatusBadge
- **Blocked By**: []
- **Details**:
  - Move `components/dashboard/card-visual.tsx` → `components/wallet/card-visual.tsx`
  - Add a re-export from the old path for backwards compatibility (or update all imports)
  - Extract `StatusBadge` from `app/app/card-wallet/page.tsx` (lines 89-112) into `components/wallet/status-badge.tsx` — it's also useful for Rail 1
  - Create `components/wallet/index.ts` barrel export for all shared components
  - Files: `components/wallet/card-visual.tsx` (moved), `components/wallet/status-badge.tsx` (new), `components/wallet/index.ts` (new)
  - Acceptance: All existing imports of CardVisual continue to work; StatusBadge is importable

### T006: Refactor credit card pages (Rails 4 & 5) to use shared components
- **Blocked By**: [T002, T003, T004, T005]
- **Details**:
  - Refactor `app/app/sub-agent-cards/page.tsx` to use shared types, hooks (use-wallet-actions, use-bot-linking), dialogs (freeze, link, unlink), and credit-card-action-bar
  - Refactor `app/app/self-hosted/page.tsx` to use shared types, hooks (use-wallet-actions), dialogs (freeze), and credit-card-action-bar
  - Page files should become thin — primarily composition of shared components with rail-specific config
  - Do NOT touch setup wizard imports/usage — those stay as-is
  - Files: `app/app/sub-agent-cards/page.tsx`, `app/app/self-hosted/page.tsx` (modified)
  - Acceptance: Pages render and behave identically to before; page files are significantly shorter; no duplicated handler/dialog code

### T007: Refactor crypto wallet pages (Rails 1 & 2) to use shared components
- **Blocked By**: [T002, T003, T004, T005]
- **Details**:
  - Refactor `app/app/stripe-wallet/page.tsx` to use shared types, hooks (use-wallet-actions, use-bot-linking, use-transfer), dialogs (freeze, link, unlink, transfer, guardrails), and crypto-action-bar
  - Refactor `app/app/card-wallet/page.tsx` to use same shared components
  - Rail-specific UI stays in the page: Stripe onramp Sheet (Rail 1), CrossMint checkout (Rail 2), order timeline/detail (Rail 2), approval panels
  - Page files should shrink substantially but won't be as thin as credit card pages due to rail-specific funding/order UI
  - Files: `app/app/stripe-wallet/page.tsx`, `app/app/card-wallet/page.tsx` (modified)
  - Acceptance: Pages render and behave identically to before; shared handler/dialog code eliminated; page files reduced by ~40-50%

### T008: Clean up legacy cards page and old imports
- **Blocked By**: [T006, T007]
- **Details**:
  - Update `app/app/cards/page.tsx` to use shared components where applicable (CardVisual, StatusBadge, action bar)
  - Remove `components/dashboard/card-visual.tsx` if all imports have been updated (or keep re-export)
  - Verify no broken imports across the codebase
  - Files: `app/app/cards/page.tsx` (modified), `components/dashboard/card-visual.tsx` (removed or re-export)
  - Acceptance: No broken imports; legacy page still works; `components/dashboard/` no longer contains wallet-specific files (except setup wizards which are out of scope)

### T009: Verify and smoke test
- **Blocked By**: [T008]
- **Details**:
  - Run the dev server and verify no build errors
  - Verify all wallet/card pages load correctly
  - Check that the action bars, dialogs, freeze/unfreeze, link/unlink all work as expected
  - Acceptance: App builds and runs without errors; all pages functional
