---
name: Rail 3 — Crossmint Virtual Cards (Card Permissions API)
description: Technical plan for adding Crossmint's Card Permissions API as a new payment rail. Lobster.cash-equivalent agentic virtual card experience using the user's own existing Visa/Mastercard. Intent (spending limits) is optional by design. Maximally reuses existing card UI shell — no new components.
status: future
---

# Rail 3 — Crossmint Virtual Cards (Card Permissions API)

## What this is, in one paragraph

Rail 3 adds the **Crossmint Card Permissions API** (the same product that powers lobster.cash's agentic card flow) as a new payment rail. The user saves their **own existing Visa/Mastercard** in Crossmint's PCI vault, verifies it for agentic use once, and creates a **card permission** (Crossmint calls these *order intents*) — either with spending limits or in "allow anywhere" mode. When the agent needs to check out at a merchant, our backend fetches a **fresh, one-time, merchant-scoped card number + expiry + CVC** from Crossmint and returns it via the existing Rail 5 fill-card flow. The raw card never leaves Crossmint's vault.

## Why this is a new rail, not an extension of an existing one

| Rail | Funding | Spending mechanism |
|---|---|---|
| Rail 1 (Privy) | USDC wallet | x402 on-chain |
| Rail 2 (Crossmint smart wallet) | USDC wallet | WorldStore API |
| Rail 5 (self-hosted card) | Owner's real card | Encrypted file + agent decrypts |
| **Rail 3 (this plan)** | **Owner's real card** | **Crossmint-vaulted card + per-merchant one-time numbers** |

Rail 3 shares its *funding source* with Rail 5 (owner's real card, not a USDC wallet). Vaulting and per-merchant tokenization are entirely outsourced to Crossmint. Rail 2 is unrelated.

## Critical concept: intent-optional

The Crossmint API itself **requires at least one mandate** when creating an order intent. Our product requirement is that intent should be optional from the user's perspective. We handle this with two modes:

- **Limited** — user sets one or more mandates (max amount, period, optional description). Stored as-is.
- **Open** — no user-set limits. Behind the scenes we send a single permissive default mandate: `{ type: "maxAmount", value: "100000.00", details: { currency: "usd", period: "yearly" } }` plus a description noting it's general-purpose. The agent can use this permission at any merchant.

Either way, **every credential fetch is still merchant-scoped** (Crossmint's security property — a leaked one-time number can't be reused at a different merchant). The mode label in the UI makes this clear: "No Limit" still uses one-time numbers, it just has no amount or merchant restrictions.

The intent-optional logic lives in **one helper** (`permissions/buildDefaultMandate()`) — UI passes mode + optional limits, helper returns the mandate array to send to Crossmint.

## What we explicitly do NOT build

- **No Rain integration** (Crossmint's separate card-*issuance* product).
- **No KYC flow.** Card Permissions uses the user's existing card.
- **No Basis Theory contract.** Crossmint handles vaulting.
- **No Verifiable Intent / AP2 / Mastercard Agent Pay.** Future.
- **No persistent card "issuance".** Permissions are the unit of management.
- **No USDC wallet linkage.** Settlement is on the user's real card.
- **No new UI components.** We reuse `CreditCardListPage` shell + `NormalizedCard` shape entirely (see UI section below).
- **No multi-permission-per-card table in v1.** Single permission per card, fields on `rail3_cards`. Add a `rail3_permissions` table later only if a real need appears.

## External prerequisites

| Item | Source | Notes |
|---|---|---|
| Crossmint **client** API key | Crossmint console | Separate from our existing server key for Rail 2. Staging key has all scopes by default. |
| Auth provider | Firebase Auth (ours, unchanged) | Crossmint has built-in support for Firebase as a 3P auth provider. Config in Crossmint Console → API Keys → JWT authentication → 3P Auth providers → Firebase. We pass the Firebase ID token to `setJwt()` on the Crossmint provider via a small `JwtSync` component. **No Stytch, no bridge.** |
| `@crossmint/client-sdk-react-ui` | npm | Frontend SDK. Components used: `CrossmintProvider`, `CrossmintPaymentMethodManagement` (save card iframe), `PaymentMethodAgenticEnrollmentVerification` (one-time card verification), `OrderIntentVerification` (per-permission authorization). |
| Card eligibility | — | US-issued Visa or Mastercard credit/debit only. Not supported on Visa: non-US, business, prepaid, Chase, Fidelity. AMEX/Ramp need Crossmint approval. Surface in setup wizard. |
| Passkey-capable device for users | — | Crossmint's verification + authorization ceremonies use WebAuthn passkeys. Passkey does **not** mean biometric — works with device PIN (Windows Hello PIN, macOS password), hardware security key (YubiKey), or cross-device QR-to-phone fallback. Effectively all modern users have at least one of these. |

## Schema additions (`shared/schema.ts`)

**Two new tables.** Default permission lives on the card row, not a separate table.

```ts
// One row per saved + verified card. The default permission lives on this row.
export const rail3Cards = pgTable("rail3_cards", {
  cardId: text("card_id").primaryKey(),                    // our id, "r3card_..."
  ownerUid: text("owner_uid").notNull().references(...),

  // Crossmint references
  paymentMethodId: text("payment_method_id").notNull(),    // Crossmint pm_...
  agentId: text("agent_id").notNull(),                     // Crossmint agentId bound to this card

  // Display
  cardName: text("card_name").notNull(),                   // user-facing label
  cardholderName: text("cardholder_name"),
  cardLast4: text("card_last4"),
  cardBrand: text("card_brand"),                           // visa | mastercard
  expMonth: integer("exp_month"),
  expYear: integer("exp_year"),
  cardColor: text("card_color"),                           // shared color system

  // State
  verificationStatus: text("verification_status").notNull(), // pending | active | failed
  status: text("status").notNull().default("active"),       // active | frozen | revoked

  // Default permission (one per card in v1)
  defaultOrderIntentId: text("default_order_intent_id"),
  defaultIntentMode: text("default_intent_mode"),           // "limited" | "open"
  defaultMandates: jsonb("default_mandates"),               // raw Crossmint mandate array (audit + raw source of truth)
  defaultPermissionPhase: text("default_permission_phase"), // requires-verification | active | expired

  // Denormalized for display + queries (Rail 5 pattern). Source of truth = defaultMandates.
  // Populated when permission is created/updated; for "open" mode both are null.
  limitAmountCents: integer("limit_amount_cents"),
  limitPeriod: text("limit_period"),                        // "weekly" | "monthly" | "yearly"

  // Bot link
  botId: text("bot_id"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
});

// One row per credential fetch + checkout
export const rail3Transactions = pgTable("rail3_transactions", {
  transactionId: text("transaction_id").primaryKey(),
  cardId: text("card_id").notNull().references(...),
  ownerUid: text("owner_uid").notNull(),
  botId: text("bot_id"),
  orderIntentId: text("order_intent_id").notNull(),         // which Crossmint intent was used
  merchantName: text("merchant_name").notNull(),
  merchantUrl: text("merchant_url"),
  merchantCountry: text("merchant_country"),
  amountCents: integer("amount_cents"),                     // null until settlement
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull(),                         // credentials_issued | charged | failed | reversed
  credentialIssuedAt: timestamp("credential_issued_at").notNull(),
  settledAt: timestamp("settled_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**Guardrails:** mirror Rail 5 — add a `rail3Guardrails` table identical to `rail5Guardrails` (per-card limits + approval mode). Same shape, same enforcement helpers.

**Existing tables get a new value in their text/enum columns:**
- `master_guardrails.rail` accepts `"rail3"`
- `orders.rail` accepts `"rail3"`
- `unified_approvals.rail` accepts `"rail3"`
- `bot_pending_messages.event_type` accepts `"rail3.*"`
- Webhook `rails.updated` accepts `rail: "rail3"`

## Code structure (`features/payment-rails/rail3/`)

**Five files** — Crossmint does the heavy lifting, we mostly proxy.

```
features/payment-rails/rail3/
├── client.ts          # crossmintCardsFetch() wrapper, BASE_URL constants
├── cards.ts           # save-callback, verification status polling, card CRUD
├── permissions.ts     # create/get/revoke order intent + buildDefaultMandate() helper
├── credentials.ts     # per-merchant one-time card number fetch
└── index.ts           # public barrel
```

`permissions.ts` is the single home for intent-optional logic:

```ts
export function buildMandates(input:
  | { mode: "limited", maxAmountUsd: number, period: "weekly"|"monthly"|"yearly", description?: string }
  | { mode: "open" }
): CrossmintMandate[] {
  if (input.mode === "open") {
    return [
      { type: "maxAmount", value: "100000.00", details: { currency: "usd", period: "yearly" } },
      { type: "description", value: "General-purpose card permission — no merchant restriction" },
    ];
  }
  const mandates: CrossmintMandate[] = [
    { type: "maxAmount", value: input.maxAmountUsd.toFixed(2), details: { currency: "usd", period: input.period } },
  ];
  if (input.description) mandates.push({ type: "description", value: input.description });
  return mandates;
}
```

## UI: zero new components

Reuse the existing card shell exactly as Rail 5 does.

**Changes to `components/wallet/types.ts`:**
1. Extend `RailType`: `"rail1" | "rail2" | "rail3" | "rail5"`
2. Add `Rail3CardInfo` interface (mirrors `Rail5CardInfo`)
3. Add `normalizeRail3Card(card, basePath): NormalizedCard`:

```ts
export function normalizeRail3Card(card: Rail3CardInfo, basePath: string): NormalizedCard {
  const isLimited = card.default_intent_mode === "limited";
  return {
    card_id: card.card_id,
    card_name: card.card_name,
    status: card.status,
    bot_id: card.bot_id,
    bot_name: card.bot_name,
    card_color: resolveCardColor(card.card_color, card.card_id),
    balance: isLimited ? formatCentsToUsd(card.limit_amount_cents!) : "—",
    balanceLabel: isLimited ? `${capitalize(card.limit_period!)} Limit` : "No Limit",
    balanceTooltip: isLimited
      ? `Crossmint enforces this limit per ${card.limit_period}.`
      : "Agent can use this card at any merchant. Each charge still uses a one-time merchant-scoped number.",
    last4: card.card_last4,
    brand: card.card_brand,
    issuer: null,
    line1: `${capitalize(card.card_brand)} •••• ${card.card_last4}`,
    line2: isLimited ? `Active permission` : "Use anywhere",
    detailPath: `${basePath}/${card.card_id}`,
  };
}
```

**New page** — `app/(dashboard)/virtual-cards/page.tsx`, ~45 lines, mirrors `sub-agent-cards/page.tsx`. A config object passed to `CreditCardListPage`:

```ts
const config: CreditCardListPageConfig = {
  title: "Virtual Cards",
  subtitle: "Cards your agent can use at any online merchant. Powered by Crossmint.",
  addButtonLabel: "Add Virtual Card",
  emptyTitle: "No virtual cards yet",
  emptySubtitle: "Save a card so your agent can check out at any online merchant.",
  apiEndpoint: "/api/v1/rail3/cards",
  railPrefix: "rail3",
  railId: "rail3",
  basePath: "/virtual-cards",
  normalizeCards: (data) => data.cards.map((c: Rail3CardInfo) =>
    normalizeRail3Card(c, "/virtual-cards")),
  explainer: <Rail3Explainer />,
  setupWizardHref: "/setup/rail3",
  supportsBotLinking: true,
  transactionsEndpoint: "/api/v1/rail3/transactions",
  approvalsEndpoint: "/api/v1/approvals?rail=rail3&status=pending",
  approvalsDecideEndpoint: "/api/v1/approvals/decide",
};
```

Cards grid, transactions tab, orders tab, approvals tab, freeze/delete/link-bot dialogs — all inherited from the shell. **Zero new card components, zero new visuals.**

One UI consideration to handle in the freeze handler in `credit-card-list-page.tsx`: the current handler hard-codes Rail 5 vs other patterns. Rail 3 should use the Rail 5 branch (`PATCH /api/v1/rail3/cards/{id}` with `{ status }`). Small switch update.

## API routes

Owner-facing under `app/api/v1/rail3/`:

| Route | Method | Purpose |
|---|---|---|
| `/api/v1/rail3/cards` | GET | List owner's saved cards |
| `/api/v1/rail3/cards/save-callback` | POST | Persist `paymentMethodId` after iframe `onPaymentMethodSelected` |
| `/api/v1/rail3/cards/[cardId]` | GET, PATCH, DELETE | Get / update (color, label, status) / revoke |
| `/api/v1/rail3/cards/[cardId]/verification-status` | GET | Poll Crossmint enrollment status |
| `/api/v1/rail3/cards/[cardId]/permission` | POST, DELETE | Create/replace or revoke the default permission |
| `/api/v1/rail3/transactions` | GET | List Rail 3 transactions |

Bot-facing under `app/api/v1/bot/rail3/`:

| Route | Method | Purpose |
|---|---|---|
| `/api/v1/bot/rail3/cards` | GET | List cards the bot is linked to |
| `/api/v1/bot/rail3/checkout` | POST | Body: `{ card_id, merchant: { name, url, country_code } }`. Routes through guardrails → may create approval → on approve, fetches one-time credentials and returns them with Rail 5-shaped checkout instructions. |
| `/api/v1/bot/rail3/confirm` | POST | Bot confirms charge cleared; updates transaction + creates order row |

The bot `/checkout` response shape matches Rail 5 exactly so OpenClaw's existing fill-card flow plugs in unchanged.

## Setup wizard — 4 steps

`app/setup/rail3/page.tsx`. Linear, no over-decoration:

1. **Save card** — eligibility note up front (US Visa/MC only) + `CrossmintPaymentMethodManagement` iframe. On `onPaymentMethodSelected`, POST to save-callback. Show brand/last4 confirmation.
2. **Verify for agentic use** — Crossmint sends email code + passkey ceremony in-browser. Poll `/verification-status` until `active`.
3. **Set permission** — radio choice: "Set spending limits" (form: amount + weekly/monthly/yearly + optional description) or "Allow anywhere". Submit creates the order intent.
4. **Authorize + link bot** — `OrderIntentVerification` component (passkey tap). On success, pick which bot to link (or skip). Done.

## Bot checkout flow (runtime)

1. Bot calls `POST /api/v1/bot/rail3/checkout` with `{ card_id, merchant }`
2. Server validates: bot is linked, card is `active`, default permission is `active`, Rail 3 + master guardrails pass
3. If approval required, create `unified_approval` row, email owner, return `pending_approval`
4. On approval (or auto), call Crossmint `POST /order-intents/{orderIntentId}/credentials` with merchant descriptor
5. Persist `rail3_transactions` row in `credentials_issued`
6. Return `{ card_number, exp_month, exp_year, cvc, checkout_steps, spawn_payload }` — Rail 5 shape
7. Bot calls `/confirm` after charge clears → update transaction → `recordOrder()` → fire `rails.updated` webhook

## Reuse map

| Concern | Reused from |
|---|---|
| Approvals (create, email, decide, history) | `features/agent-interaction/approvals/` — add `rail3-fulfillment.ts` |
| Master + per-card guardrails | `features/agent-interaction/guardrails/` |
| Procurement controls | `features/agent-interaction/procurement-controls/` |
| Order recording | `features/agent-interaction/orders/` (`recordOrder()`) |
| Bot linking | `features/platform-management/agent-management/bot-linking.ts` (add `rail3` config) |
| Bot messaging | `features/platform-management/agent-management/bot-messaging/` |
| **Card UI shell** | `components/wallet/credit-card-list-page.tsx` — config object, no new components |
| **Card visual** | `components/wallet/card-visual.tsx` + `credit-card-item.tsx` — used as-is via `NormalizedCard` |
| OpenClaw fill-card | `Plugins/OpenClaw/src/fill-card.ts` — same flow, different credential source |
| Card brand detection | `features/payment-rails/card/` |
| Shipping delivery | `features/agent-interaction/shipping/` |

## Phasing

**v0 — sandbox spike (~2 days)**: Crossmint staging key + Firebase JWT wired through `setJwt()`. Save → verify → create open permission → fetch credentials at a fake merchant via curl. No UI.

**v1 — owner UI + wizard (~3 days)**: Schema + storage + owner API. `virtual-cards` page (config object) + 4-step wizard. Both intent modes working end-to-end.

**v2 — bot integration (~3 days)**: Bot checkout + confirm APIs. `rail3-fulfillment.ts`. Order recording. OpenClaw credential adapter.

**v3 — prod cutover (~1 day)**: Swap staging → prod Crossmint keys (assumes Crossmint contract covers Card Permissions; verify). Real-card smoke test. Wire charge webhooks if Crossmint emits them.

**Total: ~1 to 1.5 weeks.**

## Open questions to confirm before starting

1. **Crossmint enterprise scope.** Does our existing Crossmint contract (Rail 2) cover Card Permissions API in production? Staging is open; prod may need a separate scope. Quick email.
2. **Charge settlement webhooks.** Does Crossmint emit a webhook when a one-time credential is actually charged? If yes, wire it. If not, rely on bot's `/confirm` + periodic reconciliation.
3. **Permission revocation semantics.** Does deleting an order intent invalidate already-issued one-time credentials, or do they live out their TTL?

## Files this plan will touch on implementation

- Schema: `shared/schema.ts` (2 new tables + 1 guardrails table + enum extensions)
- Storage: `server/storage/rail3.ts` (new), `server/storage/types.ts` (interface additions), `server/storage/index.ts` (compose)
- New module: `features/payment-rails/rail3/` (5 files)
- Reused module touches: `features/agent-interaction/approvals/{callbacks.ts, rail3-fulfillment.ts (new)}`, `features/platform-management/agent-management/bot-linking.ts`
- UI: `components/wallet/types.ts` (RailType + Rail3CardInfo + normalizeRail3Card), `components/wallet/credit-card-list-page.tsx` (small freeze-handler switch update), `app/(dashboard)/virtual-cards/page.tsx` (new, ~45 lines), `app/setup/rail3/page.tsx` (new, 4-step wizard)
- API: `app/api/v1/rail3/**`, `app/api/v1/bot/rail3/**`
- Plugin: `Plugins/OpenClaw/src/rail3-credentials.ts` (small adapter)
- Env: `CROSSMINT_CLIENT_API_KEY`
- Docs: move this file to `project_knowledge/internal_docs/04-payment-tools/` once built; add one line to `replit.md` modules table.
