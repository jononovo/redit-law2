# Rail 3 — Verification outside Radix Dialog

## Problem

`OrderIntentVerification` is rendered inside our Radix `<Dialog>`. Three layers of conflict:

1. Radix Dialog sets `pointer-events: none` on `<body>` while open. `pointer-events` is inherited, so the mock Visa overlay (appended to `document.body` by BasisTheory's mock Visa SDK) becomes unclickable even though it's visually on top (z-10001 vs Radix z-50).
2. BasisTheory renders its OWN modal (`InstructionVerificationModal`, z-9999, with z-9998 backdrop) on top of our Radix dialog. So we have two stacked modals competing for focus and visually crowding the Visa overlay.
3. Our Radix dialog's modal content explains "Authorize this card / Crossmint requires a passkey tap…" — duplicates what BasisTheory's modal already says ("Authenticate / Use your passkey to authenticate this instruction").

Confirmed diagnostic at runtime: `overlayExists: true`, `bodyPointerEvents: 'none'`, `overlayPointerEvents: 'none'`. Even after JS hack to force pointer-events to auto, overlay still not visible to user — likely BtAi modal backdrop is also covering it. Layered patches won't hold up against real Visa SDK either.

## Fix

Close the Radix Dialog as soon as the card is created. Render `OrderIntentVerificationStable` as a sibling of the dialog (not a child), so the only modal on screen is BtAi's, and the mock Visa overlay has no competing portal above it.

## Changes

### `components/rail3/add-card-dialog.tsx`

- Lift `createdCard` state to the outer `AddCardDialog` wrapper so the Provider + verification tree stay mounted across parent `open=false`.
- Outer `AddCardDialog` rendering rule: `if (!props.open && !createdCard) return null`. Keeps verification mounted after parent thinks dialog is closed.
- Inner `<Dialog open={props.open && !createdCard}>` — dialog hides as soon as card is created.
- Render `<OrderIntentVerificationStable>` as a sibling of `<Dialog>`, conditional on `createdCard && createdCard.verificationConfig && createdCard.phase !== 'active'`.
- On `onVerificationComplete`: clear `createdCard`, call `props.onComplete()` (refreshes card list), call `props.onOpenChange(false)`.
- On `onVerificationError`: same — clear `createdCard`, close, call `onComplete()` so card list refreshes (card exists in pending state; user can re-authorize from card list later).
- Delete the "Authorize this card" branch of the dialog content (the second `else` block) — no longer needed; BtAi modal handles it.
- Delete the pointer-events MutationObserver hack inside `OrderIntentVerificationStable` — no longer needed once dialog isn't above the overlay.
- Delete the `phase === 'active'` success view inside the dialog — verification completion now closes everything and refreshes the card list.

## Impact / breakage check

| Surface | Currently | After change | Risk |
|---|---|---|---|
| `app/(dashboard)/virtual-cards/page.tsx` consumer | passes `open`, `onOpenChange`, `paymentMethods`, `onComplete` | unchanged | none |
| `Rail3CrossmintProvider` lifecycle | mounts when `open=true`, unmounts when `open=false` | mounts when `open=true OR verification active`, unmounts when both false | none — strictly longer lifetime, JWT bridge already self-cleans on unmount |
| `handleCreate` already calls `onComplete()` after card creation | refreshes card list immediately, before verification | same | none |
| BtAi `Cancel` button on its modal | rejects `verifyInstruction()` promise → our `onError` fires | same — but now we also close everything and refresh card list. Card persists in pending state in DB. | low — re-authorization from card list is out-of-scope follow-up. User can re-create a new card. Flag as known follow-up. |
| Re-renders re-triggering verification (the original memoization fix) | `OrderIntentVerificationStable` memoizes `orderIntent` object identity | unchanged | none |
| API contracts (`POST /api/v1/rail3/cards`, `verification_config` shape) | unchanged | unchanged | none |
| Other rails (Rail 1, Rail 5) | unaffected | unaffected | none |
| Tests | no automated tests cover this dialog | unaffected | none |

## Rollback

Revert the single commit. The dialog goes back to wrapping verification inside Radix.

## Out of scope (track as follow-ups)

- Re-authorization flow from card list for cards left in pending state.
- Removing now-unused `phase === 'active'` success path (will be removed in this change).
- Deciding whether to retire `OrderIntentVerificationStable` memoization once verification renders at top level (it's still defensive — parent state churn could still re-render it).
