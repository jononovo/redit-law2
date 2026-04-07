# Onboarding & Setup Wizards

## Onboarding Wizard

A linear 5-step wizard for new bot owner setup. Flow: choose-agent-type → register-bot → sign-in → claim-token → add-card-bridge. The bridge slide only appears if the user claimed a bot (sets `botConnected`). If "Yes, let's add a card" is chosen, the full `Rail5SetupWizardContent` renders inline (not as a modal) with `preselectedBotId` to auto-link the bot and skip the bot selection step. If the user skips at claim-token or add-card-bridge, they go directly to `/overview`. The `Rail5SetupWizardContent` component is a standalone extraction from the dialog-based `Rail5SetupWizard` — both dashboard (dialog mode) and onboarding (inline mode) use the same content component with zero duplication. Props: `onComplete`, `onClose`, `preselectedBotId?`, `inline?`. The onboarding page has no auth gate — authentication happens within the wizard flow.

## Rail 5 Setup Wizard

Full-page route at `/setup/rail5` (outside dashboard layout, no sidebar/header). Uses `Rail5SetupWizardContent` with `inline` mode. On complete/close navigates to `/overview`. Entry points: NewCardModal "My Card - Encrypted" option, overview page "Add Your Card" overlay, sub-agent-cards "Add New Card" button — all navigate to `/setup/rail5` instead of opening a Dialog modal. The onboarding wizard (`/onboarding`) still embeds `Rail5SetupWizardContent` inline directly. The old `Rail5SetupWizard` Dialog wrapper has been removed.

### Modularized under `components/onboarding/rail5-wizard/`

- `index.tsx` — re-exports `Rail5SetupWizardContent` for backward compatibility
- `rail5-wizard-content.tsx` — orchestrator: calls hook, renders shell + step switch
- `use-rail5-wizard.ts` — custom hook with all state variables and handler functions
- `types.ts` — shared interfaces (`BotOption`, `SavedCardDetails`, `Step7Props`, `Step8Props`, etc.), constants (`TOTAL_STEPS = 8`, `FUN_CARD_NAMES`)
- `step-indicator.tsx` — step progress dots component
- `wizard-shell.tsx` — layout wrapper (close button with inline/non-inline positioning, exit confirmation overlay, step indicator; hides indicator when `step >= TOTAL_STEPS`)
- `steps/` — 9 step files: `name-card.tsx` (step 0), `how-it-works.tsx` (step 1), `spending-limits.tsx` (step 2), `card-entry.tsx` (step 3), `billing-address.tsx` (step 4), `link-bot.tsx` (step 5), `encrypt-deliver.tsx` (step 6), `delivery-result.tsx` (step 7), `test-verification.tsx` (step 8 — optional, beyond visible step dots). The step indicator shows 8 dots (steps 0–7). Step 8 (test verification) has a prompt gate: checks test status on mount — if bot already started/completed, shows verification UI directly; otherwise shows "Do you want to test?" prompt with Skip/Yes. Skip is always available during verification.

## Wizard Typography System

All onboarding/wizard flows share a unified typography scale defined in `lib/wizard-typography.ts`. The `wt` object exports responsive class strings for `title`, `subtitle`, `body`, `bodySmall`, `primaryButton`, `secondaryButton`, and `fine`. `wt.primaryButton` and `wt.secondaryButton` include full button sizing (height `h-12 md:h-14`, rounding `rounded-xl`, and font size) — apply them to all navigation `Button` components. For plain text-link buttons (back/skip as `<button>` without borders), use `wt.body` instead.

The main onboarding steps (`register-bot`, `sign-in`, `claim-token`, `add-card-bridge`) and all Rail5 wizard steps use `wt` for button sizing. Small utility buttons (Copy/Telegram/Discord, Retry, Re-download) and exit confirmation buttons are intentionally excluded.

**Any new wizard flow should import `wt` from `@/lib/wizard-typography` for consistent sizing.** To change button or font sizes across all wizards, edit the single `lib/wizard-typography.ts` file.
