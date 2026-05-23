---
name: Rail 3 — Add-Card Dialog Card Preview
description: Replace the form-only AddCardDialog body with a live preview of the canonical CreditClaw card UI, driven by the dialog's form state. Pick the right reuse target between CreditCardItem (established list row) and CardVisual (presentational primitive).
created: 2026-05-20
status: planned — awaiting go
---

## Why this exists

`components/rail3/add-card-dialog.tsx` today is a stack of form fields with **no card preview at all**. It looks nothing like the cards the user will see seconds later on `/virtual-cards`. The dialog needs to feel like it's building the same thing the rest of the app shows.

The goal is reuse, not redesign — pick a component the dashboard already ships, drive it from form state.

---

## Ground truth from the codebase

### The card UI stack (verified, not inferred)

```
app/(dashboard)/virtual-cards/page.tsx          (rail3 list page)
app/(dashboard)/sub-agent-cards/page.tsx        (rail5 list page)
   ↓ both use
components/wallet/credit-card-list-page.tsx     (shared list shell)
   ↓ renders
components/wallet/credit-card-item.tsx          (row: card + action bar)
   ↓ contains
components/wallet/card-visual.tsx               (pure gradient card)
```

`CardVisual` is **also** used directly in:
- `app/(dashboard)/sub-agent-cards/[cardId]/page.tsx` (detail header, no list-row chrome)
- `app/(dashboard)/overview/page.tsx` empty-state ("you don't have a card yet" tile)

So both `CreditCardItem` and `CardVisual` are "established" — they just live at different levels.

### `CreditCardItem` props (exact, from `components/wallet/credit-card-item.tsx`)

```ts
interface CreditCardItemProps {
  card: NormalizedCard;
  onFreeze: () => void;
  onAddAgent?: () => void;
  onUnlinkBot?: () => void;
  onCopyCardId: () => void;
  onDelete: () => void;
}
```

Internals include:
- A "Manage" button calling `router.push(card.detailPath)`.
- A "Freeze" toggle + a "More" dropdown (Copy Card ID, Remove).
- An action bar `<div className="bg-white rounded-xl border …">` below the card visual.
- `isFrozen` / `canFreeze` derivation from `card.status`.

This is exactly the shape a list row needs, and the wrong shape for a creation-time preview.

### `CardVisual` props (from `components/wallet/card-visual.tsx`)

```ts
interface CardVisualProps {
  color?: "primary" | "dark" | "blue" | "purple";
  last4?: string;
  expiry?: string;
  holder?: string;
  holderLabel?: string;
  balance?: string;
  balanceLabel?: string;
  balanceTooltip?: string;
  frozen?: boolean;
  className?: string;
  line1?: string;
  line2?: string;
  status?: string;
  brand?: string;
  issuer?: string;
  bottomRightLabel?: string;
  bottomRightValue?: string;
}
```

Pure presentational. No hooks, no router, no fetches, no required event handlers.

### The shared card shape

`NormalizedCard` (in `components/wallet/types.ts`) is the lingua franca:

```ts
export interface NormalizedCard {
  card_id: string;
  card_name: string;
  status: string;
  bot_id: string | null;
  bot_name: string | null;
  card_color: "primary" | "blue" | "purple" | "dark";
  balance: string;
  balanceLabel: string;
  balanceTooltip?: string | null;
  last4: string;
  brand: string | null;
  issuer: string | null;
  line1: string | null;
  line2: string | null;
  detailPath: string;
}
```

There is already a `normalizeRail3Card(Rail3CardInfo) → NormalizedCard` helper in the same file. Today's mapping (worth knowing for preview parity):
- `brand ← card.card_brand`
- `last4 ← card.card_last4`
- `card_color ← resolveCardColor(card.card_color, card.card_id)` (deterministic hash → color when null)
- `issuer ← category` (rail3 puts category in `issuer` slot)
- `balance` / `balanceLabel` ← derived from `intent_mode` + limit fields

### Dialog form state available today

```
pmId          → look up selectedPm.card_brand, selectedPm.card_last4
cardName      → holder
category      → issuer (per rail3 normalization)
mode          → "limited" | "open"
maxAmount     → balance (limited)
period        → balanceLabel suffix (limited)
botId         → bot link (not visually shown on card itself)
```

