---
name: Rail 3 — Virtual Cards (Crossmint Card Permissions)
description: End-to-end technical overview of Rail 3 — how vaulted real cards spawn merchant-scoped virtual cards via Crossmint + Basis Theory, how it's wired, and what's still outstanding.
created: 2026-05-20
last_updated: 2026-05-20
---

# Rail 3 — Virtual Cards

> The owner vaults their real Visa/Mastercard once in Crossmint. Each "virtual card" is one Crossmint **orderIntent** stacked on that vault, with its own mandate. At bot-checkout time we ask Crossmint for a fresh **merchant-locked one-time PAN/CVC** scoped to that orderIntent. CreditClaw never stores card data.

This is the third outbound payment rail in CreditClaw, sitting alongside Rail 1 (Privy stablecoin) and Rail 5 (self-hosted encrypted real card). It's the "Virtual Cards" tile in the owner sidebar.

---

## Vendor stack

Rail 3 is a thin wrapper around two stacked vendors. Knowing which one owns which surface is the single most important thing for debugging.

| Layer | Vendor | What they do | Where they appear |
|---|---|---|---|
| **API + orchestration** | **Crossmint** (Card Permissions API) | Vaults the real card, mints orderIntents, returns one-time PAN/CVC per merchant. PCI scope lives here. | `features/payment-rails/rail3/*` calls `https://www.crossmint.com/api/...`. SDK package: `@crossmint/client-sdk-react-ui`. |
| **Card issuance + verification UI** | **Basis Theory** (`@basis-theory/react-agentic` v2.0.0) | Provides the actual Visa Agentic Commerce issuance + the WebAuthn/passkey verification overlay. Ships both a mock Visa SDK (test env) and bridges to real Visa Click to Pay in prod. | Pulled in as a transitive dep of the Crossmint SDK. Renders body-portaled overlays at `z-index: 10001`. |
| **Auth** | Firebase | Owner identity. Crossmint is configured to trust Firebase as a 3P auth provider in the Crossmint Console; the browser SDK gets `setJwt(firebaseIdToken)` and Crossmint maps that to a `userLocator`. | `components/rail3/crossmint-provider.tsx` (browser bridge). |

**Why Basis Theory matters operationally.** Crossmint is the API we integrate against, but every owner-facing verification ceremony (saving a card, authorizing an orderIntent) is rendered by Basis Theory's library. The "Verify Now" overlay, the passkey prompt, the Visa Click to Pay sheet — all Basis Theory. Bugs in that surface (z-index, pointer-events, double-mount, postMessage timing) are Basis Theory bugs, not Crossmint API bugs. The mock SDK file at `node_modules/@basis-theory/react-agentic/dist/mockVisaSdkManager-*.mjs` is where the test-env overlay lives.

---

## What the feature does

| Concept | Lives in | What it is |
|---|---|---|
| **Payment method (PM)** | `rail3_payment_methods` | The vaulted real card. One row per Crossmint `paymentMethod`. Verified once via the agentic-enrollment ceremony. |
| **Virtual card** | `rail3_cards` | One Crossmint orderIntent on top of a PM, with its own spending mandate. Many per PM. |
| **Mandate** | `rail3_cards.mandates` (jsonb) | Spending rules sent to Crossmint at intent-creation time (max amount, period, description). |
| **Credentials** | Fetched on demand, never stored | Per-merchant one-time PAN + CVC + expiry. Lives in the bot/checkout response only. |

Two-table split is deliberate (v1 conflated PM and virtual card — adding a second virtual card forced re-vaulting). The split mirrors how Privy/Stripe wallets already work in Rail 1.

---

## Data model

### `rail3_payment_methods` (vaulted real card)
`owner_uid`, `payment_method_id` (Crossmint), `card_brand`, `card_last4`, `cardholder_name`, `verification_status` (`pending` / `active`), `status`, `last_used_at`, `created_at`. PK on `id`. `last_used_at` drives "default PM" pick in `AddCardDialog`.

