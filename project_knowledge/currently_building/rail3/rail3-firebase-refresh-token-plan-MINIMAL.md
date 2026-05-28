---
status: planned
owner: agent
scope: rail3
last_updated: 2026-05-28
supersedes: rail3-firebase-refresh-token-plan.md (full version — kept for reference)
files_touched:
  - shared/schema.ts (add 2 columns to `owners` table)
  - server/storage (owners storage fragment — add 3 helpers)
  - features/platform-management/auth/firebase-token-exchange.ts (new)
  - app/api/v1/auth/firebase-refresh-token/route.ts (new)
  - features/platform-management/auth/auth-context.tsx (capture refresh token on sign-in)
  - features/payment-rails/rail3/credentials.ts (swap userLocator → jwt)
  - app/api/v1/bot/rail3/checkout/route.ts (call getFreshIdToken)
  - features/agent-interaction/approvals/rail3-fulfillment.ts (call getFreshIdToken)
---

# Rail 3 — Firebase Refresh Token (Minimal, Production-Safe)

## Why this exists

Crossmint's agentic-commerce write endpoints (`/order-intents/:id/credentials`, etc.) require a Firebase ID token as Bearer. The owner's browser has one; a headless bot does not.

We need: keep enough Firebase auth per owner that the BFF can mint a fresh ID token on demand, with no live user.

## What we're storing — and security posture

A Firebase **refresh token** is essentially permanent (until password change / admin revoke / Google revoke). Anyone holding one can mint ID tokens as that user.

**Stored as plain `text` in Postgres for this pass.** Justification:
- Provider-level disk encryption already covers the DB at rest.
- DB access is gated by `DATABASE_URL` secret; anyone with that likely has env-var access too, so app-layer AES adds limited real-world defense.
- The app-layer encryption value (partial-leak hardening: vendor backup shares, SQL-injection-read, mis-placed dumps) is real but not day-one critical at this stage.
- Loss of an encryption key would force every owner to re-sign-in to repopulate. Avoidable failure mode by simply not adding the key.

**TODO before SOC2 / GA at scale:** encrypt this column at rest (AES-256-GCM, one env-var key).

What we are **not** doing in this pass, with rationale:
- **No dedicated table.** A column on `owners` is fine.
- **No reauth UI banner.** Return 412 `reauth_required` from the bot endpoint; surface a one-line note on the bot card. Fancier UX later.
- **No audit log of token use.** Add later if compliance asks.
- **No app-layer encryption** (see above).

## Auth model (committed)

```
bot  ──(bot-token)──▶  our BFF  ──(client-key + fresh JWT)──▶  Crossmint
                          ▲
                          │ exchange refresh_token → ID token (cached ~55 min)
                          ▼
                   Google Identity Toolkit
                   (securetoken.googleapis.com)
```

- One Firebase refresh token per owner, stored as plain text (see "What we're storing" above).
- BFF maintains an in-process LRU of fresh ID tokens (~55 min TTL).
- On Google 401 during exchange: clear the row's stored token, return 412 from the calling route.
- Bot never sees refresh token, ID token, or Crossmint client key.

## Step 1 — Storage

**Schema change** (`shared/schema.ts`):

Add to the existing `owners` table (line 387, keyed by `uid`):
```ts
// TODO: encrypt at rest (AES-256-GCM) before SOC2 / GA at scale.
firebaseRefreshToken: text("firebase_refresh_token"),
firebaseRefreshTokenUpdatedAt: timestamp("firebase_refresh_token_updated_at"),
```

Both nullable so existing rows don't need a backfill. Drizzle `db:push`.

**Storage helpers** (extend the owners storage fragment — `session.ts:34` already uses `storage.getOwnerByUid`):
- `setFirebaseRefreshToken(ownerUid, token): Promise<void>` — upserts owner row if missing, then writes token + updates timestamp.
- `getFirebaseRefreshToken(ownerUid): Promise<string | null>` — returns the token directly.
- `clearFirebaseRefreshToken(ownerUid): Promise<void>` — nulls both columns. Called on Google 401.

## Step 2 — Capture on every sign-in (not pairing)

**New endpoint:** `POST /api/v1/auth/firebase-refresh-token`
- Session-cookie protected via `getCurrentUser` (only the signed-in owner can write their own token).
- Body: `{ refresh_token: string }`.
- Validates owner row exists (upsert via existing owners storage if not — same pattern session.ts already follows).
- Writes token + timestamp → returns `{ ok: true }`.

**Client change** (`features/platform-management/auth/auth-context.tsx`):

The existing sign-in flow already calls `exchangeTokenForSession(idToken)` after every Firebase auth event. Right alongside that call, also POST the refresh token:

```ts
async function captureRefreshToken(refreshToken: string): Promise<void> {
  await fetch("/api/v1/auth/firebase-refresh-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).catch(() => {});  // non-blocking — sign-in still succeeds if this fails
}
```

Called in three places, all in `auth-context.tsx`:
- After `signInWithGoogle` succeeds (`result.user.refreshToken`).
- After `signInWithGithub` succeeds.
- After `completeMagicLink` succeeds.
- Also in the `onAuthStateChanged` listener (`firebaseUser.refreshToken`) so session restores re-capture in case rotation happened.