**Missing field on the dialog form: `card_color`.** Today the form doesn't let the user pick a color; the backend accepts `card_color` but it's never sent. So the preview color must be either:
- Auto-derived (mirror `resolveCardColor` against a stable seed like the form's PM id), **or**
- Add a small color picker to the form (in scope of this preview change since it directly affects how the preview looks — but optional).

---

## Decision — which component to reuse

### Option A — Use `CardVisual` directly (recommended)

Embed `<CardVisual …/>` at the top of the dialog form body, driven from form state.

**Pros:**
- Zero refactor. Component is already used in the detail page and overview empty-state, so this is established usage.
- No fake event handlers. No fake `detailPath`. No router required.
- The visual is the part the user is reacting to in a creation flow; the action bar is meaningless before the card exists.

**Cons:**
- Not literally the same row as `/virtual-cards`. The list row has a white action-bar strip under the card; the dialog won't.

### Option B — Refactor `CreditCardItem` into `<CreditCardPresentation>` (visual + frame) and `<CreditCardItem>` (presentation + actions)

Split the existing component:
- `CreditCardPresentation` = `CardVisual` wrapped in the same outer frame, *without* the action bar / dropdown / router calls. Accepts only `card: NormalizedCard`.
- `CreditCardItem` keeps its current API but composes `CreditCardPresentation` + the action bar.

Dialog then renders `<CreditCardPresentation card={draftCard} />`.

**Pros:**
- Literally the same row component the user sees on `/virtual-cards`, minus the actions.
- Aligns with the user preference for "reuse over rebuild": one source of truth for the card body.

**Cons:**
- Touches a working surface (`credit-card-item.tsx`) which carries risk (user prefs flag this explicitly).
- Net new abstraction layer.

### Recommendation

**Option A.** Justification: the action bar is irrelevant in the dialog, `CardVisual` is already the established primitive for "show a card without actions" (proven by the detail page using it that way), and Option B touches a working surface for a marginal visual gain. If after seeing Option A you still want the list-row frame, escalate to Option B as a separate pass.

---

## Build steps (Option A)

### 1. Imports + selected-PM lookup

```ts
import { CardVisual } from "@/components/wallet/card-visual";
import { resolveCardColor } from "@/components/wallet/types"; // verify name; reuse existing helper

const selectedPm = useMemo(
  () => selectablePMs.find((p) => p.payment_method_id === pmId),
  [selectablePMs, pmId]
);
```

### 2. Preview block (top of form body, above the bot/pm grid)

```tsx
<CardVisual
  color={resolveCardColor(undefined, pmId || "draft")}
  last4={selectedPm?.card_last4 || "••••"}
  holder={(cardName || "New Virtual Card").toUpperCase()}
  holderLabel="Card Name"
  balance={mode === "limited" && maxAmount ? `$${maxAmount}` : "No limit"}
  balanceLabel={mode === "limited" ? `Limit · ${period}` : "Spending"}
  issuer={category || undefined}
  brand={selectedPm?.card_brand || undefined}
  status="pending_setup"
/>
```

Mapping rationale per `normalizeRail3Card`: `issuer` carries the category, `holderLabel` defaults to "Card Name", `status="pending_setup"` matches what a fresh card will show in the list a second later.

### 3. Verify `resolveCardColor` actually exists / is exported from `components/wallet/types.ts`

If it's not exported, either export it or inline a 1-line stable hash (same hash function used in `normalizeRail3Card`). Pre-build verification step — do not assume.

### 4. (Optional, defer) Add `card_color` picker to the form

If the deterministic color from PM id is acceptable, skip. If the user wants control, add a 4-swatch picker below the nickname field, wire to a new `cardColor` state, send as `card_color` in the POST body (schema already accepts it).

### 5. Manual visual sanity check

Open `/virtual-cards`, click "New Card", confirm:
- Preview renders the card in the same gradient/typography as the live cards on the page.
- Editing nickname / category / amount / period updates the preview live.
- Changing PM updates last4 and brand on the preview.

---

## Files touched (Option A)

```
components/rail3/add-card-dialog.tsx     # add CardVisual import + selectedPm lookup + preview block
project_knowledge/currently_building/rail3/rail3-add-card-dialog-preview-plan.md   # this doc (delete on completion)
```

If `resolveCardColor` needs exporting:
```
components/wallet/types.ts               # add export
```

That's it. No backend changes. No new components.

---

## Risks

| # | Risk | Mitigation |
|---|------|------------|
| 1 | `resolveCardColor` isn't exported / has a different name | Verify before coding; if absent, inline a 4-line stable hash mirroring the existing one. |
| 2 | Preview diverges from list row look | Both render `CardVisual` underneath, so the card body is byte-identical. Only the surrounding frame differs (intentional). |
| 3 | Future redesign of `CardVisual` props | Same risk every other consumer carries; not a reason to fork. |

---

## Out of scope (explicit)

- Refactoring `CreditCardItem` (Option B). Open a separate pass if Option A's visual doesn't go far enough.
- Adding a color picker (deferred — deterministic auto-color is fine for v1).
- Touching the post-create authorization step (the `OrderIntentVerification` screen). Different flow.
- Onboarding flow from the landing page (separate note: `project_knowledge/currently_building/rail3/rail3-onboarding-note.md`, to be written next).
