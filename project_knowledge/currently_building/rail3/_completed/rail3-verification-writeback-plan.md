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
- Auth:
  - Verify the Firebase session via the same wrapper the create route uses.
  - Extract the Bearer JWT from the request using `extractBearerJwt` — required because Crossmint reads on this endpoint are JWT-only (server-key + userLocator returns 403; confirmed in `permissions.ts` and `paymentMethods.ts`).
- Body: none.
- Logic:
  1. Look up the card by `cardId`, verify `ownerUid` matches the session user.
  2. Call Crossmint `GET /order-intents/:orderIntentId` via `crossmintCardsFetch({ jwt })`.
  3. If Crossmint returns a `phase` that differs from `card.permissionPhase`, `await storage.updateRail3Card(cardId, { permissionPhase: fresh.phase })`.
  4. Return `{ card_id, order_intent_id, permission_phase }` (post-update value).
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
- New — **must be wrapped in `useCallback`**, otherwise a fresh function on every parent render will defeat the `OrderIntentVerificationStable` memo and restart the WebAuthn ceremony (see existing comment in the file about the "Authenticating on the other window" hang):
  ```ts
  const handleVerificationComplete = useCallback(async () => {
    if (!createdCard) return;
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
  }, [createdCard?.cardId, onComplete]);
  ```
  Then pass `onComplete={handleVerificationComplete}` to `OrderIntentVerificationStable`.
- Behaviour:
  - Crossmint says `active` → dialog flips to "Authorized" with truth, DB is correct.
  - Crossmint says `requires-verification` → dialog stays on the SDK widget. User can retry by tapping passkey again. No false-positive flip.

### 5. Bot checkout — NOT changing in this round

Originally planned to add an error-triggered reconcile on the `permissionPhase !== "active"` gate in `app/api/v1/bot/rail3/checkout/route.ts`. **Dropped**, because:

- The bot has no Firebase JWT. It auths via bot API key and uses server-key + `userLocator` for credential fetches.
- Crossmint reads on order-intents are JWT-only (server-key + userLocator → 403), so a reconcile from this path would require either the in-flight Firebase refresh-token plan to land first, or server-side minting of a custom-token → ID-token via `firebase-admin` just for this call. Both are scope creep.
- The dialog writeback (sections 1-4) is the actual fix: new cards land as `active` in the DB the moment the user finishes the passkey ceremony. The bot's phase gate will simply be correct going forward.
- If a card is genuinely stuck at `requires-verification`, the user re-taps the passkey in the dashboard and the writeback corrects the DB. The bot retries and succeeds.

Revisit only if real users hit a bot-side 403 on a card that Crossmint already considers active. Will not pre-emptively build.

## Cleanup (post-merge)

- Delete `app/api/v1/rail3/cards/[cardId]/crossmint-state/route.ts` (temp diagnostic).
- Remove `console.log("[Rail3 DEBUG] createOrderIntent returned ...")` at `app/api/v1/rail3/cards/route.ts:193-200`.

## Files touched

| File | Change |
|---|---|
| `app/api/v1/rail3/cards/[cardId]/refresh-phase/route.ts` | NEW — ~30 lines |
| `features/payment-rails/rail3/permissions.ts` | ADD `getOrderIntent` — ~10 lines |
| `components/rail3/add-card-dialog.tsx` | EDIT verification onComplete (wrap in `useCallback`) — ~20 lines diff |
| `app/api/v1/rail3/cards/[cardId]/crossmint-state/route.ts` | DELETE (post-merge) |
| `app/api/v1/rail3/cards/route.ts` | REMOVE temp debug log (post-merge) |

Total: ~55 lines of real change. Three files edited, one file deleted, one file with debug-log removed.

## Test plan (manual, in staging)

1. Create a new virtual card via the dashboard. Complete the passkey ceremony.
2. Expect: dialog flips to "Authorized". DB row shows `permission_phase = 'active'`.
3. Verify via temp diagnostic endpoint (before deleting it) that Crossmint and DB agree.
4. Create a card and cancel the verification (close the popup). Expect: dialog stays in verification state, DB stays `requires-verification`.
5. Bot checkout on the active card: expect success. (Blocked if Firebase refresh token plan isn't done — note as out-of-scope.)

## Migration to webhook later

When Crossmint exposes `orderIntent.*` webhook events, add a handler at `/api/v1/rail3/webhooks/crossmint` following the shape of `/api/v1/card-wallet/webhooks/crossmint` (svix HMAC, `CROSSMINT_WEBHOOK_SECRET_STAGING`). It writes to the same `permission_phase` column. The `refresh-phase` endpoint and the error-triggered reconcile both remain as safety nets — same pattern Stripe recommends. No code thrown away.
