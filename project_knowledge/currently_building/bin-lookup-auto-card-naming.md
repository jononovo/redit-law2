# BIN Lookup & Auto Card Naming

## Objective
Eliminate the manual "Name Your Card" step (step 0) from the Rail 5 card wizard. Instead, auto-generate card names using a local BIN database to resolve the issuing bank (e.g., "Chase Visa ••4829"). Fall back to "Visa ••4829" when the BIN is not found. Also expand the stored first digits from 4 to 6 to support proper BIN lookups.

## Current State
- Card wizard has 8 steps, starting with "Name Your Card" (step 0)
- `randomCardName()` pre-fills a fun name like "Claw Express" which users rarely change
- Only the first 4 digits of the card number are stored (`card_first4` / `cardFirst4`)
- No BIN lookup file or utility exists in the codebase
- Card brand detection exists (`features/payment-rails/card/card-brand.ts`) but only identifies the network (Visa, Mastercard, etc.), not the issuing bank

## Data Source
- Open-source BIN list from `github.com/iannuttall/binlist-data`
- ~343K entries, ~160K with issuer names
- Covers major US and international banks (Chase, Capital One, Citi, Bank of America, Wells Fargo, Amex, etc.)
- Format: CSV with columns — bin, brand, type, category, issuer, country code, etc.

---

## Changes

### 1. Download & process BIN data

**New file:** `data/bin-lookup.json`

- Download the CSV from the open-source repo
- Process into a condensed JSON mapping: `{ "400229": "Capital One", "371300": "Chase", ... }`
- Normalize issuer names:
  - Strip suffixes like ", N.A.", "(USA)", "BANK", "CORPORATION" etc.
  - Title-case normalize (e.g., "JPMORGAN CHASE" → "Chase")
  - Deduplicate variations (e.g., "CAPITAL ONE BANK" and "CAPITAL ONE BANK (USA), N.A." → "Capital One")
- Only include entries that have a non-empty issuer field
- Estimated size: ~2-3MB after deduplication and name normalization

**Processing script:** `scripts/process-bin-data.ts` (one-time use, can be deleted after)

### 2. Schema change

**File:** `shared/schema.ts`

- Rename column `cardFirst4` → `cardFirst6` in the `rail5Cards` table definition
  - `cardFirst6: text("card_first6").notNull().default("")`
- Update `rail5SubmitKeySchema`:
  - Change `card_first4: z.string().length(4).regex(/^\d{4}$/).optional()` → `card_first6: z.string().length(6).regex(/^\d{6}$/).optional()`
- Update `rail5InitializeSchema`:
  - Add `card_first6: z.string().length(6).regex(/^\d{6}$/).optional()` (needed for auto-naming at initialization time)

### 3. Database migration

**New migration file**

- Rename column `card_first4` → `card_first6` in `rail5_cards` table
- Existing 4-digit values will remain (shorter strings are fine — BIN lookup will just miss, triggering the fallback name)
- No data loss or breaking change for existing cards

### 4. BIN lookup utility

**New file:** `features/payment-rails/card/bin-lookup.ts`

```
function lookupIssuer(bin6: string): string | null
```

- Loads `data/bin-lookup.json` lazily on first call (cached in memory after)
- Takes first 6 digits of card number
- Returns normalized issuer name or null if not found
- Server-side only (file is too large for browser bundle)

### 5. BIN lookup API endpoint

**New file:** `app/api/v1/bin-lookup/route.ts`

- `GET /api/v1/bin-lookup?bin=400229`
- Response: `{ issuer: "Capital One", brand: "visa" }` or `{ issuer: null, brand: "visa" }`
- No auth required (BIN prefixes are public, non-sensitive data)
- Rate-limited to prevent abuse (simple in-memory limiter)
- Uses the `bin-lookup.ts` utility

### 6. Submit-key API update

**File:** `app/api/v1/rail5/submit-key/route.ts`

- Accept `card_first6` instead of `card_first4`
- Update destructuring: `card_first4` → `card_first6`
- Update storage write: `updates.cardFirst6 = card_first6`

### 7. Initialize API update

**File:** `app/api/v1/rail5/initialize/route.ts`

- Accept optional `card_first6` in the request body
- Use the BIN lookup utility server-side to resolve issuer name
- If `card_name` is not provided, auto-generate it: `"Chase Visa ••4829"` or `"Visa ••4829"`
- Store `cardFirst6` on the card record

### 8. Cards listing API update

**File:** `app/api/v1/rail5/cards/route.ts`

- Return `card_first6` instead of `card_first4` in the response