**Why this is better than capture-during-pairing:**
- Covers every owner, not just those with paired bots.
- Auto-refreshes on every sign-in, so a revoked token self-heals when the user re-logs in.
- Existing paired owners don't need to re-pair — they just sign in once.
- One client touchpoint instead of plumbing into pairing UI.

Idempotent. Each call overwrites.

## Step 3 — Token exchange helper

**New file:** `features/platform-management/auth/firebase-token-exchange.ts`

```ts
const cache = new Map<string, { idToken: string; expiresAt: number }>();

export async function getFreshIdToken(ownerUid: string): Promise<string> {
  const cached = cache.get(ownerUid);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.idToken;

  const refreshToken = await storage.getFirebaseRefreshToken(ownerUid);
  if (!refreshToken) throw new ReauthRequiredError(ownerUid, "no_refresh_token");

  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_WEB_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });
  if (!res.ok) {
    await storage.clearFirebaseRefreshToken(ownerUid);
    throw new ReauthRequiredError(ownerUid, `google_${res.status}`);
  }
  const { id_token, refresh_token: rotated, expires_in } = await res.json();

  // Google occasionally rotates the refresh token. Upsert if changed.
  if (rotated && rotated !== refreshToken) {
    await storage.setFirebaseRefreshToken(ownerUid, rotated);
  }

  const idToken = id_token as string;
  const expiresAt = Date.now() + (Number(expires_in) - 60) * 1000;
  cache.set(ownerUid, { idToken, expiresAt });
  return idToken;
}
```

- API key: read `process.env.NEXT_PUBLIC_FIREBASE_API_KEY` server-side (already set; `NEXT_PUBLIC_*` env vars are accessible from server code too). No new secret needed.
- `ReauthRequiredError` extends `Error` with `ownerUid` field; thrown to callers.

## Step 4 — Wire into the rail3 paths

**`features/payment-rails/rail3/credentials.ts`:**
- Change signature from `{ userLocator }` to `{ jwt }`.
- Drop `userLocator` from the request body / fetch call.

**`app/api/v1/bot/rail3/checkout/route.ts`:**
- Replace `userLocator: ownerUidToUserLocator(card.ownerUid)` with `jwt: await getFreshIdToken(card.ownerUid)`.
- Wrap in try/catch for `ReauthRequiredError` → return 412 `{ error: "reauth_required", message: "Owner must re-pair their bot to enable autonomous purchases." }`.

**`features/agent-interaction/approvals/rail3-fulfillment.ts`:**
- Same swap. On `ReauthRequiredError` → mark approval failed with clear reason.

**Do NOT touch — kept on userLocator (verified by ripgrep, Crossmint accepts server-key for reads):**
- `app/api/v1/rail3/payment-methods/route.ts:24, 108` — owner's PM list (GET, read).
- `app/api/v1/rail3/payment-methods/[paymentMethodId]/route.ts:38` — PM detail (GET, read).

`ownerUidToUserLocator` stays in `client.ts`. `userLocator` branch in `crossmintCardsFetch` stays.

## Step 5 — Backfill posture

No special backfill needed thanks to the login-time capture. Existing owners will populate their refresh token the next time they sign in (which happens at least every 5 days because that's the session-cookie expiry). Bot purchases attempted before that first sign-in return 412 with "Owner must sign in to enable autonomous purchases." No re-pair UX required.

## Verification

Before merging:

1. **Confirm the auth model assumption** with the two-script test from prior session messages:
   - Script A: server-key + userLocator → expect 403 (proves current path is broken).
   - Script B: client-key + Bearer ID token → expect 200 (proves the JWT path works).
   - Script B with a freshly-exchanged ID token from a refresh token → expect 200 (proves the whole exchange chain works).
2. Pair a test bot end-to-end; confirm the refresh-token row populates.
3. Trigger a bot checkout; confirm the cache populates and the call succeeds.
4. Wait an hour; trigger another; confirm the cache refreshed transparently.
5. Revoke the test user's session in Firebase console; trigger a checkout; confirm 412 surfaces.

## Acceptance

- Bot `POST /api/v1/bot/rail3/checkout` succeeds against staging Crossmint without a live browser session.
- `/order-intents/:id/credentials` returns 200 (was 403).
- Cache: second bot purchase within an hour does NOT hit `securetoken.googleapis.com`.
- Bad refresh token → 412 from the bot endpoint, row cleared, owner sees re-sign-in prompt.

## Out of scope (don't build)

- Dedicated `owner_firebase_credentials` table.
- Multi-device refresh tokens.
- Reauth UI banner / modal.
- Audit log of token exchanges.
- Key rotation automation.
- Backfill for existing owners.
- Crossmint master-agent (shared-agentId) pattern — different design, decoupled from this work.

## Risks acknowledged

- We hold permanent-ish credentials per user in plain text. Provider disk encryption + tight DB access (`DATABASE_URL` secret) is the only protection. Never log the token. Never include it in error responses.
- A full DB leak = every owner's Firebase session compromised. Mitigation deferred to the SOC2 / GA hardening pass (encrypt-at-rest column).
- Google token-exchange rate limits: generous; the cache keeps us well under.
