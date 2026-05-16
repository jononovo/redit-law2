---
name: Rail 3 — Crossmint Virtual Cards (Card Permissions API)
description: Technical plan for adding Crossmint's Card Permissions API as a new payment rail. Lobster.cash-equivalent agentic virtual card experience using the user's own existing Visa/Mastercard. Intent (spending limits) is optional by design.
status: future
---

# Rail 3 — Crossmint Virtual Cards (Card Permissions API)

## What this is, in one paragraph

Rail 3 adds the **Crossmint Card Permissions API** (the same product that powers lobster.cash's agentic card flow) as a new payment rail. The user saves their **own existing Visa/Mastercard** in Crossmint's PCI vault, verifies it for agentic use once, and creates one or more **card permissions** (Crossmint calls these *order intents*). When the agent needs to check out at a merchant, our backend fetches a **fresh, one-time, merchant-scoped card number + expiry + CVC** from Crossmint and returns it to the agent via the existing Rail 5 fill-card flow. The raw card never leaves Crossmint's vault.

## Why this is a new rail, not an extension of an existing one

| Rail | Funding | Spending mechanism | Lifecycle |
|---|---|---|---|
| Rail 1 (Privy) | USDC wallet | x402 on-chain | wallet create → fund → spend |
| Rail 2 (Crossmint smart wallet) | USDC wallet | WorldStore API | wallet create → fund → purchase |
| Rail 5 (self-hosted card) | Owner's real card | Encrypted file + agent decrypts | encrypt → deliver → fill at checkout |
| **Rail 3 (this plan)** | **Owner's real card** | **Crossmint-vaulted card + per-merchant one-time numbers** | **save card → verify → permission(s) → fetch credentials per checkout** |

Rail 3 shares its *funding source* concept with Rail 5 (owner's real card, not a USDC wallet) — but the credential storage, vaulting, and per-merchant tokenization are entirely outsourced to Crossmint. Rail 2 is unrelated; it's a USDC smart-wallet rail.

## Critical concept: intent-optional

The Crossmint API itself **requires at least one mandate** (spending rule) when creating an order intent. But our product requirement is that the user can create a permission with no merchant cap and no amount cap — the agent should be free to use it anywhere.

We implement "intent-optional" as follows:

- **Permissive default permission**: when the user opts out of setting limits, we create an order intent with a single high-ceiling mandate (e.g. `maxAmount: 100000.00, period: yearly`) and a description of `"General-purpose card permission — no merchant restriction"`. Crossmint still requires the passkey tap once at creation.
- **Per-merchant credential fetch is unchanged**: regardless of whether the permission has limits or not, every credential fetch goes through `POST /api/unstable/order-intents/{id}/credentials` with a `merchant` descriptor. The agent supplies the merchant info at checkout time (we proxy it through).
- **UX framing**: in the owner UI, the two options are labeled clearly — "**Set spending limits**" (one or more mandates) vs "**Allow anywhere**" (permissive default). The labeling makes it clear that the second option still uses one-time merchant-scoped numbers (so leaked credentials can't be reused at another merchant), it just has no amount or merchant restrictions enforced by Crossmint.
- **Our software still enforces our own guardrails** on top of whatever Crossmint enforces. The Rail 3 row in `master_guardrails` and per-card `rail3_guardrails` apply regardless of whether the permission has its own mandate.

## What we explicitly do NOT build

- **No Rain integration.** Rain virtual card *issuance* (creating new Visa cards funded from USDC) is a separate Crossmint product. Out of scope.
- **No KYC flow.** Card Permissions uses the user's existing card; no PII collection beyond what the card-save iframe does.
- **No Basis Theory contract.** Crossmint handles vaulting.
- **No Verifiable Intent / AP2 / Mastercard Agent Pay.** Future enhancement, not v1.
- **No persistent card "issuance"** — there is no card to manage, freeze, or top up. Permissions are the unit of management.
- **No CrossMint stablecoin wallet linkage.** Settlement happens on the user's real card via Visa/Mastercard rails. The existing Rail 2 wallet is unrelated.

## External prerequisites

| Item | Source | Notes |
|---|---|---|
| Crossmint **client** API key | Crossmint console (separate from our existing server key for Rail 2) | Must have wallet + agent + transaction scopes. Staging key has all scopes by default. |
| Auth provider Crossmint trusts | We use Firebase Auth | Crossmint quickstart uses Stytch. Crossmint accepts "bring your own auth" via configurable JWT verifier — we register Firebase as a 3P auth provider with `verifierId: sub` (or whichever claim Firebase puts the UID on). **Needs verification.** Fallback: bridge through Stytch B2C. |
| `@crossmint/client-sdk-react-ui` package | npm | Frontend SDK for the `CrossmintPaymentMethodManagement` and `OrderIntentVerification` components. |
| Card eligibility | — | US-issued Visa or Mastercard credit/debit only. Not supported on Visa: non-US, business, prepaid, Chase, Fidelity. AMEX/Ramp need Crossmint approval. Worth surfacing in the setup wizard. |

## Schema additions (`shared/schema.ts`)

Three new tables, plus a single new master-guardrails row type:

```ts
// Per-owner saved card record (one row per saved + verified card)
export const rail3Cards = pgTable("rail3_cards", {
  cardId: text("card_id").primaryKey(),                    // our id, "r3card_..."
  ownerUid: text("owner_uid").notNull().references(...),
  paymentMethodId: text("payment_method_id").notNull(),    // Crossmint pm_...
  agentId: text("agent_id").notNull(),                     // Crossmint agentId bound to this card
  cardholderName: text("cardholder_name"),
  cardLast4: text("card_last4"),
  cardBrand: text("card_brand"),                           // visa | mastercard
  expMonth: integer("exp_month"),
  expYear: integer("exp_year"),
  verificationStatus: text("verification_status").notNull(), // pending | active | failed
  status: text("status").notNull().default("active"),       // active | frozen | revoked
  cardColor: text("card_color"),                            // shared with Rail 5 color system
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
});

// Per-card permission (one row per Crossmint order intent)
export const rail3Permissions = pgTable("rail3_permissions", {
  permissionId: text("permission_id").primaryKey(),         // our id, "r3perm_..."
  cardId: text("card_id").notNull().references(...),
  orderIntentId: text("order_intent_id").notNull(),         // Crossmint orderIntentId
  ownerUid: text("owner_uid").notNull(),
  botId: text("bot_id"),                                    // optional — which bot this permission is linked to
  label: text("label"),                                     // user-friendly name ("Domains budget")
  intentMode: text("intent_mode").notNull(),                // "limited" | "open"
  mandates: jsonb("mandates").notNull(),                    // raw Crossmint mandate array (for display + audit)
  merchantScope: jsonb("merchant_scope"),                   // optional preset merchant (if user pre-scoped it)
  phase: text("phase").notNull(),                           // requires-verification | active | expired
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Transaction log — one row per credential fetch + checkout completion
export const rail3Transactions = pgTable("rail3_transactions", {
  transactionId: text("transaction_id").primaryKey(),
  permissionId: text("permission_id").notNull().references(...),
  cardId: text("card_id").notNull().references(...),
  ownerUid: text("owner_uid").notNull(),
  botId: text("bot_id"),
  merchantName: text("merchant_name").notNull(),
  merchantUrl: text("merchant_url"),
  merchantCountry: text("merchant_country"),
  amountCents: integer("amount_cents"),                     // null until settlement
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull(),                         // credentials_issued | charged | failed | reversed
  credentialIssuedAt: timestamp("credential_issued_at").notNull(),
  settledAt: timestamp("settled_at"),
  balanceAfter: integer("balance_after"),                   // null for Rail 3 — no wallet
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Per-card guardrails (mirrors rail5Guardrails shape)
export const rail3Guardrails = pgTable("rail3_guardrails", {
  cardId: text("card_id").primaryKey().references(...),
  perTransactionLimitCents: integer("per_transaction_limit_cents"),
  dailyLimitCents: integer("daily_limit_cents"),
  monthlyLimitCents: integer("monthly_limit_cents"),
  approvalMode: text("approval_mode").notNull().default("auto"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

Plus existing tables get a new value in their enum-ish text columns:
- `master_guardrails.rail` accepts `"rail3"`.
- `orders.rail` accepts `"rail3"`.
- `unified_approvals.rail` accepts `"rail3"`.
- `bot_pending_messages.event_type` accepts `"rail3.*"` events.
- `webhook_event_type` accepts `"rails.updated"` with `rail: "rail3"`.

## Code structure (`features/payment-rails/rail3/`)

Mirror the Rail 5 layout for consistency:

```
features/payment-rails/rail3/
├── client.ts                  # Crossmint Card Permissions API client (proxies our backend → Crossmint)
├── auth-bridge.ts             # Builds the user-scoped JWT Crossmint needs (from our Firebase session)
├── agents/
│   └── register.ts            # POST /api/unstable/agents — one agent per (owner, card) pair
├── payment-methods/
│   ├── save.ts                # Server-side helper: persist paymentMethodId after iframe callback
│   ├── verify-status.ts       # GET — check verification status after the email+passkey ceremony
│   └── eligibility.ts         # Surfaces card-type restrictions to the UI
├── permissions/
│   ├── create.ts              # POST /api/unstable/order-intents — handles both "limited" and "open" modes
│   ├── get.ts                 # GET /api/unstable/order-intents/{id}
│   ├── list.ts                # List active permissions for a card
│   └── default-mandate.ts     # The permissive default for "open" mode (single source of truth)
├── credentials/
│   ├── fetch.ts               # POST /api/unstable/order-intents/{id}/credentials — the per-merchant one-time card number
│   └── format.ts              # Shape the credential for the OpenClaw fill-card plugin
└── index.ts                   # Public barrel
```

`client.ts` exposes:
- `crossmintCardsFetch(path, options)` — shared fetch wrapper for Crossmint card endpoints, adds `X-API-KEY` (server-side) and `Authorization: Bearer ${jwt}`.
- Constants: `CARD_PERMISSIONS_BASE_URL` (toggles staging vs prod based on `CROSSMINT_ENV`).

## API routes

Owner-facing under `app/api/v1/rail3/`:

| Route | Method | Purpose |
|---|---|---|
| `/api/v1/rail3/cards` | GET | List owner's saved cards |
| `/api/v1/rail3/cards/save-callback` | POST | Persist `paymentMethodId` after iframe `onPaymentMethodSelected` |
| `/api/v1/rail3/cards/[cardId]` | GET, PATCH, DELETE | Get / update (color, label, status) / revoke |
| `/api/v1/rail3/cards/[cardId]/verification-status` | GET | Poll Crossmint enrollment status |
| `/api/v1/rail3/cards/[cardId]/permissions` | GET, POST | List / create permissions on the card |
| `/api/v1/rail3/permissions/[permissionId]` | GET, DELETE | Get / revoke a single permission |

Bot-facing under `app/api/v1/bot/rail3/`:

| Route | Method | Purpose |
|---|---|---|
| `/api/v1/bot/rail3/permissions` | GET | List active permissions the bot has been linked to |
| `/api/v1/bot/rail3/checkout` | POST | Body: `{ permission_id, merchant: { name, url, country_code } }`. Returns one-time card number + expiry + CVC + checkout instructions. Routes through guardrails and may create a unified approval (Rail 5 pattern). |
| `/api/v1/bot/rail3/confirm` | POST | Bot confirms the charge went through; updates transaction + creates order row |

The bot `/checkout` endpoint reuses the Rail 5 dual-mode response shape: `checkout_steps` (instructions for the bot to fill directly) + `spawn_payload` (wrapper for sub-agent mode).

## Setup wizard (`/setup/rail3` or new dashboard CTA)

Modeled on Rail 5's 9-step wizard, but shorter:

1. **Name your card** — display name only (e.g. "My Visa")
2. **How it works** — short explainer: "Your card lives in Crossmint's vault. Your agent never sees the real number — only a fresh one-time number per merchant."
3. **Eligibility check** — surface restrictions (US Visa or Mastercard only; not Chase/Fidelity; etc.) before they enter the iframe
4. **Save card** — `CrossmintPaymentMethodManagement` iframe; on success, persist `paymentMethodId` + display brand/last4 read back from the SDK
5. **Verify for agentic use** — Crossmint sends an email code + the user does passkey ceremony in-browser. We poll `/verification-status` until `active`
6. **Choose intent mode** —
   - "**Set spending limits**" → mandate builder (max amount, period, optional merchant scope, optional description)
   - "**Allow anywhere**" → default permissive mandate
7. **Authorize permission** — `OrderIntentVerification` component shows; user taps passkey; on success the permission flips to `active`
8. **Link to bot** — pick which bot(s) this permission applies to (cross-rail bot-linking pattern from `bot-linking.ts`)
9. **Done** — show the new card on the dashboard

## Bot checkout flow (runtime)

1. Bot calls `POST /api/v1/bot/rail3/checkout` with `{ permission_id, merchant }`
2. Our server validates: bot is linked to the permission, permission is `active`, Rail 3 guardrails pass, master guardrails pass
3. If approval mode requires it, create a `unified_approval` row, send approval email, return `pending_approval` to the bot
4. On approval (or auto-approve), call `POST /api/unstable/order-intents/{id}/credentials` to Crossmint with the merchant descriptor
5. Persist a `rail3_transactions` row in `credentials_issued` status
6. Return to bot: `{ card_number, exp_month, exp_year, cvc, checkout_steps, spawn_payload }` — exactly the same shape Rail 5 returns. The bot or OpenClaw plugin fills these into the merchant's checkout form.
7. Bot calls `POST /api/v1/bot/rail3/confirm` after the charge clears with `{ transaction_id, amount_cents, status }`. We update the transaction, create an `orders` row via `recordOrder()`, fire `rails.updated` webhook.

## Reuse map (what we DON'T rebuild)

| Concern | Reused from |
|---|---|
| Approvals (create, email, decide, history) | `features/agent-interaction/approvals/` — add `rail3-fulfillment.ts` |
| Master guardrails + per-card guardrails enforcement | `features/agent-interaction/guardrails/` |
| Procurement controls (merchant allow/block lists) | `features/agent-interaction/procurement-controls/` |
| Order recording | `features/agent-interaction/orders/` (`recordOrder()`) |
| Bot linking | `features/platform-management/agent-management/bot-linking.ts` (add `rail3` config) |
| Bot messaging / pending messages | `features/platform-management/agent-management/bot-messaging/` |
| Cross-rail card UI shell | `components/wallet/credit-card-list-page.tsx` — Rail 3 page = config object, same pattern as Rail 5's 43-line page |
| OpenClaw fill-card flow | `Plugins/OpenClaw/src/fill-card.ts` — already does the merchant-form filling; Rail 3 just feeds different credentials in (no decrypt step needed) |
| Card brand detection + visual | `features/payment-rails/card/` |
| Shipping file delivery | `features/agent-interaction/shipping/` |

## Phasing

**v0 — sandbox-only spike (~2-3 days):**
- Crossmint staging key + Firebase JWT bridge verified working end-to-end
- Save card → verify → create open permission → fetch credentials at a fake merchant → log the one-time number
- No UI yet, hit it via curl + a minimal test page

**v1 — owner setup wizard + dashboard (~3-5 days):**
- Full setup wizard, card list page, permission list page
- Both "limited" and "open" intent modes
- All schema + storage methods + owner API routes
- No bot integration yet

**v2 — bot integration (~3-5 days):**
- Bot checkout API + confirm API
- Unified approvals wiring (`rail3-fulfillment.ts`)
- Order recording, transaction ledger
- OpenClaw plugin credential adapter

**v3 — production cutover (~1-2 days):**
- Swap staging → prod Crossmint keys (assumes Crossmint enterprise contract covers Card Permissions; verify with them)
- Real cards smoke-test with the team's own US Visa/MC
- Webhook reconciliation for charge events (if Crossmint emits them — needs verification)

Total: ~2 weeks for a clean v1 + v2 + v3 ship, sandbox-first.

## Open questions / what to confirm before starting

1. **Firebase JWT compatibility.** Crossmint's quickstart uses Stytch but says "bring your own auth." Confirm Firebase ID tokens are accepted (register Firebase as a 3P auth provider in Crossmint console with the right `verifierId`). If not, decide between (a) running a thin Stytch bridge for Crossmint only or (b) requesting Crossmint to add Firebase support.
2. **Crossmint enterprise scope.** Does our existing Crossmint account (used for Rail 2 wallets) also grant Card Permissions API access in production? Staging is open; production may require a separate scope. Quick email to Crossmint.
3. **Charge settlement webhooks.** Does Crossmint emit a webhook when a one-time credential is actually charged at the merchant (so we can update `rail3_transactions.status` from `credentials_issued` → `charged`)? If yes, wire it. If not, rely on bot's `/confirm` call + periodic reconciliation.
4. **Card eligibility messaging.** What % of our user base has a US Visa/MC that meets the restrictions? Sets the priority of supporting AMEX/non-US later.
5. **Permission revocation semantics.** Confirm whether deleting an order intent in Crossmint also invalidates already-issued (still-active) one-time credentials, or whether each credential has its own short TTL regardless.

## Files this plan will touch on implementation

Schema: `shared/schema.ts`
Storage: `server/storage/rail3.ts` (new), `server/storage/types.ts` (interface additions), `server/storage/index.ts` (compose)
New module: `features/payment-rails/rail3/` (all files listed above)
Reused module touches: `features/agent-interaction/approvals/{callbacks.ts, rail3-fulfillment.ts (new)}`, `features/platform-management/agent-management/bot-linking.ts`
Owner UI: `app/agent-virtual-cards/page.tsx` (or `app/sub-agent-cards`-style sibling), `app/setup/rail3/` wizard, shared via `components/wallet/`
API: `app/api/v1/rail3/**`, `app/api/v1/bot/rail3/**`
Plugin: `Plugins/OpenClaw/src/rail3-credentials.ts` (small adapter)
Env: `CROSSMINT_CLIENT_API_KEY`, possibly `CROSSMINT_CARDS_ENV` (defaults to `CROSSMINT_ENV`)
Docs: move this file to `project_knowledge/internal_docs/04-payment-tools/` once built; add one line to `replit.md` modules table.
