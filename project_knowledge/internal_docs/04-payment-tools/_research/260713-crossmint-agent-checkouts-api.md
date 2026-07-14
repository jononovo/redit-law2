---
name: crossmint-agent-checkouts-api-research
description: "External-API evidence for the Crossmint Agent Checkouts integration — endpoints, auth, buyer-profile shape, user actions. Captured from docs.crossmint.com 2026-07-13."
created: 2026-07-13
last_updated: 2026-07-13
---

# Crossmint Agent Checkouts — API evidence (2026-07-13)

Captured before building the in-house agent (see `../agent-checkouts-inhouse-agent.md`). Sources: `docs.crossmint.com/agents/agent-checkouts-quickstart`, `/agents/overview`, `/agents/how-agents-pay`, `/agents/payment-methods/cards/create-agent-card`, plus the launch announcement and live demo (`agent-checkouts.demos-crossmint.com`).

## Endpoints (base `https://www.crossmint.com/api/unstable/agent-checkouts`)

| Call | Path |
|---|---|
| Create checkout | `POST /` |
| Poll status | `GET /{id}` |
| Submit user action | `POST /{id}/actions/{action.id}` |
| Cancel | `DELETE /{id}` |
| Create buyer profile | `POST /buyer-profiles` (⚠️ path relative to the agent-checkouts base per quickstart — verify against live traffic) |

## Auth

Client-side API key (`ck_production_…`) with agent-checkouts + buyer-profiles scopes in `X-API-KEY`, **plus** a user JWT from the registered external auth provider as `Authorization: Bearer` — 401 without it, even with a valid key. Firebase is already CreditClaw's registered 3P auth (same as Rail 3 order intents), so owner Firebase ID tokens satisfy this.

## Create request

```json
{
  "target": { "kind": "direct_url", "url": "https://merchant.example/products/x", "request": "buy the medium in black" },
  "buyerProfileId": "…",
  "constraints": { "maxCost": { "amount": "100.00", "currency": "USD" } }
}
```

Card details **cannot** be passed in the create request (ships later per the launch notes).

## Status & user actions

- Terminal: `succeeded | failed | cancelled`; non-terminal includes `awaiting_user_action`. No webhooks in v1 — poll ~1.5s.
- `pendingUserAction: { id, responseSchema (JSON Schema), expiresAt }`. For payment, "submit the card details in the `values`" — docs show **no example card-field JSON**, hence our heuristic field mapping + never-guess guard.
- Card rule (verbatim intent): submit **only an agent card or single-use/virtual card number, never a real reusable PAN** (Visa Intelligent Commerce / Mastercard Agent Pay). There is **no pass-by-reference** (order-intent id) integration — one-time credentials are minted and the raw fields submitted.

## Buyer profile shape

```json
{
  "label": "Home",
  "name": { "first": "Ada", "last": "Lovelace" },
  "contact": { "email": "ada@example.com" },
  "shipping": {
    "addressLines": ["1 Market St"],
    "locality": "San Francisco",
    "administrativeAreaCode": "US-CA",
    "postalCode": "94105",
    "countryCode": "US"
  }
}
```

Note `administrativeAreaCode` is ISO-3166-2 and `name` is split — our `shippingAddresses` rows need a transform (done in `features/payment-rails/agent-checkouts/buyer-profile.ts`).

## Terminology

Crossmint's "**Agent Card**" = an order intent (created via `POST /api/unstable/order-intents`) — the same objects Rail 3 already manages. Marketing rename, not a new resource.

## Open questions (verify against live traffic — the sync handler logs full payloads)

1. Exact card-action `responseSchema` field names.
2. Receipt object shape (we parse `total`/`amount` defensively).
3. The live browser-session view from the demo — **not documented anywhere**; expected to surface in the checkout payload. Owner is asking Crossmint directly.
4. Buyer-profiles base path (see ⚠️ above).
5. Production-only: no staging environment exists for Agent Checkouts.
