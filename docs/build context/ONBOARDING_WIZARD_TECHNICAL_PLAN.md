# Onboarding Wizard — Technical Build Plan

**For:** The AI agent building this feature
**Prerequisite:** Read `docs/build context/creditclaw-internal-context-v3.md` for full codebase context.
**Design reference:** Brilliant.org onboarding — one question per screen, progress bar at top, centered content, big friendly buttons. See attached screenshots.

---

## Overview

Build a full-page, slide-by-slide onboarding wizard at `/onboarding` that walks a bot owner through setup in one sitting. One interactive element per screen. By the end, the owner has: connected their bot, configured spending permissions, and optionally added a payment method and funded the wallet.

Two entry paths converge into the same flow:
- **Path A (Bot-first):** Bot already registered, owner has a claim token (word-XXXX). Owner enters the token and proceeds.
- **Path B (Owner-first):** Owner generates a 6-digit pairing code, tells their bot to register with it. The wizard detects the pairing and proceeds.

---

## Screen Sequence

Each screen has ONE question and ONE interactive element. The user answers and clicks Continue.

### Screen 1: Choose Your Path

**Question:** "How would you like to connect your bot?"

**Two option cards (pick one):**
- "My bot already registered" — subtitle: "I have a claim token from my bot"
- "I want to set up first" — subtitle: "I'll get a code to give my bot"

On selection → Continue button appears. Advance to Screen 2A or 2B.

### Screen 2A: Enter Claim Token (Path A only)

**Question:** "Enter your bot's claim token"

**Interactive element:** Text input for claim token (format: word-XXXX, e.g., `coral-X9K2`)

On Continue → call `POST /api/v1/bots/claim` with `{ claim_token }`. If valid, store bot info in wizard state, advance to Screen 3. If invalid, show inline error.

**Important:** This endpoint already handles everything — sets ownerUid, creates wallet, sets walletStatus to active, nullifies the claim token. No additional backend work needed.

### Screen 2B: Pairing Code (Path B only)

**Question:** "Give this code to your bot"

**Display:** Large 6-digit code in monospace font with spaced digits (e.g., `4 8 2 7 1 5`). Copy button.

**Instruction text:** "Tell your bot to register at creditclaw.com with this code."

**Interactive element:** "My bot has registered" button (does a single check) + auto-polling every 5 seconds in the background.

When bot is detected → show brief success with bot name → auto-advance to Screen 3.

**Skip link:** "Skip — I'll connect later" → advance to Screen 3 with `botConnected: false`.

### Screen 3: Approval Mode

**Question:** "How should your bot handle purchases?"

**Three option cards (pick one):**
1. "Ask me every time" — subtitle: "Most secure. You approve every transaction." Maps to `ask_for_everything`.
2. "Auto-approve small purchases" — subtitle: "You only get asked for bigger ones." Maps to `auto_approve_under_threshold`.
3. "Auto-approve by category" — subtitle: "You pick what's okay, everything else needs approval." Maps to `auto_approve_by_category`.

On selection → Continue.

### Screen 4: Auto-Approve Threshold (conditional — only if Screen 3 = "Auto-approve small purchases")

**Question:** "Auto-approve purchases under..."

**Interactive element:** Dollar amount input with preset buttons: $5 / $10 / $25 / $50 / Custom

Maps to `ask_approval_above_cents`.

If Screen 3 was NOT `auto_approve_under_threshold`, skip this screen entirely.

### Screen 5: Spending Limits

**Question:** "Set your bot's spending limits"

**Three inputs with defaults and +/- steppers:**
- Per transaction max: $25
- Daily max: $50
- Monthly max: $500

Maps to `per_transaction_cents`, `daily_cents`, `monthly_cents`.

This is the ONE screen that has multiple inputs — but they're all part of the same concept (limits). Keep them stacked vertically with clear labels.

### Screen 6: Blocked Categories

**Question:** "What should your bot never spend on?"

**Checkboxes (pre-checked for safety):**
- ✅ Gambling
- ✅ Adult content
- ✅ Cryptocurrency
- ✅ Cash advances

The owner can uncheck any. If they do, show a brief inline warning: "This category is blocked by default for safety."

