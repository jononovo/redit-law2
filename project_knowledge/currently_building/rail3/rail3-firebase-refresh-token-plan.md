# Rail 3 — Firebase Refresh Token for Headless Bot Purchases

## Why this exists

All Crossmint agentic-commerce write endpoints (`/agents`, `/order-intents`, `/payment-methods/:id/agentic-enrollment`, `/order-intents/:id/credentials`) require **client API key + `Authorization: Bearer <Firebase ID token>`**. Server-key + `userLocator` is rejected with 403 — verified against the docs and reproduced in staging.

Crossmint does **not** offer a backend-agent provision for cards. `Server Agent Wallets` exists, but only for stablecoin wallets — cards are JWT-only end to end.

User-present flows (the Add Card dialog, virtual-card creation, revoke, etc.) are handled by Step 1: the browser's `authFetch` always sends the Firebase ID token as Bearer, and our BFF forwards it to Crossmint.

**Headless bot purchases have no browser, no live user, and no Bearer.** This plan covers how the platform keeps Firebase auth alive per owner so the BFF can mint a fresh ID token on demand and call `/order-intents/:id/credentials` on the owner's behalf.

## Auth model (the one we're committing to)

```
bot  ──(bot-token)──▶  our BFF  ──(client-key + fresh JWT)──▶  Crossmint
                          ▲
                          │ exchange refresh_token → ID token
                          ▼
                   Google Identity Toolkit
                   (securetoken.googleapis.com)
```

- Each owner has **one Firebase refresh token** stored encrypted on our side.
- Refresh tokens are essentially permanent unless the user changes password / Firebase admin revokes / Crossmint revokes.
- When the BFF needs to call Crossmint as the owner, it exchanges the refresh token for a fresh ID token (1h TTL) and uses that as Bearer.
- We cache the ID token in-process for ~50 minutes per owner to keep latency and Google quota down.
- On 401 from the Google token exchange, we mark the owner's bot as `reauth_required` and surface it in the UI. The owner re-pairs to fix.

The bot never sees the refresh token, never sees the ID token, never sees the client API key. Same trust model as everything else: the bot is authenticated to us; we are authenticated to Crossmint on the owner's behalf.

## Step 2 — Refresh token capture + storage

### 2.1 Schema

New table:
```sql
CREATE TABLE owner_firebase_credentials (
  owner_uid              text PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
  encrypted_refresh_token text NOT NULL,
  status                 text NOT NULL DEFAULT 'active', -- 'active' | 'reauth_required'
  last_refreshed_at      timestamptz,
  last_error             text,
  updated_at             timestamptz NOT NULL DEFAULT now()
);
```
- One row per owner.
- `status` flips to `reauth_required` on Google 401. UI consumes it to prompt re-pairing.
- No history kept. New token replaces old.

Drizzle: `shared/schema.ts` table + `insert*Schema` + types. Storage: new fragment `server/storage/owner-firebase-credentials.ts`. Re-export from `server/storage/types.ts` and `server/storage/index.ts`.

### 2.2 Encryption helper

`features/platform-management/auth/refresh-token-crypto.ts`:
- AES-256-GCM, key from `OWNER_REFRESH_TOKEN_ENCRYPTION_KEY` env (32 raw bytes, base64-encoded).
- `encryptRefreshToken(plain) → string` returns `base64(iv) + ':' + base64(ciphertext) + ':' + base64(authTag)`.
- `decryptRefreshToken(stored) → string` inverse.
- Throws explicit on missing key (no silent fallback per user prefs).
- Add the env var to `missing_secrets` UX so the user is prompted on first use.

### 2.3 Capture during bot pairing

