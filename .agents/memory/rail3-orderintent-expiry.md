---
name: Rail 3 orderIntent expiry & credential happy-path
description: Crossmint Card Permissions orderIntent lifetime, where the expiry is readable, and proof the headless credential chain works.
---

# Rail 3 (Crossmint Card Permissions) orderIntent expiry

## Flat 7-day TTL — UNDOCUMENTED, STAGING-ONLY
The 7-day figure is **not in Crossmint's docs** (public AI-agents/order-lifecycle pages
state no orderIntent TTL; the Agentic Cards API ref is gated). It is **our empirical
observation against Crossmint STAGING only** — we have zero real-Crossmint-production data
(see env note: app is hardcoded to staging). Prod Crossmint may differ or expose options.
**Treat 7 days as a heuristic, not a contract: persist the real `expiresAt` from a
successful credentials response instead of hardcoding `created_at + 7d`.**

A Crossmint orderIntent expires a flat **7 days after creation** (staging), decoupled from the
mandate period. Observed empirically (staging, 2 data points):
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