Maps to `blocked_categories[]`.

### Screen 7: Approved Categories (conditional — only if Screen 3 = "Auto-approve by category")

**Question:** "What can your bot spend on without asking?"

**Checkboxes (none pre-checked):**
- ☐ API services & SaaS
- ☐ Cloud compute & hosting
- ☐ Research & data access
- ☐ Physical goods & shipping
- ☐ Advertising & marketing
- ☐ Entertainment & media

Maps to `approved_categories[]`.

If Screen 3 was NOT `auto_approve_by_category`, skip this screen.

### Screen 8: Special Instructions

**Question:** "Any special instructions for your bot?"

**Interactive element:** Text area
**Placeholder:** "e.g., Prefer free tiers before paying. Always check for discount codes. No annual plans without asking me first."

Maps to `notes` field. Skip link: "Skip" if they have nothing to add.

### Screen 9: Connect Bot (safety net — only if bot NOT connected yet)

**Question:** "Connect your bot to finish setup"

Two options:
- Show the pairing code from Screen 2B (if owner-first) with polling
- OR text input for a claim token as fallback

If bot was already connected in Screen 2A or 2B → skip this screen entirely.

### Screen 10: Add Payment Method (optional)

**Question:** "Add a card to fund your bot's wallet"

**Two options:**
- "Add a card" → shows Stripe Elements form (reuse existing SetupIntent → PaymentMethod save flow)
- "Skip — I'll add one later" → advance to final screen

Trust line below: "Your card details are handled by Stripe. CreditClaw never sees your card number."

### Screen 11: Fund Wallet (optional — only if card was added in Screen 10)

**Question:** "How much should your bot start with?"

**Quick-pick buttons:** $10 / $25 / $50 / $100 / Custom

On pick → call `POST /api/v1/wallet/fund` with `{ amount_cents }`. Show success animation.

"Skip" link → advance with $0 balance.

If no card was added → skip this screen.

### Screen 12: Done

**"Your bot is ready!"**

Summary card:
- Bot name (or "Waiting for bot to connect")
- Approval mode chosen
- Spending limits
- Balance (if funded, or $0.00)

**"Go to Dashboard"** button → navigates to `/app`

---

## Total Screens: 12 (max), typically 8-10 after skip logic

### Skip Logic Summary

| Condition | Screens Skipped |
|-----------|----------------|
| Path A (bot-first, claimed in Screen 2A) | Skip 2B, 9 |
| Path B (owner-first, paired in Screen 2B) | Skip 2A, 9 |
| Path B, bot NOT paired (skipped 2B) | Skip 2A, show 9 |
| Approval mode = `ask_for_everything` | Skip 4, 7 |
| Approval mode = `auto_approve_under_threshold` | Skip 7 |
| Approval mode = `auto_approve_by_category` | Skip 4 |
| No card added in Screen 10 | Skip 11 |

---

## Backend Changes

### 1. New Table: `pairing_codes`

Add to `shared/schema.ts`:

```typescript
export const pairingCodes = pgTable("pairing_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  ownerUid: text("owner_uid").notNull(),
  botId: text("bot_id"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export type PairingCode = typeof pairingCodes.$inferSelect;
export type InsertPairingCode = typeof pairingCodes.$inferInsert;
```

Create the table in the database via `execute_sql`:

```sql
CREATE TABLE IF NOT EXISTS pairing_codes (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  owner_uid TEXT NOT NULL,
  bot_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_pairing_codes_code ON pairing_codes(code);
CREATE INDEX idx_pairing_codes_owner ON pairing_codes(owner_uid);
```

### 2. New Storage Methods

Add to `IStorage` interface and implementation in `server/storage.ts`:

```typescript
// Interface additions:
createPairingCode(data: InsertPairingCode): Promise<PairingCode>;
getPairingCodeByCode(code: string): Promise<PairingCode | null>;
claimPairingCode(code: string, botId: string): Promise<PairingCode | null>;
```

**`createPairingCode`** — Simple insert, returns the row.

**`getPairingCodeByCode`** — SELECT where code = $1. Used for status polling and bot registration lookup.