Today's bot pairing flow lives in `features/platform-management/bot-management/`. We extend it so:
1. Browser, post-Firebase-sign-in, has access to `currentUser.getIdToken()` and `currentUser.refreshToken`.
2. New endpoint `POST /api/v1/auth/refresh-token` (session-cookie protected) accepts `{ refresh_token }`, encrypts, upserts into `owner_firebase_credentials`.
3. Pairing UI calls this once during the pair handshake, before the bot is marked `active`.
4. Idempotent: re-pairing overwrites the stored token and clears `status` back to `active`.

For owners with **existing bots** (pre-this-flow), no refresh token is on file. Their headless purchases will fail with `reauth_required` until they revisit the bot pairing page. We surface a one-time banner: "Re-pair your bot to enable autonomous card purchases."

### 2.4 Token-exchange helper

`features/platform-management/auth/firebase-token-exchange.ts`:
- `getFreshIdToken(ownerUid: string): Promise<string>`.
- Process-local LRU cache: `Map<ownerUid, { idToken, expiresAt }>`. Hit if `expiresAt > now + 60s`.
- On miss: load row, decrypt, POST to `https://securetoken.googleapis.com/v1/token?key=<FIREBASE_WEB_API_KEY>` with `grant_type=refresh_token&refresh_token=<token>`. Cache result for 50min.
- On 400/401 from Google: update row `status = 'reauth_required'`, `last_error = <code>`, throw `ReauthRequiredError`.
- `FIREBASE_WEB_API_KEY` — already in the frontend config; promote to server env var. (Public-ish; safe to read server-side, doesn't grant any privilege on its own — refresh tokens do.)

## Step 3 — Wire the helper into the headless bot purchase path

### 3.1 Migrate `fetchOneTimeCredentials`

`features/payment-rails/rail3/credentials.ts`:
- Change signature from `{ userLocator }` to `{ jwt }`.
- Drop `userLocator` from the request (same shape as the Step 1 helpers).

### 3.2 Update the two callers

**`app/api/v1/bot/rail3/checkout/route.ts`** (headless bot path):
- Replace `userLocator: ownerUidToUserLocator(card.ownerUid)` with `jwt: await getFreshIdToken(card.ownerUid)`.
- Wrap in try/catch for `ReauthRequiredError` → return 412 `{ error: "reauth_required", bot_id }` so the bot can surface the failure to its platform.
- Bot polling / webhook layer translates 412 into a user-visible state.

**`features/agent-interaction/approvals/rail3-fulfillment.ts`** (approval-driven fulfillment, runs server-side after owner approval):
- Same change. Owner is approving, but the call still happens in the background after the approval, so we still need the refresh-token path.
- On `ReauthRequiredError` → mark approval as failed with a clear reason; owner sees it in the approvals UI.

### 3.3 Cleanup

- `ownerUidToUserLocator` no longer has any callers. Remove from `client.ts` and `index.ts`.
- Remove the `userLocator` branch from `crossmintCardsFetch` if nothing else uses it (verify after Step 3 lands).

## Step 4 — Doc updates (folded into Steps 2–3)

- Rewrite the auth section of `rail3-staging-migration-plan.md` to point at this doc.
- One-line addition to `replit.md`'s Rail 3 row pointing here.

## Out of scope (intentional)

- Multi-device refresh tokens. One per owner.
- Refresh-token rotation on our side. Google handles rotation transparently in the exchange response; if a new refresh token comes back, we upsert it.
- Custom JWT minting / our own JWKS / Crossmint dashboard reconfig.
- Backfilling existing owners automatically. They re-pair when they want autonomous bot purchases.

## Risks acknowledged

- We hold permanent-ish credentials per user. Same operational sensitivity as the Crossmint server API key. Encrypt at rest, never log, audit DB access.
- A leaked `OWNER_REFRESH_TOKEN_ENCRYPTION_KEY` + DB dump = total compromise of all owners' Firebase sessions. Standard secrets hygiene applies. Rotate via re-encrypt-in-place migration if ever needed.
- Google token-exchange rate limits exist but are generous; our 50-min cache makes them irrelevant in practice.
