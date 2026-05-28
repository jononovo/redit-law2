# Rail 3 real-card visual: swap to in-house CardVisual

## Why

The detail page currently renders `<img src={pm.display_image_url}>` when Crossmint hands one back, and renders nothing otherwise. In staging Crossmint returns the basis-theory mock asset; in production most issuers won't supply card art at all. Result: a card detail page with no card. Switch to our existing `CardVisual` (same one used by `virtual-cards/[cardId]` and `sub-agent-cards/[cardId]`) so every real card has a consistent visual.

## Decision

- Always render `<CardVisual>` on the real-card detail page. Drop `display_image_url` rendering entirely.
- Keep the `display_image_url` DB column (already populated by reconcile) — costs nothing, useful if we ever want to expose it.
- No new component. No new color logic. Reuse the existing helpers.

## Implementation

Single file: `app/(dashboard)/real-cards/[paymentMethodId]/page.tsx`.

1. Replace the `{pm.display_image_url && <img …/>}` block with:
   ```tsx
   <CardVisual
     color={resolveCardColor(null, pm.payment_method_id)}
     last4={pm.card_last4 || "••••"}
     expiry={expiry}
     holder={(pm.cardholder_name || "CARDHOLDER").toUpperCase()}
     holderLabel="Cardholder"
     balanceLabel="Virtual Cards"
     balance={String(pm.virtual_cards.length)}
     brand={pm.card_brand || undefined}
     issuer={pm.issuer_name || undefined}
     status="active"
   />
   ```
   - `color`: `resolveCardColor(null, pm.payment_method_id)` — same deterministic-by-id pattern the other detail pages use. No brand→color logic.
   - `balance` / `balanceLabel`: virtual-card count is the most useful number on a real card (which itself has no balance concept on our side).
   - `status="active"`: real cards saved in our DB are always active from our perspective (Crossmint disable/expired flows surface separately via enrollment).
2. Imports: `CardVisual` is already back in the file; add `resolveCardColor` to the existing `@/components/wallet/types` import. Remove the now-orphan `display_image_url` reference.

## Out of scope

- No color picker (real cards don't support `card_color` storage — that's a virtual-card concept).
- No removal of the `display_image_url` column or the mapper field — leave the data flowing.
- No new helpers in `components/wallet/types.ts`.
