---
name: Rail 3 — Virtual Cards (Crossmint Card Permissions)
description: Canonical operational doc for Rail 3 — vaulted real card → N virtual cards (Crossmint orderIntents) → merchant-scoped one-time PAN/CVC at bot checkout. Read this first when touching anything in features/payment-rails/rail3/, app/api/v1/rail3/, or components/rail3/.
created: 2026-05-21
last_updated: 2026-05-21
---

# Rail 3 — Virtual Cards

> Owner vaults their real Visa/Mastercard once in Crossmint. Each "virtual card" = one Crossmint **orderIntent** stacked on that vault with its own spending mandate. At bot checkout, Crossmint returns a **merchant-locked one-time PAN/CVC** scoped to that orderIntent. CreditClaw never stores card data.

Third outbound payment rail, sits alongside Rail 1 (Privy stablecoin) and Rail 5 (self-hosted encrypted real card). "Virtual Cards" tile in the owner sidebar.

---

## Vendor stack

Rail 3 is a thin wrapper around two stacked vendors. Knowing which one owns which surface is the single most important debugging fact.

| Layer | Vendor | What they do | Where they appear |
|---|---|---|---|
| **API + orchestration** | **Crossmint** (Card Permissions API) | Vaults the real card, mints orderIntents, returns one-time PAN/CVC per merchant. PCI scope lives here. | `features/payment-rails/rail3/*` → `https://staging.crossmint.com/api/...`. SDK: `@crossmint/client-sdk-react-ui`. |
| **Card issuance + verification UI** | **Basis Theory** (`@basis-theory/react-agentic` v2.0.0) | Renders the actual Visa Agentic Commerce issuance + WebAuthn/passkey overlay. Mock Visa SDK in test env; real Visa Click to Pay in prod. | Transitive dep of the Crossmint SDK. Body-portaled overlays at `z-index: 10001`. |
| **Auth** | Firebase | Owner identity. Registered as a 3P auth provider in the Crossmint Console; SDK gets `setJwt(firebaseIdToken)`; Crossmint maps to a `userLocator`. | `components/rail3/crossmint-provider.tsx`. |

**Operationally:** Crossmint owns API + agent + orderIntent state. Basis Theory owns every owner-facing ceremony UI (Verify Now overlay, passkey prompt, OTP). Bugs in the overlay (z-index, pointer-events, focus, double-mount) are Basis Theory bugs, not Crossmint API bugs. The mock SDK lives at `node_modules/@basis-theory/react-agentic/dist/mockVisaSdkManager-*.mjs`.

---

## Reference: the Crossmint quickstart

**Single most useful reference for anyone debugging Rail 3.** When stuck, compare our shape to theirs.

- Repo: <https://github.com/Crossmint/card-permissions-quickstart>
- Live demo: <https://virtual-cards.demos-crossmint.com>
- Docs: <https://docs.crossmint.com/agents/overview>

What the quickstart does, that matters:

- **No backend at all.** No `app/api/`. Browser → Crossmint direct using Stytch JWT + client API key.
- **No webhooks.** Manual `fetchAllData(jwt)` re-poll after each user action.
- **No modal/dialog wrapping the SDK.** `<OrderIntentVerification>` renders inline inside a plain styled `<div>` page section (see `components/issue-card-permission.tsx`). Internal `step` state swaps form → verification → done in place. No portal, no z-index battle.
- Single component for the whole create-card flow (form + ceremony + done), driven by local state.

We diverge from the quickstart in two ways:

