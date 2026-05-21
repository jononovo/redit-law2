# Rail 3 — Verification Writeback Plan

## Problem

`rail3_cards.permission_phase` is set once at creation (always `"requires-verification"`) and **never updated** after that. The client-side `<OrderIntentVerification>` SDK fires `onVerificationComplete` and we flip local React state to `"active"`, but no server call is ever made, so the DB stays `"requires-verification"` forever.

Empirically verified via temp diagnostic (`/api/v1/rail3/cards/[cardId]/crossmint-state`) against staging — multiple cards where Crossmint reports `phase: "active"` while our DB still says `requires-verification`.

Downstream impact:
- `app/api/v1/bot/rail3/checkout/route.ts:34` gates on `card.permissionPhase !== "active"` → bot purchases on actually-verified cards 403 forever.
- Dashboard shows "AWAITING AUTHORIZATION" on verified cards.

## Non-goals

- No rescue for the existing stuck cards. User will delete and recreate.
- No webhook (Crossmint hasn't exposed `orderIntent.*` events yet).
- No background poller / cron.
- No reconcile on the cards list pageview.
- No retry-verification button for genuinely-failed SDK ceremonies (dialog stays open naturally if the server says it's still pending).

## Strategy

Trust Crossmint as the source of truth at the two moments it matters:
1. Verification ceremony finishes in the browser → server asks Crossmint, writes the truth.
2. A bot tries to use the card and the phase gate trips → server asks Crossmint once, retries, then 403s if still pending.

Nothing polls. Nothing fires on a timer. Nothing runs on a generic pageview.

## Changes

### 1. New endpoint — `POST /api/v1/rail3/cards/[cardId]/refresh-phase`

- File: `app/api/v1/rail3/cards/[cardId]/refresh-phase/route.ts`
- Auth: session (cookie) + Bearer JWT (Firebase ID token), same as the create route.
- Body: none.
- Logic:
  1. Look up the card by `cardId`, verify ownership.
  2. Call Crossmint `GET /order-intents/:orderIntentId` via `crossmintCardsFetch` with the Bearer JWT.
  3. If Crossmint returns a `phase` that differs from `card.permissionPhase`, `UPDATE rail3_cards SET permission_phase = ?`.
  4. Return `{ card_id, order_intent_id, permission_phase }` (the post-update value).
- Failure: if Crossmint returns non-2xx, surface the status + body, do not mutate the DB.
- ~30 lines. Auth shape copied from `app/api/v1/rail3/cards/route.ts`.

### 2. Server module — `getOrderIntent` helper

- File: `features/payment-rails/rail3/permissions.ts`
- Add a thin sibling to `createOrderIntent` / `revokeOrderIntent`:
  ```ts
  export async function getOrderIntent(params: { jwt: string; orderIntentId: string }): Promise<OrderIntent>
  ```
- Same `crossmintCardsFetch` + `unwrapCrossmint` plumbing. ~10 lines.

### 3. Storage — phase setter

- File: `server/storage/rail3.ts` (existing)
- Confirm an existing `updateRail3Card(cardId, { permissionPhase })` path works, or add a narrow `setRail3CardPhase(cardId, phase)` if cleaner.
- No schema change. `permission_phase` column already exists.

### 4. Client — call refresh-phase on verification complete

- File: `components/rail3/add-card-dialog.tsx`
- Current (lines 380-383):
  ```ts
  onComplete={() => {
    setCreatedCard((cur) => cur ? { ...cur, phase: "active" } : cur);
    onComplete();
  }}
  ```
- New:
  ```ts
  onComplete={async () => {
    try {
      const res = await authFetch(
        `/api/v1/rail3/cards/${createdCard.cardId}/refresh-phase`,
        { method: "POST" },
      );
      const json = await res.json();
      if (res.ok && json.permission_phase) {
        setCreatedCard((cur) => cur ? { ...cur, phase: json.permission_phase } : cur);
      } else {
        setError(json.message || json.error || "verification_refresh_failed");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      onComplete();
    }
  }}
  ```
- Behaviour:
  - Crossmint says `active` → dialog flips to "Authorized" with truth, DB is correct.
  - Crossmint says `requires-verification` → dialog stays on the SDK widget. User can retry by tapping passkey again. No false-positive flip.

### 5. Bot checkout — error-triggered reconcile

- File: `app/api/v1/bot/rail3/checkout/route.ts`
- Replace the current early-return:
  ```ts
  if (card.permissionPhase !== "active") return 403;
  ```
- With:
  ```ts
  if (card.permissionPhase !== "active") {
    // Reconcile once against Crossmint in case the SDK flipped it but we missed the writeback.
    const fresh = await getOrderIntent({ jwt, orderIntentId: card.orderIntentId }).catch(() => null);
    if (fresh && fresh.phase !== card.permissionPhase) {
      await storage.updateRail3Card(card.cardId, { permissionPhase: fresh.phase });
      card = { ...card, permissionPhase: fresh.phase };
    }
    if (card.permissionPhase !== "active") return 403;
  }
  ```
- Bot checkout uses a different JWT path (Firebase refresh token plan — currently unfinished). If `jwt` isn't available here, skip the reconcile and just 403. Document the gap; do not block this plan on it.
- ~10 lines.

## Cleanup (post-merge)

- Delete `app/api/v1/rail3/cards/[cardId]/crossmint-state/route.ts` (temp diagnostic).
- Remove `console.log("[Rail3 DEBUG] createOrderIntent returned ...")` at `app/api/v1/rail3/cards/route.ts:193-200`.

## Files touched

| File | Change |
|---|---|
| `app/api/v1/rail3/cards/[cardId]/refresh-phase/route.ts` | NEW — ~30 lines |
| `features/payment-rails/rail3/permissions.ts` | ADD `getOrderIntent` — ~10 lines |
| `components/rail3/add-card-dialog.tsx` | EDIT onComplete handler — ~15 lines diff |
| `app/api/v1/bot/rail3/checkout/route.ts` | EDIT phase gate — ~10 lines diff |
| `app/api/v1/rail3/cards/[cardId]/crossmint-state/route.ts` | DELETE (post-merge) |
| `app/api/v1/rail3/cards/route.ts` | REMOVE temp debug log (post-merge) |

Total: ~65 lines of real change.

## Test plan (manual, in staging)

1. Create a new virtual card via the dashboard. Complete the passkey ceremony.
2. Expect: dialog flips to "Authorized". DB row shows `permission_phase = 'active'`.
3. Verify via temp diagnostic endpoint (before deleting it) that Crossmint and DB agree.
4. Create a card and cancel the verification (close the popup). Expect: dialog stays in verification state, DB stays `requires-verification`.
5. Bot checkout on the active card: expect success. (Blocked if Firebase refresh token plan isn't done — note as out-of-scope.)

## Migration to webhook later

When Crossmint exposes `orderIntent.*` webhook events, add a handler at `/api/v1/rail3/webhooks/crossmint` following the shape of `/api/v1/card-wallet/webhooks/crossmint` (svix HMAC, `CROSSMINT_WEBHOOK_SECRET_STAGING`). It writes to the same `permission_phase` column. The `refresh-phase` endpoint and the error-triggered reconcile both remain as safety nets — same pattern Stripe recommends. No code thrown away.
