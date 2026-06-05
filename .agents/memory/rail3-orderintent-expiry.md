---
name: Rail 3 orderIntent expiry & credential happy-path
description: Crossmint Card Permissions orderIntent lifetime, where the expiry is readable, and proof the headless credential chain works.
---

# Rail 3 (Crossmint Card Permissions) orderIntent expiry

## Flat 7-day TTL
A Crossmint orderIntent expires a flat **7 days after creation**, decoupled from the
mandate period. Proven empirically (staging, 2 data points):
- open-mode intent created `2026-06-05 18:54:55` → credential `expiresAt` = `2026-06-12 18:54:55` (creation + 7d to the second).
- limited/monthly intent created `2026-05-28 18:25` expired by `2026-06-05` (past its +7d = 06-04).

**Why it matters:** the mandate `maxAmount.period` (weekly/monthly/yearly) does NOT set
lifetime — a monthly card still dies in 7 days. Don't conflate spend window with intent life.
**How to apply:** to show/anticipate expiry, compute `created_at + 7 days`. Don't build a
user-facing expiry-duration picker — we send no expiry param and Crossmint ignores intent-life input; the TTL is fixed server-side.

## Where the expiry is (and isn't) readable
- `GET /order-intents/:id` returns only `{orderIntentId, agentId, payment, mandates, phase}` —
  **no timestamp**. You cannot read expiry from it.
- The expiry only surfaces as `expiresAt` in a **successful `POST /order-intents/:id/credentials`** response.
- `phase` stays `"active"` even after the 7-day cutoff. The ONLY signal an intent is dead is
  the credentials call returning `400 "... has expired. Create a new order intent to continue."`
  **`active` ≠ `spendable`.** Local `rail3_cards.status='active'` is likewise not a spendable signal.

## Headless credential happy-path is PROVEN
Full chain works without a browser for an already-verified (active, <7d) intent:
owner `firebase_refresh_token` → `securetoken.googleapis.com` ID token → Crossmint
`X-API-KEY` (client key) + `Bearer` ID token → `201` with real PAN/cvc/exp.
**Caveat:** intent *creation* is headless, but *activation* (requires-verification → active)
still needs the owner's passkey ceremony in a browser. Re-issue on expiry = new intent + ceremony.

## Env note
`crossmint-env.ts` hardcodes host+keys to **staging**, so BOTH dev and the deployed prod app
hit Crossmint staging. "Production cards" are staging orderIntents created by prod users; the
non-staging `CROSSMINT_*` secrets exist but are not wired up.