1. We have a backend that mirrors Crossmint state into our DB (`rail3_cards`, `rail3_payment_methods`) so the bot side has authoritative truth without needing a live user JWT.
2. We do bot-initiated checkout (the quickstart doesn't have bots). That needs a `Bearer` JWT for `/order-intents/:id/credentials`, hence the planned Firebase refresh-token store.

---

## What Rail 3 stores

| Concept | Lives in | What it is |
|---|---|---|
| **Payment method (PM)** | `rail3_payment_methods` | The vaulted real card. One row per Crossmint `paymentMethod`. Verified once via the agentic-enrollment ceremony. |
| **Virtual card** | `rail3_cards` | One Crossmint orderIntent on top of a PM, with its own mandate. Many per PM. |
| **Per-owner agent** | `rail3_agents` | One Crossmint agent per owner (`PK owner_uid`). Lazily created on first card. |
| **Mandate** | `rail3_cards.mandates` (jsonb) | Spending rules sent to Crossmint at intent-creation (max amount, period, description). |
| **Guardrails** | `rail3_guardrails` | Per-card spending caps (per-tx, daily, monthly). Enforced server-side before credentials are fetched. |
| **Transactions** | `rail3_transactions` | Recorded on credential issuance + settlement. |
| **Credentials** | Never stored | Per-merchant one-time PAN + CVC + expiry. Lives in the bot/checkout response only. |

PM and virtual card are deliberately split. v1 conflated them, so adding a second virtual card forced re-vaulting.

---

## File map

```
features/payment-rails/rail3/
  client.ts                 # Crossmint REST client + ownerUidToUserLocator
  ids.ts                    # generateRail3CardId / generateRail3TransactionId
  agents.ts                 # createAgent (one per owner)
  per-user-agent.ts         # ensure-and-cache wrapper
  paymentMethods.ts         # list / delete PM
  agenticEnrollment.ts      # get / create enrollment (vault verification)
  permissions.ts            # buildMandates, createOrderIntent, getOrderIntent, revokeOrderIntent
  credentials.ts            # fetchOneTimeCredentials (merchant-scoped PAN/CVC)
  index.ts                  # public surface

features/payment-rails/crossmint-env.ts   # single source of truth: HOST + key selector

server/storage/
  rail3-payment-methods.ts  # PM CRUD
  rail3.ts                  # virtual card CRUD (plural getters by botId / pmId)

app/api/v1/rail3/
  payment-methods/route.ts                       # POST save, GET list
  payment-methods/[id]/route.ts                  # DELETE (409 if cards exist)
  cards/route.ts                                 # POST create, GET list
  cards/[cardId]/route.ts                        # DELETE — revokes only its orderIntent
  cards/[cardId]/refresh-phase/route.ts          # POST — re-read Crossmint phase + write back
  transactions/route.ts                          # exists, not yet audited

app/api/v1/bot/rail3/
  cards/route.ts                                 # plural list by botId
  checkout/route.ts                              # one-time PAN + Rail-5-shaped fill-card payload
  confirm/route.ts                               # records order

components/rail3/
  crossmint-provider.tsx     # CrossmintProvider + Firebase JWT bridge
  add-card-dialog.tsx        # Inline panel (not a Dialog) for create + verification ceremony
  payment-methods-strip.tsx  # PM header strip on the cards page

app/(dashboard)/virtual-cards/page.tsx   # cards grid + PM strip + AddCardDialog slot
app/setup/rail3/page.tsx                 # first-time wizard: save + verify PM
```

---

## Flows

### 1. First-time setup (`/setup/rail3`)

1. Page wrapped in `Rail3CrossmintProvider` → `CrossmintProvider` + `FirebaseJwtBridge`.
2. **Save card** — `CrossmintPaymentMethodManagement` iframe captures the real card. On success → `POST /api/v1/rail3/payment-methods` writes the row, `verification_status='pending'`.
3. **Verify card** — Crossmint runs the agentic-enrollment ceremony via `PaymentMethodAgenticEnrollmentVerification` (Basis Theory overlay underneath). We poll `GET /payment-methods/:id/agentic-enrollment` every 3s until `status='active'`, then flip `verification_status='active'`.
4. Owner lands on `/virtual-cards` with one verified PM, empty grid.

### 2. Create a virtual card (`AddCardDialog`)

> Despite the filename, this is **not a Radix Dialog**. It's an inline panel rendered through the `setupWizard` render-prop slot in `CreditCardListPage`. The Dialog wrapper was removed 2026-05-21 — see [Gotchas](#gotchas).

1. Owner clicks **+ Add Virtual Card**. Panel mounts under `Rail3CrossmintProvider`.
2. PM picker defaults to most-recently-used (`last_used_at`). Optional bot link, mode (limited/open), limit + period, category, nickname, optional intent description.
3. `POST /api/v1/rail3/cards`:
   - `ensurePerOwnerAgent(owner_uid)` — creates Crossmint agent if missing, caches in `rail3_agents`.
   - `buildMandates(input)` — `limited` uses owner's `maxAmount` + period; `open` injects a permissive default (`maxAmount=100000.00`, yearly) so Crossmint's ≥1-mandate requirement is satisfied without user input.
   - `createOrderIntent(agentId, pmId, mandates)` → Crossmint returns `orderIntentId` + `verificationConfig`.
   - Row written with `permission_phase='pending_authorization'` (or `requires-verification` if Crossmint sent that — we mirror the string).
4. Panel swaps to the verification step. `<OrderIntentVerification>` is rendered **directly** (no memo wrapper) with a `useMemo`'d `orderIntent` object and `useCallback`'d handlers. Basis Theory overlay runs the passkey ceremony inline.
5. On `onVerificationComplete` → `POST /api/v1/rail3/cards/:cardId/refresh-phase` (session auth + Bearer JWT, ownership check). Route GETs Crossmint's truth and writes `permission_phase` back to the DB.
6. Panel shows "Authorized" if phase is `active`. Owner closes.

### 3. Bot checkout

1. Bot calls `POST /api/v1/bot/rail3/checkout` with merchant info + `card_id`.
2. Backend loads card + PM. Asserts `pm.verification_status==='active'` and `card.permission_phase==='active'`. Runs guardrails.
3. `fetchOneTimeCredentials(orderIntentId, merchant)` → Crossmint returns merchant-scoped PAN/CVC/expiry.
4. Response is shaped identically to Rail 5 fill-card → OpenClaw fills the checkout form unchanged.
5. Bot calls `POST /api/v1/bot/rail3/confirm` after the charge clears → recorded in central orders with `rail: "rail3"`.

### 4. Delete

- **Delete virtual card** → revokes its orderIntent on Crossmint, deletes the row. PM untouched.
- **Delete PM** → `409 has_virtual_cards` if any `rail3_cards` rows reference it. Owner must delete cards first.

---

## Auth model

Two distinct auth modes against Crossmint, used in different places. **Choosing the wrong one is the most common Rail 3 mistake.**

| Use case | Auth | Where in code |
|---|---|---|
| **Browser SDK (owner present)** | Firebase ID token via `setJwt()` | `Rail3CrossmintProvider`'s `FirebaseJwtBridge` calls `setJwt(idToken)` on auth change, refreshes every 50 min. |
| **Server-side state mutations** (create PM/agent/orderIntent, revoke) | `X-API-KEY: $CROSSMINT_SERVER_API_KEY` + `userLocator` derived from `owner_uid` | `client.ts` |
| **Reading an orderIntent** (`/order-intents/:id`) | **JWT only** — server key returns 403 in practice despite the OpenAPI saying otherwise. | `permissions.ts → getOrderIntent(jwt, id)` and the `/refresh-phase` route which forwards the user's Bearer JWT. |
| **Fetching one-time credentials** (`/order-intents/:id/credentials`) | **Bearer JWT only** | `credentials.ts` — works in owner-present flows, **403s in headless bot flows** (no live JWT). See "Outstanding". |

**Crossmint env is staging-only** for now, hardcoded in `features/payment-rails/crossmint-env.ts`. Don't read `CROSSMINT_ENV` directly anywhere else.

---

## Crossmint API surface (what we actually call)

All under `https://staging.crossmint.com/api/`.

| Endpoint | Method | Auth | Wrapper |
|---|---|---|---|
| `/2025-06-09/agents` | POST | server key + userLocator | `agents.createAgent` |
| `/unstable/payment-methods` | POST | JWT | (via SDK) |
| `/unstable/payment-methods/:id` | DELETE | server key + userLocator | `paymentMethods.deletePaymentMethod` |
| `/unstable/payment-methods/:id/agentic-enrollment` | GET / POST | JWT (GET in browser) / server key (poll from server) | `agenticEnrollment.*` |
| `/unstable/order-intents` | POST | server key + userLocator | `permissions.createOrderIntent` |
| `/unstable/order-intents/:id` | GET | **JWT only** | `permissions.getOrderIntent(jwt, id)` |
| `/unstable/order-intents/:id` | DELETE | server key + userLocator | `permissions.revokeOrderIntent` |
| `/unstable/order-intents/:id/credentials` | POST | **JWT only** | `credentials.fetchOneTimeCredentials` |

**No webhooks.** Crossmint supports webhooks but we don't use any — same as the quickstart. State sync is pull-based (`/refresh-phase` after ceremony, polling during enrollment). If you find yourself reaching for a webhook, first check whether a pull at the same point would work.

---

## Conventions — do this / don't do this

### Do

- **Wrap any Rail-3 surface that mounts a Crossmint SDK component in `Rail3CrossmintProvider`.** Without the JWT bridge, the iframe loads but never authorizes — silently.
- **Render `<OrderIntentVerification>` inline.** Plain `<div>` parent. Use `useMemo` on the `orderIntent` object and `useCallback` on `onVerificationComplete` / `onVerificationError` so the SDK gets stable references and doesn't re-mount the ceremony in a loop.
- **After any ceremony completes, hit `/refresh-phase`** (cards) or poll `agentic-enrollment` (PMs) to reconcile Crossmint truth into our DB. SDK `onComplete` only says "ceremony ended" — only Crossmint knows the resulting phase.
- **Use the matching auth mode per endpoint** (table above). When in doubt, the quickstart shows the JWT path for everything browser-side.
- **Import Crossmint env from `features/payment-rails/crossmint-env.ts`.** Single source of truth.

### Don't

- **Don't wrap any Crossmint SDK component inside a Radix `<Dialog>`** (or any modal/portal that sets `pointer-events: none` on `<body>`). Basis Theory portals its overlay to `<body>`; the inherited `pointer-events: none` makes the overlay un-clickable. We hit this and shipped a MutationObserver workaround; the only real fix was removing the Dialog. Quickstart shape (inline panel) is the right shape.
- **Don't memoize the SDK with `React.memo` to "stabilize" it.** Once props are stable (via `useMemo`/`useCallback`), the SDK is already stable. Adding `memo` was over-engineering — the previous `OrderIntentVerificationStable` block is gone.
- **Don't add a webhook listener "for safety".** Pull-after-ceremony covers everything we need.
- **Don't branch Crossmint env per call site.** `crossmint-env.ts` decides.
- **Don't add a DB FK** between `rail3_cards` and `rail3_payment_methods` / `bots`. Integrity is application-enforced (PM-delete blocked when cards exist); FK migrations on the live table were avoided once and that's the policy.
- **Don't read `card.cardholderName`.** It doesn't exist. Cardholder name lives on the PM (`pm.cardholderName`).
- **Don't forget `"rail3"` in the `recordOrder` rail union.** It silently typechecks against `OrderInput.rail` but fails at the writer.

---

## Gotchas

- **The dialog→panel refactor.** Through 2026-05-20 `AddCardDialog` was a Radix `<Dialog>` wrapping `<OrderIntentVerification>`. Dialog set `pointer-events: none` on `<body>`; Basis Theory's body-portaled overlay inherited it; clicks were swallowed; ceremony hung on "Authenticating on the other window". We tried a MutationObserver that forced `pointer-events: auto` on `<body>` and the mock overlay element. It was unreliable and unnecessary — converting to an inline panel (quickstart shape) eliminated the root cause. The component is still named `add-card-dialog.tsx` for import-stability, but it's a panel.
- **React StrictMode double-mount kills verification in dev.** Crossmint's `verifyInstruction(agentId, instructionId)` runs in an effect with deps `[ready, agentId, instructionId]`. StrictMode double-mounts; the second mount calls `verifyInstruction` with the same single-use `instructionId`; Crossmint resolves instantly → `onVerificationComplete` fires → parent unmounts the SDK. Symptom: overlay flashes ~1s and disappears, "[BtAi] Visa SDK loaded successfully" appears **twice** in console. Workaround: test in prod, or disable StrictMode locally, or gate `onVerificationComplete` behind a ≥500ms timer.
- **Cross-device passkey mismatch (prod).** Visa binds the passkey to the device that did the original enrollment. A different device → SDK logs `[BtAi] Cross-device passkey mismatch detected ... onNewDevice=reenroll`. Crossmint's `<CrossmintProvider>` doesn't expose the `onNewDevice` prop, so we can't tune it. Workaround: complete the orderIntent ceremony on the same device that enrolled the PM, or re-vault the PM.
- **Popup blocker can swallow the WebAuthn window (prod desktop).** No console error, just a spinner forever. Check the popup-blocked icon in the URL bar.
- **`recordOrder` rail union must include `"rail3"`.** Easy to miss when adding a new rail.
- **PM `status` is dead weight.** We hard-delete PMs, so it's effectively always `active`. Kept for parity with other rail tables.
- **Open mode is still merchant-scoped at credential time.** "No limit" = no permission-level cap, not a reusable PAN.

---

## Debugging: "the card is stuck at requires-verification"

Step 1: query Crossmint directly to figure out which side is wrong.

```sql
SELECT card_id, order_intent_id, permission_phase, last_used_at, created_at
FROM rail3_cards
WHERE owner_uid = '<uid>'
ORDER BY created_at DESC LIMIT 5;
```

Then GET Crossmint's truth (JWT required — server key returns 403):

```
GET https://staging.crossmint.com/api/unstable/order-intents/<orderIntentId>
Headers:
  X-API-KEY: $NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY_STAGING
  Authorization: Bearer <firebase-id-token-for-owner>
```

For local diagnostics, mint a Firebase ID token via firebase-admin → identitytoolkit `signInWithCustomToken`. Reference script lives in chat (search "check-crossmint.mjs").

Interpret:

| Crossmint `phase` | DB `permission_phase` | Diagnosis | Fix |
|---|---|---|---|
| `requires-verification` | `requires-verification` | Ceremony never finished on Crossmint's side. SDK didn't complete. | Look at the SDK-mount path. Common: popup blocked, StrictMode, dialog wrapping, passkey mismatch. |
| `active` | `requires-verification` | Ceremony succeeded on Crossmint; our writeback didn't run. | Call `POST /api/v1/rail3/cards/:cardId/refresh-phase` manually. If that works, check why the SDK's `onVerificationComplete` callback didn't fire (or wasn't wired). |
| `expired` | anything | Ceremony abandoned. | User must re-create the card. Don't try to rescue. |