### 9. Card wizard: remove step 0 and auto-name

**File:** `components/onboarding/rail5-wizard/use-rail5-wizard.ts`

- Remove `cardName` / `setCardName` state (no longer user-editable during creation)
- Remove `handleStep1Next` function
- Move the card initialization API call (`/api/v1/rail5/initialize`) to after card details are entered (current step 3)
- After user enters the card number, call `GET /api/v1/bin-lookup?bin=XXXXXX` with first 6 digits
- Auto-generate card name: `"{Issuer} {Brand} ••{last4}"` or `"{Brand} ••{last4}"` as fallback
- Pass auto-generated name + `card_first6` to the initialize API
- Send `card_first6: cleanNumber.slice(0, 6)` instead of `card_first4: cleanNumber.slice(0, 4)` in submit-key call
- Update encrypted file builder call: `bin: cleanNumber.slice(0, 6)` instead of `bin: cleanNumber.slice(0, 4)`

**File:** `components/onboarding/rail5-wizard/rail5-wizard-content.tsx`

- Remove step 0 (`NameCard` component rendering)
- Shift all step numbers down by 1 (step 1 becomes step 0, etc.)
- Update all `w.setStep(N)` references accordingly
- Remove `NameCard` import

**File:** `components/onboarding/rail5-wizard/types.ts`

- Change `TOTAL_STEPS` from 8 to 7
- Remove `FUN_CARD_NAMES` array and `randomCardName()` function

**File:** `components/onboarding/rail5-wizard/steps/name-card.tsx`

- Delete this file entirely

### 10. Step indicator update

**File:** `components/onboarding/rail5-wizard/step-indicator.tsx`

- Update to reflect 7 steps instead of 8 (if it uses `TOTAL_STEPS`)

### 11. Encrypted file builder

**File:** `features/payment-rails/card/onboarding-rail5/encrypt.ts`

- Update any references to `bin` field to accept 6 digits instead of 4
- The `bin` metadata in the encrypted card file should store 6 digits

---

## Files affected (complete list)

| File | Change |
|------|--------|
| `data/bin-lookup.json` | NEW — static BIN→issuer lookup |
| `scripts/process-bin-data.ts` | NEW — one-time script to generate the JSON |
| `features/payment-rails/card/bin-lookup.ts` | NEW — lookup utility |
| `app/api/v1/bin-lookup/route.ts` | NEW — BIN lookup API endpoint |
| `shared/schema.ts` | Rename `cardFirst4`→`cardFirst6`, update validation schemas |
| `app/api/v1/rail5/submit-key/route.ts` | Accept `card_first6` instead of `card_first4` |
| `app/api/v1/rail5/initialize/route.ts` | Accept `card_first6`, auto-generate name via BIN lookup |
| `app/api/v1/rail5/cards/route.ts` | Return `card_first6` instead of `card_first4` |
| `components/onboarding/rail5-wizard/use-rail5-wizard.ts` | Remove naming logic, add BIN lookup call, send 6 digits |
| `components/onboarding/rail5-wizard/rail5-wizard-content.tsx` | Remove step 0, renumber steps |
| `components/onboarding/rail5-wizard/types.ts` | Remove `FUN_CARD_NAMES`, `randomCardName`, update `TOTAL_STEPS` |
| `components/onboarding/rail5-wizard/step-indicator.tsx` | Update step count |
| `components/onboarding/rail5-wizard/steps/name-card.tsx` | DELETE |
| `features/payment-rails/card/onboarding-rail5/encrypt.ts` | Update BIN field from 4→6 digits |
| DB migration | Rename column `card_first4`→`card_first6` |

---

## What doesn't change
- Card brand detection (`card-brand.ts`) — still used, unaffected
- Encrypted card file format (structure stays the same, just BIN field gets 6 digits instead of 4)
- Card visual components — unchanged
- Spending limits, billing address, bot linking, encrypt/deliver, delivery result, test verification steps — unchanged (just renumbered)
- Dashboard card listing UI — unchanged (reads card_name as before)
- Auth drawer, onboarding wizard — unrelated, unchanged

## Fallback behavior
- If BIN not found in lookup → card name = `"{Brand} ••{last4}"` (e.g., "Visa ••4829")
- If brand is also unknown → card name = `"Card ••{last4}"`
- Users can rename cards later from dashboard card settings (existing or future feature)

## Backward compatibility
- Existing cards with 4-digit `cardFirst4` values will continue to work
- BIN lookup will fail gracefully for shorter values (returns null → uses brand fallback)
- No existing API consumers are affected (the field name change is only in the wizard/internal APIs)
