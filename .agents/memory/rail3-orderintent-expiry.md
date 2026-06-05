---
name: Rail 3 orderIntent expiry & credential happy-path
description: Crossmint Card Permissions orderIntent lifetime, where the expiry is readable, and proof the headless credential chain works.
---

# Rail 3 (Crossmint Card Permissions) orderIntent expiry

## ~7-day expiry — OBSERVED ON STAGING, CAUSE UNKNOWN
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