**`claimPairingCode`** — UPDATE where code = $1 AND status = 'pending' AND expires_at > NOW(), set status = 'paired', bot_id = $2. Returns updated row or null. Conditional update prevents double-claim.

### 3. New API Endpoints

#### `POST /api/v1/pairing-codes`

Location: `app/api/v1/pairing-codes/route.ts`

Auth: Firebase session (owner must be logged in).

Logic:
1. Generate 6-digit code: `Math.floor(100000 + Math.random() * 900000).toString()`
2. Set expires_at to now + 1 hour
3. Insert into pairing_codes with owner_uid, code, expires_at
4. On unique constraint violation (collision), regenerate and retry (max 3 attempts)
5. Return `{ code, expires_at }`

Rate limit: Simple in-handler check — max 5 codes per owner per hour (query count from pairing_codes where owner_uid and created_at > 1h ago).

#### `GET /api/v1/pairing-codes/status`

Location: `app/api/v1/pairing-codes/status/route.ts`

Auth: Firebase session.

Query param: `?code=482715`

Logic:
1. Look up pairing code by code value
2. Verify owner_uid matches session user
3. Check if expired (expires_at < now AND status still 'pending') → return `{ status: "expired" }`
4. If status = 'paired', look up the bot by bot_id → return `{ status: "paired", bot_id, bot_name }`
5. If status = 'pending' and not expired → return `{ status: "pending" }`

### 4. Modify `POST /api/v1/bots/register`

Location: `app/api/v1/bots/register/route.ts`

**Add optional `pairing_code` field to `registerBotRequestSchema`:**

```typescript
export const registerBotRequestSchema = z.object({
  bot_name: z.string().min(1).max(100),
  owner_email: z.string().email(),
  description: z.string().max(500).optional(),
  callback_url: z.string().url().optional(),
  pairing_code: z.string().length(6).regex(/^\d{6}$/).optional(),
});
```

**Logic change in the register handler — after bot creation:**

```
if (pairing_code provided) {
  1. Look up pairing code: storage.getPairingCodeByCode(pairing_code)
  2. Validate: exists, status = 'pending', expires_at > now
  3. If invalid → return error { error: "invalid_pairing_code", message: "..." }
  4. Claim the pairing code: storage.claimPairingCode(code, botId)
  5. Link the bot to the owner who generated the code:
     - Update bot: set ownerUid = pairingCode.ownerUid, walletStatus = 'active', claimToken = null, claimedAt = now
     - Create wallet: storage.createWallet({ botId, ownerUid: pairingCode.ownerUid })
  6. Fire wallet.activated webhook
  7. In the response, add: paired: true, owner_uid (so the bot knows it's already linked)
}
```

**Important:** The existing flow (no pairing_code) must remain unchanged. The pairing code is purely additive.

### 5. No New "Complete" Endpoint

The wizard calls existing APIs in sequence from the frontend:
- `POST /api/v1/bots/claim` (for Path A)
- `PUT /api/v1/bots/spending` (to save spending permissions — already does upsert)
- `POST /api/v1/billing/setup-intent` → Stripe Elements → `POST /api/v1/billing/payment-method` (for card setup)
- `POST /api/v1/wallet/fund` (for initial funding)

All these endpoints already exist and work. No wrapper endpoint needed.

---

## Frontend Architecture

### Page Route

Location: `app/onboarding/page.tsx`

This is OUTSIDE the dashboard layout (`app/app/layout.tsx`). It's its own standalone full-page experience. Requires Firebase auth — redirect to login if not authenticated, then back to `/onboarding` after.

```typescript
"use client";
// Auth check → if not logged in, redirect to login
// Render <OnboardingWizard />
```

### Component Structure

All in one directory: `components/onboarding/`

```
components/onboarding/
  onboarding-wizard.tsx    -- orchestrator (state, navigation, progress bar, transitions)
  wizard-step.tsx          -- shared wrapper for each step (centered card, title, continue button)
  steps/
    choose-path.tsx
    claim-token.tsx
    pairing-code.tsx
    approval-mode.tsx
    approval-threshold.tsx
    spending-limits.tsx
    blocked-categories.tsx
    approved-categories.tsx
    special-instructions.tsx
    connect-bot.tsx
    add-payment.tsx
    fund-wallet.tsx
    complete.tsx
```

