# Rail 5 Wizard — Auto Card Naming (remaining work)

> Status: the data/plumbing layer shipped. Only the wizard UX + initialize-time auto-naming remain.

## Objective
Eliminate the manual "Name Your Card" step (step 0) from the Rail 5 card wizard and auto-generate the card name from the BIN database — `"{Issuer} {Brand} ••{last4}"`, falling back to `"{Brand} ••{last4}"` then `"Card ••{last4}"`.

## Already shipped (do not redo)
- BIN data + lookup: `data/bin-lookup.json`, `scripts/process-bin-data.ts`, `features/payment-rails/card/bin-lookup.ts` (`lookupIssuer(bin6)`), `app/api/v1/bin-lookup/route.ts`.
- Schema: `cardFirst6` column on `rail5Cards`; `card_first6` accepted in `rail5SubmitKeySchema` / `rail5InitializeSchema` (`min(4).max(6)`). Column migrated.
- `submit-key` route writes `cardFirst6`. `cards` route returns `card_first6` + `issuer_name` (resolved via `lookupIssuer`).
- Wizard already sends `card_first6: cleanNumber.slice(0,6)` (submit-key) and `bin: cleanNumber.slice(0,6)` (encrypted file builder).

## Remaining work

### 1. Initialize API auto-naming — `app/api/v1/rail5/initialize/route.ts`
- Currently hardcodes `cardFirst6: ""` and never auto-names.
- Accept the optional `card_first6` and store it on the record.
- When `card_name` is absent, auto-generate server-side via `lookupIssuer(card_first6)`:
  - `"{Issuer} {Brand} ••{last4}"` → fallback `"{Brand} ••{last4}"` → fallback `"Card ••{last4}"`.

### 2. Wizard logic — `components/onboarding/rail5-wizard/use-rail5-wizard.ts`
- Remove `cardName` / `setCardName` state and the `randomCardName()` initializer (≈ line 23).
- Remove `handleStep1Next`.
- Move the `/api/v1/rail5/initialize` call to after card details are entered (current step 3).
- Resolve the name from the first 6 digits — either call `GET /api/v1/bin-lookup?bin=XXXXXX` client-side, or let initialize do it server-side (§1). Pick one; don't double-resolve.
- Pass the auto-generated name into initialize.

### 3. Wizard content — `components/onboarding/rail5-wizard/rail5-wizard-content.tsx`
- Remove the `NameCard` import and its render (step 0).
- Shift step numbers down by 1; update all `w.setStep(N)` references.

### 4. Step types — `components/onboarding/rail5-wizard/types.ts`
- `TOTAL_STEPS` 8 → 7.
- Retire `FUN_CARD_NAMES` + `randomCardName` (currently re-exported from `features/payment-rails/card/card-naming.ts`). Drop the wizard usage, then delete `card-naming.ts`.

### 5. Delete `components/onboarding/rail5-wizard/steps/name-card.tsx`

### 6. Step indicator — `step-indicator.tsx` / `wizard-shell.tsx`
- Driven by `TOTAL_STEPS` (`wizard-shell.tsx` renders `TOTAL_STEPS - 1`); confirm it reads as 7 after the change.

## Files
| File | Change |
|------|--------|
| `app/api/v1/rail5/initialize/route.ts` | accept `card_first6`, auto-name via `lookupIssuer` |
| `components/onboarding/rail5-wizard/use-rail5-wizard.ts` | drop naming state, resolve name, send to initialize |
| `components/onboarding/rail5-wizard/rail5-wizard-content.tsx` | remove step 0, renumber |
| `components/onboarding/rail5-wizard/types.ts` | `TOTAL_STEPS`→7, retire fun-name exports |
| `features/payment-rails/card/card-naming.ts` | DELETE after wizard stops using it |
| `components/onboarding/rail5-wizard/steps/name-card.tsx` | DELETE |
| `components/onboarding/rail5-wizard/step-indicator.tsx` | verify 7-step rendering |

## Fallback
- BIN miss → `"{Brand} ••{last4}"`; brand also unknown → `"Card ••{last4}"`.
- Users can rename later from dashboard card settings.
