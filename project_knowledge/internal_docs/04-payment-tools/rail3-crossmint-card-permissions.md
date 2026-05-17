---
name: Rail 3 — Crossmint Card Permissions
description: Owner vaults a real Visa/Mastercard in Crossmint once (payment method), then spawns N virtual cards on top of it — each virtual card is one orderIntent that yields fresh merchant-scoped one-time numbers at checkout.
created: 2026-05-17
last_updated: 2026-05-17
---

# Rail 3: Crossmint Card Permissions

> Owner's real card is vaulted once in Crossmint. Each "virtual card" = one orderIntent on top of that vault. Checkout returns a fresh, merchant-locked one-time PAN/CVC. CreditClaw holds no card data.

---

## What Rail 3 Is

Rail 3 wraps Crossmint's **Card Permissions API** (same product behind lobster.cash). The owner saves their own existing Visa/Mastercard inside Crossmint's PCI vault, verifies it for agentic use once, then creates **virtual cards** — each one is a Crossmint orderIntent with its own spending mandate (limited or open). When the bot checks out, our backend asks Crossmint for a one-time card number scoped to that merchant and returns it through the existing Rail 5 fill-card flow.

| Concept | Lives where | What it is |
|---|---|---|
| Payment method | `rail3_payment_methods` | The vaulted real card. One row per Crossmint `paymentMethod`. |
| Virtual card | `rail3_cards` | One Crossmint orderIntent on top of a PM. Multiple per PM. |
| Mandate | `rail3_cards.mandates` (jsonb) | Spending rules sent to Crossmint (max amount, period, description). |
| Credentials | Fetched on-demand | Per-merchant one-time PAN + CVC. Never stored. |

---

## Why Two Tables

The original implementation conflated "vaulted card" and "virtual card" on one `rail3_cards` row. That meant adding a second virtual card required re-vaulting and re-verifying the real card. Splitting them lets the owner vault once and spawn unlimited virtual cards — each with its own limit, category, and intent — matching how Privy/Stripe wallets already work in Rail 1.

---

## Critical concept: intent-optional

The Crossmint API requires at least one mandate when creating an orderIntent. Our product requirement is that intent should be optional. Two modes:

- **Limited** — owner sets max amount + period (weekly/monthly/yearly), optional free-text description. Stored as-is.
- **Open** — no owner-set limits. Helper injects a permissive default: `{ type: "maxAmount", value: "100000.00", details: { currency: "usd", period: "yearly" } }` plus a description noting it's general-purpose.

Either way, **every credential fetch is still merchant-scoped** by Crossmint — a leaked one-time number can't be reused at another merchant.

Intent-optional logic lives in one helper: `features/payment-rails/rail3/permissions/buildDefaultMandate()`.

---

## Data Model

### `rail3_payment_methods`
| Column | Type | Description |
|---|---|---|
| id | serial PK | |
| owner_uid | text | Firebase UID |
| payment_method_id | text unique | Crossmint paymentMethod ID |
| agent_id | text | Crossmint agentic-enrollment agent ID |
| card_brand | text | visa / mastercard |
| card_last4 | text | |
| cardholder_name | text | |
| verification_status | text | `pending` / `active` |
| status | text | `active` / `removed` (we hard-delete, so almost always `active`) |
| last_used_at | timestamp | Bumped on virtual-card creation; drives "default PM" pick |
| created_at | timestamp | |

### `rail3_cards`
| Column | Type | Description |
|---|---|---|
| id | serial PK | |
| card_id | text unique | Our internal ID |
| owner_uid | text | |
| bot_id | text | Linked bot |
| payment_method_id | text | → `rail3_payment_methods.payment_method_id` (application-enforced, no DB FK) |
| order_intent_id | text | Crossmint orderIntent ID |
| intent_mode | text | `limited` / `open` |
| mandates | jsonb | Mandate array sent to Crossmint |
| permission_phase | text | `pending_authorization` / `active` / `revoked` |
| category | text | Free-form label for filtering (e.g. "Groceries") |
| card_name | text | Owner-chosen nickname (auto-generated if omitted) |
| created_at | timestamp | |

---

## File Structure