### OnboardingWizard (orchestrator)

Manages:
- `currentStep: number` — index into the active step list
- `wizardState: WizardState` — all collected data
- Step list with skip logic computed from wizardState
- Navigation (next/back)
- CSS slide transitions between steps

```typescript
interface WizardState {
  entryPath: 'owner-first' | 'bot-first' | null;
  botId: string | null;
  botName: string | null;
  botConnected: boolean;
  pairingCode: string | null;

  approvalMode: 'ask_for_everything' | 'auto_approve_under_threshold' | 'auto_approve_by_category';
  askApprovalAboveCents: number;
  perTransactionCents: number;
  dailyCents: number;
  monthlyCents: number;
  approvedCategories: string[];
  blockedCategories: string[];
  recurringAllowed: boolean;
  notes: string;

  paymentMethodAdded: boolean;
  fundedAmountCents: number;
}
```

**State is local only (useState).** No persistence — the wizard is short enough. If the user refreshes, they start over.

### WizardStep (shared wrapper)

Every step renders inside this wrapper:

```
<div class="min-h-screen flex flex-col items-center justify-center p-6">
  <div class="w-full max-w-lg">
    <!-- Progress bar at top -->
    <!-- Back arrow (except step 1) -->
    <!-- Step title (large, bold) -->
    <!-- Step content (one interactive element) -->
    <!-- Continue button (bottom) -->
    <!-- Optional skip link below continue -->
  </div>
</div>
```

### Progress Bar

Green progress bar at top of each screen, like Brilliant.org. Width = (currentStep / totalSteps) * 100%. Back arrow to the left of the bar.

### CSS Transitions

No framer-motion. Use CSS transitions for step changes:

```css
.step-enter {
  opacity: 0;
  transform: translateX(30px);
}
.step-active {
  opacity: 1;
  transform: translateX(0);
  transition: opacity 0.3s ease, transform 0.3s ease;
}
```

### Stripe Elements Integration (Screen 10)

Reuse the existing pattern from `components/dashboard/payment-setup.tsx`:

1. Call `POST /api/v1/billing/setup-intent` to get `client_secret` and `customer_id`
2. Render `<Elements stripe={stripePromise} options={{ clientSecret }}>` with `<PaymentElement />`
3. On confirm, call `POST /api/v1/billing/payment-method` with the payment_method_id
4. Set `paymentMethodAdded: true` in wizard state

Don't import PaymentSetup directly — it has card management UI that doesn't belong in the wizard. Extract or duplicate just the setup form logic.

### Saving Spending Permissions (on completion)

When the wizard reaches the Done screen, call `PUT /api/v1/bots/spending` with the collected data:

```typescript
await fetch("/api/v1/bots/spending", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    bot_id: wizardState.botId,
    approval_mode: wizardState.approvalMode,
    per_transaction_usd: wizardState.perTransactionCents / 100,
    daily_usd: wizardState.dailyCents / 100,
    monthly_usd: wizardState.monthlyCents / 100,
    ask_approval_above_usd: wizardState.askApprovalAboveCents / 100,
    approved_categories: wizardState.approvedCategories,
    blocked_categories: wizardState.blockedCategories,
    recurring_allowed: wizardState.recurringAllowed,
    notes: wizardState.notes || null,
  }),
});
```

This only works if `botConnected` is true (bot must be claimed for the spending API to find it). If the bot isn't connected yet, store the state but don't call the API — the owner will need to finish setup later from the dashboard.

---

## Entry Points

1. **Landing page "Get Started" CTA** → link to `/onboarding` (requires auth, redirect after login)
2. **Dashboard banner** — if owner has no bots, show: "Set up your first bot →" linking to `/onboarding`
3. **Direct URL** — `creditclaw.com/onboarding` (redirect to login if not authenticated)

Do NOT replace the existing `/claim` page. Keep it working as-is.

---

## Design Specifications