### `rail3_cards` (virtual card)
`card_id`, `owner_uid`, `bot_id` (nullable — vault-only until owner attaches one), `payment_method_id`, `order_intent_id`, `intent_mode` (`limited` / `open`), `mandates` (jsonb), `permission_phase` (`pending_authorization` / `active` / `revoked`), `category`, `card_name`, `created_at`. **No DB FK** to PM; integrity is application-enforced.

### `rail3_agents` (per-owner Crossmint agent)
PK `owner_uid`, plus `agent_id`, `created_at`. One Crossmint agent per owner, lazily created on first card. The earlier per-bot-agent model is gone (see [Schema history](#schema-history)).

### `rail3_transactions`
Records every credential issuance + settlement. Exists but the bot-checkout writer has not been audited end-to-end against the latest schema.

### `rail3_guardrails`
Per-card spending guardrails (per-tx, daily, monthly, recurring-allowed). Editable from the card detail screen. Enforced in `features/agent-interaction/approvals/rail3-fulfillment.ts` before credentials are fetched.

---

## File map

```
features/payment-rails/rail3/
  client.ts                 # Crossmint REST client; ownerUidToUserLocator
  ids.ts                    # generateRail3CardId / generateRail3TransactionId
  agents.ts                 # createAgent (one per owner)
  per-user-agent.ts         # ensure-and-cache wrapper
  paymentMethods.ts         # list / delete PM
  agenticEnrollment.ts      # get / create enrollment (vault verification)
  permissions.ts            # buildMandates, createOrderIntent, revokeOrderIntent
  credentials.ts            # fetchOneTimeCredentials (merchant-scoped PAN/CVC)
  index.ts                  # public surface

server/storage/
  rail3-payment-methods.ts  # PM CRUD
  rail3.ts                  # virtual card CRUD (plural getters by botId / pmId)

app/api/v1/rail3/
  payment-methods/route.ts                       # POST save, GET list
  payment-methods/[id]/route.ts                  # DELETE (409 if cards exist)
  cards/route.ts                                 # POST create, GET list
  cards/[cardId]/route.ts                        # DELETE — revokes only its orderIntent
  transactions/route.ts                          # exists, not yet audited

app/api/v1/bot/rail3/
  cards/route.ts                                 # plural list by botId
  checkout/route.ts                              # one-time PAN + Rail-5-shaped fill-card payload
  confirm/route.ts                               # records order

components/rail3/
  crossmint-provider.tsx     # CrossmintProvider + Firebase JWT bridge
  add-card-dialog.tsx        # Create virtual card + OrderIntentVerification ceremony
  payment-methods-strip.tsx  # PM header strip on the cards page

app/(dashboard)/virtual-cards/page.tsx          # cards grid + PM strip
app/setup/rail3/page.tsx                        # first-time wizard: save + verify PM
```

---

## Flows

### 1. First-time setup (`/setup/rail3`)
1. Owner opens the page (wrapped in `Rail3CrossmintProvider` → `CrossmintProvider` + `FirebaseJwtBridge`).
2. **Step 1 — Save card.** `CrossmintPaymentMethodManagement` iframe captures the real card. On success → `POST /api/v1/rail3/payment-methods` writes the row with `verification_status='pending'`.
3. **Step 2 — Verify.** Crossmint kicks off the agentic-enrollment ceremony. Basis Theory's Visa SDK renders its overlay (passkey / Click to Pay). We poll `GET /payment-methods/:id/agentic-enrollment` every 3s until `status='active'`, then flip `verification_status='active'`.
4. Owner lands on `/virtual-cards` with one verified PM and an empty grid.

### 2. Create a virtual card (`AddCardDialog`)
1. Owner clicks **+ Add Virtual Card**. Dialog mounts under `Rail3CrossmintProvider`.
2. PM picker defaults to most-recently-used (`last_used_at`).
3. Owner picks mode (limited/open), limit + period, category, nickname, optional intent description, optional bot link.
4. `POST /api/v1/rail3/cards`:
   - `ensurePerOwnerAgent(owner_uid)` — creates the Crossmint agent if missing, caches in `rail3_agents`.
   - `buildMandates(input)` — for `limited`, uses the owner's `maxAmount` + period; for `open`, injects `{ type: "maxAmount", value: "100000.00", details: { currency: "usd", period: "yearly" } }` + a permissive description. (Crossmint requires ≥1 mandate; product requirement is intent-optional.)
   - `createOrderIntent(agentId, pmId, mandates)` — Crossmint returns `orderIntentId` + `verificationConfig`.
   - Row written with `permission_phase='pending_authorization'`.
5. Dialog renders `<OrderIntentVerification>` (memoized as `OrderIntentVerificationStable`). Basis Theory's overlay runs the passkey ceremony.
6. On `onVerificationComplete` → `POST /api/v1/rail3/cards/:cardId/authorization-status` confirm and flip `permission_phase='active'`; PM's `last_used_at` bumped.

### 3. Bot checkout
1. Bot calls `POST /api/v1/bot/rail3/checkout` with merchant info + `card_id`.
2. Backend loads card + PM, asserts `pm.verification_status==='active'` and `card.permission_phase==='active'`, runs guardrails.
3. `fetchOneTimeCredentials(orderIntentId, merchant)` → Crossmint returns merchant-scoped PAN/CVC/expiry.
4. Response is shaped identically to Rail 5 fill-card so OpenClaw fills the checkout form unchanged.
5. Bot calls `POST /api/v1/bot/rail3/confirm` after the charge clears → recorded in central orders with `rail: "rail3"`.

### 4. Delete semantics
- **Delete virtual card** → revokes only its orderIntent on Crossmint, deletes the row. PM untouched.
- **Delete PM** → blocked with `409 has_virtual_cards` if any `rail3_cards` row references it. Owner must delete cards first.

---

## Auth model

- Owner-present surfaces (setup wizard, AddCardDialog, revoke) → browser holds the Firebase ID token; `Rail3CrossmintProvider`'s `FirebaseJwtBridge` calls `setJwt(idToken)` on auth change and refreshes every 50 minutes. Crossmint SDK uses that JWT directly.
- Server-side calls from our BFF → `client.ts` sends `CROSSMINT_SERVER_API_KEY` + a `userLocator` derived from `owner_uid`.
- **Headless bot checkout has no live user.** Crossmint's `/order-intents/:id/credentials` endpoint requires `Authorization: Bearer <Firebase ID token>` — server key + userLocator is rejected with 403. The planned fix is `rail3-firebase-refresh-token-plan.md`: store an encrypted refresh token per owner, exchange for a fresh ID token on demand. **This is not yet implemented.** Without it, bot checkout against live Crossmint will 403.

---

## Schema history

The table shape changed twice. Current state (post-2026-05-20 migration):

| Table | Old | Current |
|---|---|---|
| `rail3_agents` | PK on `bot_id`, columns `(agent_id, created_at, bot_id, owner_uid)`. Per-bot agent. | PK on `owner_uid`, columns `(owner_uid, agent_id, created_at)`. **One agent per owner.** |
| `rail3_cards.bot_id` | `NOT NULL` (every card had to be bot-linked). | Nullable (botless / vault-only virtual cards allowed). |

Production migration applied 2026-05-20 via SQL Console. Replit Publish's auto-diff could not produce the destructive change set; it was applied manually. See chat for the exact statements run.

---

## Known gotchas

- **Pointer-events trap.** Both the mock Visa SDK (test env) and the real Visa Click to Pay SDK portal their overlays directly to `<body>` at z-index 10001. Radix Dialog sets `pointer-events: none` on `<body>` while open, which the body-portaled overlay inherits — overlay shows but clicks pass through. `OrderIntentVerificationStable` installs a MutationObserver that forces `pointer-events: auto` on `<body>` and the overlay while verification is mounted.
- **React StrictMode double-mount kills verification in dev.** Crossmint's `verifyInstruction(agentId, instructionId)` runs in an effect with deps `[ready, agentId, instructionId]`. StrictMode dev double-mounts the component; the second mount calls `verifyInstruction` with the same single-use `instructionId` and Crossmint resolves immediately → `onVerificationComplete` fires before the user sees the overlay → the dialog unmounts. **Symptom: overlay flashes for ~1s then vanishes.** No effect in prod (StrictMode is dev-only). If we ever need to test the ceremony in dev, gate `onVerificationComplete` behind a ≥500ms timer or detect the double-mount.
- **`OrderIntentVerification` requires the Crossmint Firebase JWT bridge.** If `Rail3CrossmintProvider` isn't mounted (or `setJwt` hasn't fired yet), the iframe loads but never authorizes — silent. Always wrap any Rail-3 surface in `Rail3CrossmintProvider`.
- **OrderIntentVerification re-mounts on parent re-render.** Without memoization, every JWT-bridge tick / bots-loading / error toggle hands the SDK a fresh prop object and restarts the WebAuthn ceremony in a loop ("Authenticating on the other window" hang). `OrderIntentVerificationStable` is wrapped in `memo` with stable identity for exactly this reason.
- **No DB FK** on `rail3_cards.payment_method_id` or `rail3_cards.bot_id`. Integrity is application-enforced. Out-of-band SQL deletes will orphan cards; checkout will fail explicitly rather than silently.
- **PM `status` is mostly dead weight.** We hard-delete PMs, so `status='active'` is effectively always true. Column kept for parity with other rail tables.
- **Open mode is still merchant-scoped at credential time.** "No limit" means no permission-level cap, not a reusable PAN.
- **`recordOrder` rail union must include `"rail3"`.** Forgetting it silently typechecks against `OrderInput.rail` but fails at the writer.
- **Cardholder name lives on the PM, not the card.** Checkout reads `pm.cardholderName`, not `card.cardholderName` (latter doesn't exist).

---

## Status

### Implemented ✅
- Two-table data model (`rail3_payment_methods` + `rail3_cards`) + per-owner `rail3_agents`.
- Backend client (`features/payment-rails/rail3/*`): payment methods, agentic enrollment, agents, permissions (mandates + orderIntents), credentials.
- Owner API routes (`app/api/v1/rail3/*`): PM save/list/delete, card create/list/delete, authorization-status poll.
- Bot API routes (`app/api/v1/bot/rail3/*`): checkout, confirm.
- UI: setup wizard (`/setup/rail3`), cards grid (`/virtual-cards`), PaymentMethodsStrip, AddCardDialog.
- Firebase ↔ Crossmint JWT bridge (`Rail3CrossmintProvider`) with 50-minute auto-refresh.
- Pointer-events MutationObserver workaround for Radix × Basis Theory overlay conflict.
- Memoization to prevent OrderIntentVerification ceremony loops.
- Intent-optional logic (`limited` vs `open` modes with permissive default mandate).
- Per-card guardrails (`rail3_guardrails`) enforced in `rail3-fulfillment.ts`.
- Production schema migrated to current shape (2026-05-20).

### Outstanding / not yet working ❌

| # | Item | Blocking? | Notes |
|---|---|---|---|
| 1 | **Live end-to-end test on Crossmint staging** | Yes — primary blocker | Whole rebuild is structurally correct but unverified against a live backend. Test path: save card → enrollment passkey → AddCardDialog → orderIntent passkey → bot checkout returns one-time PAN. Tracked in `rail3-open-points.md` #3. |
| 2 | **Firebase refresh token for headless bot checkout** | Yes for bot flow | Without it, `/order-intents/:id/credentials` returns 403 because Crossmint requires Bearer JWT, not server key. Plan in `rail3-firebase-refresh-token-plan.md` (schema + encryption + token exchange). Not started. |
| 3 | **Sidebar nav still inactive** | Cosmetic | `components/dashboard/sidebar.tsx:53` has `href: "/cards", inactive: true, requiredAccess: "admin"`. Should become `href: "/virtual-cards"`, drop both gates once #1 passes. |
| 4 | **`/api/v1/rail3/transactions/` route** | Unknown | Exists but never audited end-to-end against the current schema. May be a stale skeleton. |
| 5 | **PM eligibility surfacing** | Cosmetic | Wizard copy lists eligible card types; no live check before the Crossmint SDK iframe shows its own error. |
| 6 | **Verification ceremony in dev (StrictMode)** | Dev-only annoyance | Overlay flashes and unmounts immediately due to double-mount. Workaround: test in prod (or disable StrictMode locally). |
| 7 | **Regression tests for delete semantics + bot-checkout guards** | Deferred | Flagged once by code review; deferred per "no enterprise scope creep". |

### Known broken paths
- **Bot checkout against live Crossmint will 403** until the refresh-token plan ships (item #2).
- **Dev-mode verification ceremony is broken** until StrictMode is worked around (item #6); prod is fine.
- **Prod mobile verification ceremony unmounts mid-flow** (observed 2026-05-20). OTP path opens, loading spinner shows, then the overlay disappears within ~1s. Card row stays at `permission_phase='requires-verification'`, `last_used_at` empty. Different cause than dev StrictMode (prod has no StrictMode). See diagnostics catalogue below.

---

## Diagnostics catalogue: "verification overlay disappears immediately"

Observed in three contexts so far. Same surface symptom, different root causes. Catalogue them before reaching for code changes.

### A. React StrictMode double-mount (dev only)
- **Symptom:** "[BtAi] Visa SDK loaded successfully" appears **twice** in console. Overlay flashes for ~1s and unmounts.
- **Why:** Crossmint's `verifyInstruction(agentId, instructionId)` runs in an effect with deps `[ready, agentId, instructionId]`. StrictMode double-mounts the component; the second mount calls `verifyInstruction` with the same single-use `instructionId`; Crossmint resolves it instantly → `onVerificationComplete` fires → parent unmounts the SDK.
- **Confirm:** count `[BtAi] Visa SDK loaded successfully` log lines. Two = StrictMode; one = something else.
- **Workaround:** disable StrictMode locally for the Rail-3 surfaces, or gate `onVerificationComplete` behind a ≥500ms timer.

### B. Radix Dialog dismisses on focus/blur (prod, mobile especially)
- **Symptom:** "[BtAi] Visa SDK loaded successfully" appears **once**. OTP method picker shows, user selects → popup tab opens → original tab's Dialog closes itself → SDK unmounts mid-ceremony. Card stays `requires-verification`, `last_used_at` empty.
- **Why:** Radix Dialog's outside-click / focus-trap logic treats the OTP popup's focus shift (or any in-page focus change the Basis Theory overlay does on body-portaled siblings) as an "outside interaction" and closes the dialog. iOS Safari + Chrome on Android handle popup focus differently than desktop, making this much more reproducible on mobile.
- **Confirm:**
  - Add a temporary `onOpenChange` log in `AddCardDialog`. If it logs `false` right when the overlay disappears, Radix is dismissing it.
  - Or set `<Dialog onPointerDownOutside={(e) => { console.log("outside", e.target); e.preventDefault(); }} onEscapeKeyDown={...}>` temporarily and see whether the prevent-default keeps it open.
- **Workaround (planned, not implemented):** render `<OrderIntentVerification>` as a sibling outside the Radix Dialog tree (Plan B revisited). Must also include a StrictMode guard so dev still works.

### C. Body-portaled overlay click-through (prod, all platforms)
- **Symptom:** Overlay renders but clicks pass through to the page beneath.
- **Why:** Basis Theory's overlay portals to `<body>` at z-index 10001. Radix Dialog sets `pointer-events: none` on `<body>`, which the overlay inherits.
- **Status:** worked-around by the MutationObserver in `OrderIntentVerificationStable` that forces `pointer-events: auto` on `<body>` and the overlay.
- **Distinguishes from B:** in B the overlay vanishes; in C it stays but is dead to input. If you see overlay + dead clicks, check the MutationObserver is mounted.

### D. Parent re-render loop ("Authenticating on the other window" forever)
- **Symptom:** Passkey or OTP popup opens, primary tab shows the spinner forever even after the user completes the ceremony in the popup.
- **Why:** Parent re-renders (JWT bridge ticks, bots loading, error toggles) hand `<OrderIntentVerification>` a fresh prop object each render → SDK re-mounts → WebAuthn ceremony restarts in a loop.
- **Status:** worked-around by `OrderIntentVerificationStable = memo(...)` with stable identity.
- **Confirm:** if you ever unwrap the memo, this regresses immediately.

### E. Popup blocker swallows the WebAuthn window (prod, desktop)
- **Symptom:** Spinner forever after Verify Now. No "[BtAi]" error in console. No second tab visible.
- **Why:** Chrome/Safari blocked the popup because the click chain looks indirect.
- **Confirm:** popup-blocked icon in the URL bar; allow popups for the prod domain.

### F. Cross-device passkey mismatch (prod, any device with no matching passkey)
- **Symptom:** Passkey ceremony hangs on "Authenticating with passkey…". SDK source logs `[BtAi] Cross-device passkey mismatch detected for instruction X. Card was enrolled on a different device. onNewDevice=reenroll`.
- **Why:** Visa binds the passkey to the device that did the original enrollment. A different device → SDK's behavior depends on the `onNewDevice` prop on the Basis Theory provider (default `"reenroll"`). Crossmint's `<CrossmintProvider>` doesn't expose this prop, so we can't tune it without reaching past Crossmint's wrapper.
- **Workaround:** complete the orderIntent ceremony on the device that did the original PM enrollment, or re-vault the PM on the device you want to use.

### Authoritative check: ask Crossmint directly

If the local row is `requires-verification` and you need to know whether the ceremony actually got through to Crossmint's backend:

```
GET https://www.crossmint.com/api/unstable/order-intents/:orderIntentId
Headers: X-API-KEY: $CROSSMINT_SERVER_API_KEY
```

Response `phase` field is the source of truth:
- `requires-verification` → SDK never finished talking to Crossmint. Local row is correct. Bug is on our SDK-mount side (A–F above).
- `active` → ceremony succeeded on Crossmint's side but our row is stale. Bug is in our authorization-status polling / write-back path. Fix is to re-poll and update `permission_phase`.
- `expired` → ceremony was abandoned. User must re-create the card.

Same shape for enrollment (vault verification): `GET /api/unstable/payment-methods/:paymentMethodId/agentic-enrollment`.

There's no dedicated dashboard route for this today. If we hit this often, a 1-line admin endpoint that proxies the GET would be cheap.

### Local DB quick-look

```sql
SELECT card_id, owner_uid, payment_method_id, order_intent_id,
       permission_phase, status, card_name, created_at, last_used_at
FROM rail3_cards
ORDER BY created_at DESC
LIMIT 10;
```

`permission_phase='requires-verification'` + `last_used_at IS NULL` is the "stuck" signature.

---

## Cross-references

- Operational doc (PM↔card concept, intent-optional): `rail3-crossmint-card-permissions.md`
- Outstanding work tracker: `rail3-open-points.md`
- Refresh-token plan (Crossmint Bearer for bots): `rail3-firebase-refresh-token-plan.md`
- Per-user agent rework rationale: `rail3-per-user-agent-plan.md`
- Crossmint env single-source: `rail3-crossmint-env-single-source-plan.md`
- Historical v1 plan (pre-split, single-table): `rail3-virtual-cards-technical-plan)_completed.md`
- Frontend rewire (completed): `rail3-frontend-rewire-plan_completed.md`