```
features/payment-rails/rail3/
  client.ts                         # Crossmint REST client
  permissions/
    buildDefaultMandate.ts          # intent-optional helper
    buildMandates.ts                # owner input → Crossmint mandate array
  orderIntents.ts                   # createOrderIntent, getOrderIntent, revokeOrderIntent
  paymentMethods.ts                 # createPaymentMethod, getPaymentMethod, deletePaymentMethod
  credentials.ts                    # fetchOneTimeCredentials (merchant-scoped)

server/storage/payment-rails/
  rail3-payment-methods.ts          # CRUD for vaulted cards
  rail3.ts                          # CRUD for virtual cards (plural getters by botId / pmId)

app/api/v1/rail3/
  payment-methods/route.ts                            # POST save, GET list
  payment-methods/[paymentMethodId]/route.ts          # DELETE (blocked w/ 409 if cards exist)
  payment-methods/[paymentMethodId]/verification-status/route.ts  # poll
  cards/route.ts                                      # POST create, GET list
  cards/[cardId]/route.ts                             # DELETE (revokes only its orderIntent)
  cards/[cardId]/authorization-status/route.ts        # poll permission_phase

app/api/v1/bot/rail3/
  cards/route.ts                    # plural list by botId
  checkout/route.ts                 # returns one-time PAN/CVC + fill-card spawn payload
  confirm/route.ts                  # records order

app/(dashboard)/virtual-cards/page.tsx        # Cards grid with PaymentMethodsStrip header
app/setup/rail3/page.tsx                      # First-time wizard: save+verify PM only

components/rail3/
  payment-methods-strip.tsx         # Header strip: list/add/remove PMs
  add-card-dialog.tsx               # Wizard for creating a virtual card on an existing PM
                                    # Embeds OrderIntentVerification iframe inline after create
                                    # Optional collapsed "Intent" field → description

features/agent-interaction/approvals/
  rail3-fulfillment.ts              # Gates on card.permission_phase, uses card.order_intent_id
```

---

## Flows

### First-time setup
1. Owner hits `/setup/rail3`.
2. Step 1: Crossmint `CrossmintPaymentMethodManagement` iframe captures the real card → `POST /api/v1/rail3/payment-methods` saves the row.
3. Step 2: `PaymentMethodAgenticEnrollmentVerification` ceremony marks the PM `verification_status = active`.
4. Owner lands on `/virtual-cards` with the PM strip showing one verified PM and an empty cards grid.

### Create a virtual card
1. Owner clicks "+ Add Virtual Card" → `AddCardDialog`.
2. PM picker defaults to most-recently-used (`last_used_at`).
3. Owner picks mode (limited/open), limit + period, category, nickname, optional intent text.
4. `POST /api/v1/rail3/cards` → builds mandates → `createOrderIntent` → row written with `permission_phase = pending_authorization`.
5. Dialog embeds `OrderIntentVerification` iframe inline; polls `authorization-status` until `active`.
6. PM's `last_used_at` is bumped.

### Bot checkout
1. Bot calls `POST /api/v1/bot/rail3/checkout` with merchant info + `card_id`.
2. Backend loads the card, fetches its PM, checks `pm.verification_status === active` and `card.permission_phase === active`.
3. `fetchOneTimeCredentials` returns merchant-scoped PAN/CVC/expiry.
4. Response is shaped identically to Rail 5 fill-card so OpenClaw fills the checkout form unchanged.
5. Bot calls `POST /api/v1/bot/rail3/confirm` after the charge clears → recorded in central orders (`rail: "rail3"`).

### Delete semantics
- **Delete virtual card** → revokes only its orderIntent, deletes the card row. PM untouched.
- **Delete PM** → blocked with `409 has_virtual_cards` if any `rail3_cards` rows reference it. Owner must delete cards first. Then `deletePaymentMethod` on Crossmint + row removed.

---

## Gotchas

- **No DB FK** on `rail3_cards.payment_method_id`. Integrity is application-enforced (PM-delete blocked when cards exist). Out-of-band SQL deletes can orphan cards; checkout will fail explicitly rather than silently.
- **PM `status` field is mostly dead.** We hard-delete PMs rather than soft-delete, so `status === active` is effectively always true. Kept for parity with other rail tables and possible future soft-delete.
- **`OrderIntentVerification` requires the Crossmint Firebase JWT bridge** — `JwtSync` component must be mounted in the dashboard layout for the iframe to authorize. Same component used by the setup wizard.
- **Open mode is still merchant-scoped at credential time.** The "No limit" label means no amount/merchant restriction at the *permission* level; it does not mean a reusable PAN.
- **`recordOrder` rail union** includes `"rail3"`. Forgetting to add a new rail there silently typechecks against `OrderInput.rail` but fails at the writer.
- **Cardholder name lives on the PM, not the card.** Checkout reads `pm.cardholderName`, not `card.cardholderName` (the latter doesn't exist).

---

## Status

**Implemented** (May 2026). Replaces the v1 single-table model from `project_knowledge/future/rail3-virtual-cards-technical-plan.md` (now historical).

Not yet built: regression tests for delete semantics + bot-checkout guards. Flagged once by code review, deliberately deferred per "no enterprise scope creep" policy.