- Full viewport: `min-h-screen`
- Centered content: `max-w-lg mx-auto`
- Progress bar: green, thin, at very top of screen
- Back arrow: top-left, plain icon button (except on Screen 1)
- Step title: Plus Jakarta Sans, text-2xl or text-3xl, font-bold
- Option cards: rounded-2xl, p-6, hover effect, selected state with ring/border
- Continue button: full width, rounded-xl, primary color (orange), large
- Skip links: text-sm, text-neutral-400, below continue button
- Inputs: rounded-xl, standard shadcn/ui styling
- Use existing shadcn/ui components: Button, Input, Checkbox, Textarea, Card
- Colors: primary actions in orange, secondary in blue, safety warnings in red/muted
- Border radius: 1rem on all cards and inputs
- No framer-motion — CSS transitions only

---

## Edge Cases

1. **Pairing code collision** — 6 digits = 900k possibilities. Retry on unique constraint violation (max 3 retries).
2. **Pairing code expiry** — 1 hour TTL. If expired, show "Generate new code" button.
3. **Owner refreshes mid-wizard** — State lost (useState only). Acceptable — wizard is short.
4. **Owner already has bots** — Wizard works fine for adding another bot. No first-bot assumption.
5. **Bot registers with expired/used pairing code** — Return clear error message.
6. **Owner completes wizard without connecting bot** — Allowed. Spending permissions not saved to DB (no bot to save them on). Dashboard shows "No bots connected" state.
7. **Owner navigates back** — Back button steps backward. State is preserved in local state.

---

## Files to Create

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Add `pairingCodes` table + types (MODIFY) |
| `server/storage.ts` | Add 3 pairing code storage methods (MODIFY) |
| `app/api/v1/pairing-codes/route.ts` | POST — generate pairing code (NEW) |
| `app/api/v1/pairing-codes/status/route.ts` | GET — check pairing code status (NEW) |
| `app/api/v1/bots/register/route.ts` | Add optional pairing_code field (MODIFY) |
| `app/onboarding/page.tsx` | Onboarding page route (NEW) |
| `components/onboarding/onboarding-wizard.tsx` | Wizard orchestrator (NEW) |
| `components/onboarding/wizard-step.tsx` | Shared step wrapper (NEW) |
| `components/onboarding/steps/choose-path.tsx` | Screen 1 (NEW) |
| `components/onboarding/steps/claim-token.tsx` | Screen 2A (NEW) |
| `components/onboarding/steps/pairing-code.tsx` | Screen 2B (NEW) |
| `components/onboarding/steps/approval-mode.tsx` | Screen 3 (NEW) |
| `components/onboarding/steps/approval-threshold.tsx` | Screen 4 (NEW) |
| `components/onboarding/steps/spending-limits.tsx` | Screen 5 (NEW) |
| `components/onboarding/steps/blocked-categories.tsx` | Screen 6 (NEW) |
| `components/onboarding/steps/approved-categories.tsx` | Screen 7 (NEW) |
| `components/onboarding/steps/special-instructions.tsx` | Screen 8 (NEW) |
| `components/onboarding/steps/connect-bot.tsx` | Screen 9 (NEW) |
| `components/onboarding/steps/add-payment.tsx` | Screen 10 (NEW) |
| `components/onboarding/steps/fund-wallet.tsx` | Screen 11 (NEW) |
| `components/onboarding/steps/complete.tsx` | Screen 12 (NEW) |

## Files to Modify

| File | Change |
|------|--------|
| `shared/schema.ts` | Add `pairingCodes` table, types, modify `registerBotRequestSchema` |
| `server/storage.ts` | Add 3 storage methods to IStorage + implementation |
| `app/api/v1/bots/register/route.ts` | Handle optional `pairing_code` field |
| `app/app/page.tsx` | Add "Set up your first bot" banner if owner has no bots |

---

## What NOT to Change

- Do NOT modify or replace the existing `/claim` page
- Do NOT modify any existing bot-facing API endpoints
- Do NOT create a `/api/v1/onboarding/complete` endpoint
- Do NOT add framer-motion
- Do NOT persist wizard state to the database
- Do NOT modify the existing `PaymentSetup` component — duplicate the Stripe setup logic for the wizard
- Do NOT modify `public/skill.md` yet — that can be updated separately once the feature is tested
