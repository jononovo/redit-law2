---
name: Rail 3 orderIntent expiry & credential happy-path
description: Crossmint Card Permissions orderIntent lifetime, where the expiry is readable, and proof the headless credential chain works.
---

# Rail 3 (Crossmint Card Permissions) orderIntent expiry

## RESOLVED (2026-06-09): flat 7d was a Crossmint STAGING BUG; we now always send `expiresAt`
Crossmint support confirmed the flat ~7-day expiry was a **staging bug, not prod behavior**, and said
they'd update their docs. We no longer rely on Crossmint's default: `createOrderIntent` now **always
sends an explicit `expiresAt`** (ISO 8601, camelCase) in the order-intent POST body — owner-chosen via
an "Expires" dropdown (1y default / 1m / 1w / custom date), server defaults to +1y when omitted. The
chosen value is persisted in the new nullable `rail3_cards.expires_at` column (don't depend on Crossmint
echoing it back). `expiresAt` field name is **unverified against a live staging mint** — Basis Theory (the
layer under Crossmint) documents `expires_at` on its Instruction; Crossmint's order-intents endpoint is
undocumented (`unstable`) so camelCase `expiresAt` is the assumption. If staging shows the sent value
isn't honored, try `expires_at` snake_case before assuming the passthrough is broken.
**Supersedes the "don't build an expiry picker" / "blocker is the Crossmint wrapper" conclusions below
— those were written before support confirmed the bug.** The historical 7d observations below remain
accurate as STAGING-BUG data, kept for context.

## ~7-day expiry — OBSERVED ON STAGING, was the staging bug (see RESOLVED above)
**We do not know WHY this happens or whether it is only a staging limitation.** Crossmint has
**not enabled production for us yet**, so every observation is against Crossmint STAGING via their
API — zero real-prod data. It may be a staging-only short TTL, a Crossmint default, or something
else; treat the cause as OPEN until prod is enabled and we re-test (and/or Crossmint responds).

The 7-day figure is **not in Crossmint's docs** (public AI-agents/order-lifecycle pages
state no orderIntent TTL; the Agentic Cards API ref is gated). It is **our empirical
observation against Crossmint STAGING only** — we have zero real-Crossmint-production data
(see env note: app is hardcoded to staging). Prod Crossmint may differ or expose options.
**Treat 7 days as a heuristic, not a contract: persist the real `expiresAt` from a
successful credentials response instead of hardcoding `created_at + 7d`.**

A Crossmint orderIntent expires a flat **7 days after creation** (staging), **fully independent
of the mandate period** — proven by a `yearly` intent also getting exactly 7 days. Observed
empirically across 6 prod (=staging) intents minted via `POST /order-intents/:id/credentials`:
- two intents created same-day → credential `expiresAt` = creation **+ 7.00 days to the second**; one was `$500 monthly`, the other `$100k YEARLY` — both 7d. (period has zero effect on lifetime.)
- four older intents (ages 8.0/8.0/10.0/12.9 days, all monthly) → `400 "Order intent … has expired. Create a new order intent to continue."`
- The credential `expiresAt` IS the intent lifetime, not a short-lived credential TTL (the 400 explicitly says the *order intent* expired).
- PROOF it's anchored to CREATION not mint time: card 10 created 18:54:55, minted ~45min later at 19:40, yet `expiresAt` = 18:54:55 + 7d (the creation second), not mint+7d. So `expiresAt` is Crossmint's own declared intent-lifetime value, not invented.
- HONEST LIMITS: only *observed expiry events* were monthly cards (the yearly card's 7d is its declared `expiresAt`, not a witnessed expiry — it was hours old). Exact cutoff never bracketed (no day-6-alive vs day-8-dead test); 7.00d is taken from Crossmint's `expiresAt`.

## Exact API responses from `POST /order-intents/:id/credentials`
- **Expired (HTTP 400)** — verbatim message string Crossmint returns:
  `"Order intent '<orderIntentId>' has expired. Create a new order intent to continue."`
  (The wording explicitly names the *order intent* as what expired — not the credential.)
- **Alive (HTTP 201)** — body shape (note `expirationMonth`/`expirationYear` are STRINGS):
  ```json
  { "card": { "number": "<PAN>", "expirationMonth": "12", "expirationYear": "2027", "cvc": "<cvc>" },
    "expiresAt": "2026-06-12T19:33:38.011Z" }
  ```
  `expiresAt` = the intent's creation timestamp + 7 days (see anchoring proof above). The card's own
  `expirationMonth/Year` (e.g. 12/2027) is the *underlying card's* expiry, unrelated to the 7-day intent life.

## Data model: the "virtual card" IS the orderIntent (status is stale on expiry)
A `rail3_cards` row == **one Crossmint orderIntent** (1:1) — it's the spending *permission*, what the UI
shows as "active". It is NOT the PAN/CVC: those are one-time credentials minted per-transaction from the
intent; the real backing card lives in `rail3PaymentMethods`. So when the intent hits ~7d, the whole
virtual card (permission) dies, not just a credential.
**Detection gap — "active" ≠ spendable at BOTH layers:**
- Our `rail3_cards.status` is *meant* to mirror Crossmint `phase` (values incl. `expired`) but in practice
  stays `active` for expired intents — nothing flips it (all 9 prod rows = `active`, 7 actually expired).
- Crossmint's own `getOrderIntent` also returns `phase: "active"` for an already-expired intent.
- Only reliable expiry signals: attempt a credential mint (400 "has expired") OR compute `created_at + 7d`.

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

## The expiry IS settable at the provider layer (Basis Theory) — 7d is a Crossmint default
Crossmint sits on Basis Theory's agentic stack: **Enrollment → Instruction → Credentials**.
Basis Theory's "Instruction" == Crossmint's "orderIntent", and its docs document a
caller-set **`expires_at`** ("Instructions control how much the agent can spend AND when the
authorization expires"; create example carries `expires_at`; status flips to `expired` past it).
So expiry is **NOT a hardcoded protocol limit** — it's a per-instruction field.
**Conclusion:** the 7-day TTL is almost certainly **Crossmint's default**, applied because
`createOrderIntent` only forwards `agentId/payment/mandates` and doesn't expose the `expires_at`
passthrough. Other BT TTLs rule out alternatives: Token Intent default 1 day (max 48h via quota),
CVC retention 1 hour — neither is 7d.
**How to apply:** a user-facing expiry picker is viable *only once Crossmint forwards `expires_at`*
on order-intent creation — the blocker is the Crossmint wrapper, not the protocol. Ask Crossmint
to expose it (or check their gated Agentic Cards ref). Visa Intelligent Commerce public docs
publish no numeric TTL (API is partner-gated); the concrete settable expiry lives at the BT instruction.