Same shape for enrollment: `GET /api/unstable/payment-methods/:id/agentic-enrollment`.

---

## Status

### Implemented ✅

- Two-table data model (`rail3_payment_methods` + `rail3_cards`) + per-owner `rail3_agents`.
- Backend client (`features/payment-rails/rail3/*`).
- Owner API routes (`app/api/v1/rail3/*`) including `/refresh-phase` reconciliation.
- Bot API routes (`app/api/v1/bot/rail3/*`).
- UI: setup wizard, cards grid, PaymentMethodsStrip, AddCardDialog (inline panel).
- Firebase ↔ Crossmint JWT bridge with 50-min auto-refresh.
- Per-card guardrails (`rail3_guardrails`) enforced in `features/agent-interaction/approvals/rail3-fulfillment.ts`.
- Verified end-to-end on Crossmint staging (2026-05-21): create card → passkey ceremony → `permission_phase='active'` written back to DB.

### Outstanding ❌

| # | Item | Blocking? | Notes |
|---|---|---|---|
| 1 | **Firebase refresh token for headless bot checkout** | Yes for bot flow | `/order-intents/:id/credentials` requires Bearer JWT. No live user = 403. Plan: `project_knowledge/currently_building/rail3/rail3-firebase-refresh-token-plan.md`. |
| 2 | **`/api/v1/rail3/transactions/` route audit** | Unknown | Route exists, never validated against current schema. |
| 3 | **Mobile prod verification ceremony unmounting mid-flow** | Unverified post-refactor | Was observed pre-dialog-removal. May or may not still reproduce — needs re-test on mobile. |

---

## References

### Internal

- **Only open plan:** `project_knowledge/currently_building/rail3/rail3-firebase-refresh-token-plan.md` — refresh-token store so headless bot checkout can fetch JWT-only credentials.
- Historical plans + superseded docs (archived): `project_knowledge/currently_building/rail3/_completed/` — per-user agent rework, env single-source, verification writeback, staging migration, frontend rewire, add-card preview, open-points tracker, prior operational docs.

### External

- **Crossmint quickstart repo (canonical reference):** <https://github.com/Crossmint/card-permissions-quickstart>
- **Quickstart live demo:** <https://virtual-cards.demos-crossmint.com>
- **Crossmint Card Permissions docs:** <https://docs.crossmint.com/agents/overview>
- **Crossmint API reference:** <https://docs.crossmint.com/api-reference>
- **Crossmint Console** (3P auth provider config, server/client keys): <https://staging.crossmint.com/console>
- **Basis Theory React Agentic SDK:** <https://www.npmjs.com/package/@basis-theory/react-agentic>
