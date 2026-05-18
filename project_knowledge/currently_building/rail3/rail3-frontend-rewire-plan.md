---
name: Rail 3 — Crossmint Card Permissions, Full Frontend + Backend Rewire
description: Evidence-based plan to replace both our invented frontend iframes AND our invented backend REST client with the real Crossmint Agentic Commerce API (`/api/unstable`) and the `@crossmint/client-sdk-react-ui` components, using Firebase as the BYO auth provider. Includes a full mismatch audit against the quickstart and API reference.
created: 2026-05-18
last_updated: 2026-05-18
status: plan
---

# Rail 3 — Crossmint Card Permissions, Full Rewire

> Previous plans assumed we just had a frontend gap. After reading the real API reference + the [card-permissions-quickstart](https://github.com/Crossmint/card-permissions-quickstart), **our entire backend client is wrong** — wrong base path, wrong auth model, wrong endpoint shapes, wrong mandate types, wrong phase enum, missing agent endpoints, missing agentic-enrollment endpoints. The frontend is wrong too (404 iframes). Both layers need to be rewritten against the real API.

---

## Primary sources

| What | URL |
|---|---|
| Cards quickstart | https://docs.crossmint.com/agents/cards-quickstart |
| BYO Auth (Firebase) | https://docs.crossmint.com/wallets/guides/bring-your-own-auth |
| Customize verification UI | https://docs.crossmint.com/agents/payment-methods/cards/customize-verification-ui |
| API ref: List PMs | https://docs.crossmint.com/api-reference/agentic-commerce/payment-methods/list-payment-methods |
| API ref: Delete PM | https://docs.crossmint.com/api-reference/agentic-commerce/payment-methods/delete-payment-method |
| API ref: Create Agent | https://docs.crossmint.com/api-reference/agentic-commerce/agents/create-agent |
| API ref: Create Agentic Enrollment | https://docs.crossmint.com/api-reference/agentic-commerce/agentic-enrollment/create-agentic-enrollment |
| Reference repo (Stytch-based; flow is identical for Firebase) | https://github.com/Crossmint/card-permissions-quickstart |
| Live demo | https://card-permissions-quickstart.vercel.app/ |

---

## Mismatch audit — what we have vs what Crossmint actually exposes

### Base URL
- **Real:** `https://staging.crossmint.com/api/unstable` (staging) · `https://www.crossmint.com/api/unstable` (prod). API surface is explicitly `unstable`, expect breaking changes.
- **Ours (`features/payment-rails/rail3/client.ts`):** `https://staging.crossmint.com/api/2025-06-09` and `https://www.crossmint.com/api/2025-06-09`.
- **Action:** rewrite `client.ts` base URL.

### Auth model — **LOCKED**

Mirrors Rail 1's app-credential pattern as closely as Crossmint's PCI-iframe constraints allow. Single identity (Firebase UID) flows end-to-end through our DB → BFF → Crossmint API → Crossmint dashboard rows.

- **Backend (BFF → Crossmint):** `X-API-KEY: <CROSSMINT_SERVER_API_KEY>` + `?userLocator=userId:<firebase_uid>` on every user-scoped call. Firebase UID resolved from the existing session cookie. One server credential; no per-user secrets.
- **Browser (SDK iframes → Crossmint):** `setJwt(firebaseIdToken)` via the `JwtSync` component. Required because PCI-scoped iframes (`CrossmintPaymentMethodManagement`, `OrderIntentVerification`, `PaymentMethodAgenticEnrollmentVerification`) run outside our DOM and need their own auth context.
- **Crossmint Console (one-time per env):** register Firebase as a 3P JWT provider → enter Firebase project ID → leave `Verifier Id = sub`. This makes Crossmint trust Firebase-issued JWTs from the browser AND map `sub` → the same userId the server passes via `userLocator`.
- **Why this and not alternatives:** server-key matches Rail 1 (`PRIVY_APP_SECRET`) — one credential in env, never per-user. Firebase UID directly = no opaque ID translation table to maintain, Crossmint dashboard rows correspond 1:1 to our owners (we are the only consumer of their data; no privacy reason to obscure IDs). Custom-JWT-with-JWKS path rejected because it adds a JWKS endpoint + signing keys we don't need.
- **Coupling cost:** if we ever migrate off Firebase Auth, we'd reconfigure Crossmint Console with the new 3P provider. Acceptable; no concrete plan to move.

### Endpoint inventory we need
From quickstart `lib/crossmint-api.ts` and the API reference, the full surface for Card Permissions is:

| Method + Path | Purpose | Body / Notes |
|---|---|---|
| `GET /payment-methods` | List PMs for the user | Query: `limit`, `cursor`, `sort`, `type`, `userLocator`. Returns `{ data: PaymentMethod[], nextCursor?, previousCursor? }`. |
| `DELETE /payment-methods/:paymentMethodId` | Remove PM | 204. |
| `GET /payment-methods/:paymentMethodId/agentic-enrollment` | Check enrollment status | 404 = `not_started`; 200 returns `{ enrollmentId, status: "pending"\|"active", verificationConfig? }`. |
| `POST /payment-methods/:paymentMethodId/agentic-enrollment` | Start enrollment | Body `{ email }`. Returns pending enrollment with `verificationConfig: { environment, publicApiKey }`. |
| `POST /agents` | Create agent | Body `{ metadata: { name, description?, imageUrl? } }`. Returns `{ agentId, metadata }`. |
| `GET /agents` | List agents | Returns `AgentResponse[]`. |
| `DELETE /agents/:agentId` | Delete agent | 204. |
| `POST /order-intents` | Create card permission | Body `{ agentId, payment: { paymentMethodId }, mandates }`. Returns full OrderIntent with `phase` + `verificationConfig` if `phase === "requires-verification"`. |
| `GET /order-intents` | List intents | Returns `OrderIntentResponse[]`. |
| `DELETE /order-intents/:orderIntentId` | Revoke intent | 204. |
| `POST /order-intents/:orderIntentId/credentials` | Fetch one-time PAN for agent | Body `{ merchant: { name, url, countryCode } }`. Returns `{ card: { number, expirationMonth, expirationYear, cvc }, expiresAt }`. |

There is **no** `GET /payment-methods/:id`. The list endpoint is the read path; if we need single-PM reads we'd filter client-side or list once and cache.

### Type mismatches (our types → real shapes)

```diff
// PaymentMethod
- { paymentMethodId, agentId, brand, last4, expMonth, expYear, cardholderName?, verificationStatus }
+ { paymentMethodId, type: "card", default, display?: { imageUrl },
+   card: { source: { type, id }, brand, last4,
+           expiration: { month: string, year: string },
+           billing: { name }, fundingType, bin } }

// agentId is NOT on the PM. It's bound at order-intent creation.
// verificationStatus is NOT on the PM. It's a separate GET /…/agentic-enrollment call.
// expMonth/Year are STRINGS not numbers.

// AgenticEnrollment (separate resource)
+ { status: "not_started" }
+ | { enrollmentId, status: "active" }
+ | { enrollmentId, status: "pending", verificationConfig: { environment, publicApiKey } }

// Mandate
- "maxAmount" | "description"
+ "maxAmount" | "description" | "prompt"
// "prompt" appears in the quickstart's TS types but not in the public docs examples.
// The API reference schema lists 4 mandate options but only exposes 2 (maxAmount, description) in markdown.

// OrderIntent
- { orderIntentId, phase: "pending_authorization" | "active" | "revoked", agentId, paymentMethodId, mandates }
+ { orderIntentId,
+   phase: "requires-verification" | "active" | "expired",
+   payment: { paymentMethodId },                       // nested, not flat
+   mandates: Mandate[],
+   verificationConfig?: { environment, publicApiKey, agentId, instructionId } } // when requires-verification

// Credentials
- { cardNumber, expMonth: number, expYear: number, cvc, merchantName, merchantUrl?, expiresAt }
+ { card: { number, expirationMonth: string, expirationYear: string, cvc }, expiresAt }
// merchant fields are inputs (in request body), not echoed back.

// CreateOrderIntent request body
- { agentId, paymentMethodId, mandates }
+ { agentId, payment: { paymentMethodId }, mandates }
```

### Schema implications

- `rail3_payment_methods.agent_id` — column is semantically wrong; agentId binds to the order intent, not the PM. Either drop it or rename to a "default agent" hint.
- `rail3_payment_methods.verification_status` — also wrong place; should be a derived lookup against `/agentic-enrollment`, or denormalize into a separate `rail3_agentic_enrollments` table keyed by `payment_method_id`.
- `rail3_payment_methods.{exp_month, exp_year}` — keep as ints internally, parse from API strings.
- We need a new place for `agent_id` per owner (one agent reused across PMs and bots; docs explicitly say "one agent per user", and in our model "user" = owner since bots belong to owners). New `rail3_agents` table `(owner_uid PK, agent_id, created_at)`, matching the `rail{N}_{thing}` naming used by rail5. No `name` column — source of truth lives in Crossmint.
- `rail3_cards.permission_phase` — column already stores the real enum values (`requires-verification | active | expired`). No change needed.

### Frontend mismatches

- `app/setup/rail3/page.tsx` loads `<iframe src=".../embed/save-payment-method">` — endpoint doesn't exist. Replace with `<CrossmintPaymentMethodManagement onPaymentMethodSaved={...} />`. No `agentId` prop.
- `components/rail3/add-card-dialog.tsx` loads `<iframe src=".../embed/order-intent-verification">` — endpoint doesn't exist. Replace with `<OrderIntentVerification orderIntent={createdIntent} appearance={…} onVerificationComplete onVerificationError />`. Needs the **full intent object**, not just the id.
- Missing entirely: agent creation step, agentic-enrollment verification step (the post-save passkey ceremony before a card is usable for agents). Use `<PaymentMethodAgenticEnrollmentVerification enrollment={pendingEnrollment} appearance={…} onVerificationComplete onVerificationError />`.
- Missing entirely: `CrossmintProvider` + `CrossmintWalletProvider` wrappers + a `JwtSync` component bridging Firebase `getIdToken()` → `useCrossmint().setJwt()`. Required even in server-key mode so the SDK iframe components can authenticate the user.

---

## Decisions

### Decision 1 — Auth model **LOCKED**
Server-key + `userLocator=userId:<firebase_uid>` on the backend; Firebase JWT bridged to SDK via `setJwt()` on the browser; Firebase registered as 3P in Crossmint Console per environment. See the "Auth model" entry in the mismatch audit above for full rationale.

---

## Resolved decisions

All previously open decisions answered from the public Crossmint docs (https://docs.crossmint.com, `llms-full.txt`). No open questions remain blocking implementation.

### D-1 — Agent scope: **one agent per owner**
Docs explicitly: *"You typically create one agent per user."* New table `rail3_agents (owner_uid PK, agent_id, created_at)`. In our model bots belong to owners, so "user" = owner. All of an owner's bots share the same Crossmint agent. Default metadata sent to `POST /agents`: `name = "Card Payment Agent"`, `description = "Default agent for card payments"` (Crossmint's own example values). Agent auto-created on first card save in the setup wizard; reused for every order intent that owner creates. Multi-agent-per-owner can be revisited later if dashboard attribution-per-bot becomes necessary.

### D-2 — Polling endpoints: **drop**
SDK's `onVerificationComplete` is fired by the server's flip to `active` — it's authoritative. Existing `/verification-status` and `/authorization-status` BFF routes are deleted. Tab-close-mid-ceremony recovery is the planned webhook's job (tracked in `rail3-open-points.md`).

### D-3 — Schema migration: **clean slate**
All four rail3 tables contain 0 rows. No data preservation. Drizzle `db:push --force` to drop+recreate the affected columns and add `rail3_agents`.

### D-4 — Merchant `countryCode`: **require upstream, fail loudly**
Crossmint requires `merchant.countryCode` (ISO-2) on every credential fetch. Matches the "explicit failure over silent fallback" preference. Bot checkout payload must carry merchant country; if missing, the bot endpoint 400s with `merchant_country_required`. No `"US"` default.

### D-5 — `CrossmintWalletProvider`: **omit**
Docs only include it in the wallet quickstart, with `createOnLogin` that auto-creates a wallet on mount — an unwanted side effect for card-only use. Card-permissions docs use only `CrossmintProvider` + the verification components. We wrap with `CrossmintProvider` + our `JwtSync` component; no wallet provider.

### D-6 — `PaymentMethodAgenticEnrollmentVerification` props: **full enrollment object**
Docs confirm exact signature: `enrollment={pendingEnrollment}` (full object, not just an id), `onVerificationComplete`, `onVerificationError`, optional `appearance`.

---

## Implementation plan (in order)

### Phase 0 — Console setup (owner action, 15 min)
1. Register Firebase as 3P auth provider in Crossmint **Staging** console (Settings → API Keys → JWT auth → 3P providers → Firebase → enter Firebase project ID, leave Verifier Id = `sub`).
2. Repeat for production console when ready.
3. Confirm `CROSSMINT_SERVER_API_KEY` and `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY` set for staging.

### Phase 1 — Backend rewrite (`features/payment-rails/rail3/`) (1.5 h)

Rewrite all four files against the real API surface.

`client.ts`:
- Base URL: `https://staging.crossmint.com/api/unstable` / `https://www.crossmint.com/api/unstable`.
- Drop `API_VERSION` constant.
- `crossmintCardsFetch(path, { method, body, userLocator })` — always appends `?userLocator=userId:<uid>` (or merges into existing query) when caller passes one.
- Accept `userLocator` as a required param on every user-scoped call.
- Keep `CrossmintApiError` + `unwrapCrossmint` helpers.

`agents.ts` (new):
- `createAgent({ userLocator, name, description? })` → POST `/agents` with `{ metadata: { name, description } }`. Returns `{ agentId, metadata }`.
- That's it. No `listAgents` / `deleteAgent` — one-per-owner forever; lifecycle handled by our DB row.

`paymentMethods.ts` (rename from `cards.ts`):
- `listPaymentMethods({ userLocator })` → GET `/payment-methods`. Return `data[]`. Owners have <10 cards in practice — no pagination at the client layer.
- `deletePaymentMethod({ userLocator, paymentMethodId })`.
- Drop `getPaymentMethod` (no such endpoint).
- Drop `getVerificationStatus` (status lives in enrollment resource).
- Keep `generateRail3CardId` / `generateRail3TransactionId` (internal IDs for our virtual card rows).

`agenticEnrollment.ts` (new):
- `getEnrollment({ userLocator, paymentMethodId })` → GET `/payment-methods/:id/agentic-enrollment`. Translate 404 to `{ status: "not_started" }`.
- `createEnrollment({ userLocator, paymentMethodId, email })` → POST same path with `{ email }`. Returns pending enrollment with `verificationConfig`.

`permissions.ts` (rewrite):
- Mandate types: `maxAmount | description | prompt` only.
- `buildMandates(input)`: same shape as quickstart. Open mode = yearly maxAmount ceiling + description.
- `createOrderIntent({ userLocator, agentId, paymentMethodId, mandates })` → POST `/order-intents` with `{ agentId, payment: { paymentMethodId }, mandates }`. Returns the full intent including `verificationConfig` when `phase === "requires-verification"`.
- `revokeOrderIntent({ userLocator, orderIntentId })` → DELETE.
- Drop `getOrderIntent` / `listOrderIntents` — our `rail3_cards` table is the index of intents we created.
- `OrderIntent` type updated to match real shape (`payment.paymentMethodId`, real phase enum, `verificationConfig` when applicable).

`credentials.ts`:
- Body wraps `{ merchant: { name, url, countryCode } }` (already correct).
- Response is `{ card: { number, expirationMonth, expirationYear, cvc }, expiresAt }` — rewrite our type, drop the merchant echo, drop expMonth/Year integer assumption.

`index.ts`: re-export the new surface.

### Phase 2 — Schema + storage changes (30 min)

- New table `rail3_agents (owner_uid PK, agent_id, created_at)`. Naming matches `rail{N}_{thing}` pattern used by rail5. No `name` column (Crossmint owns that).
- `rail3_payment_methods`: drop `agent_id` column (agent now lives in `rail3_agents`, owner-scoped). Drop `verification_status` column (read live from Crossmint's `agentic-enrollment` sub-resource on demand).
- `shared/schema.ts`: drop `agent_id` from `rail3SavePaymentMethodSchema` zod body.
- `rail3_cards`: no changes. `permission_phase` column already stores correct enum values.
- New storage fragment `server/storage/payment-rails/rail3-agents.ts` (`getRail3AgentByOwnerUid`, `createRail3Agent`); wire into `IStorage` + composer.
- Migration: Drizzle `db:push --force`. 0 rows in all rail3 tables, no data preservation.

### Phase 3 — BFF + bot routes (1.5 h)

Each BFF route resolves the owner from the Firebase session, derives `userLocator = "userId:" + firebase_uid`, and calls the rewritten client.

**Owner-facing BFF (`app/api/v1/rail3/`):**
- `GET /api/v1/rail3/agent` → returns owner's `rail3_agents` row or `null`.
- `POST /api/v1/rail3/agent` → creates Crossmint agent + stores row. Idempotent (returns existing row if present).
- `GET /api/v1/rail3/payment-methods` → list owner's PMs.
- `DELETE /api/v1/rail3/payment-methods/:id` → delete.
- `GET /api/v1/rail3/payment-methods/:id/enrollment` → returns enrollment status (server-side `getEnrollment`).
- `POST /api/v1/rail3/payment-methods/:id/enrollment` → starts enrollment (server-side; SDK component then verifies via passkey).
- `POST /api/v1/rail3/order-intents` → create (used by AddCardDialog). Returns full intent including `verificationConfig`.
- `DELETE /api/v1/rail3/order-intents/:id` → revoke (used when a virtual card row is deleted).
- `POST /api/v1/rail3/order-intents/:id/credentials` → fetch one-time PAN (gated by approvals; called by bot routes).

**Bot-facing routes (`app/api/v1/bot/rail3/*`) — internals must be rewired:**
External API shape stays the same, but every internal call to the rail3 client now passes `userLocator = "userId:" + owner_uid` (resolved from the bot → owner mapping). Files: `cards/route.ts`, `checkout/route.ts`, `confirm/route.ts`. Specifically:
- `cards/route.ts` — reads `agent_id` from `rail3_agents` (no longer from `rail3_payment_methods.agent_id`).
- `checkout/route.ts` + `confirm/route.ts` — credentials fetch uses the new `{ card: { number, ... } }` response shape; require `merchant.countryCode` in the bot payload (D-4).

**Delete old polling routes:** `payment-methods/:id/verification-status`, `cards/:id/authorization-status`.

### Phase 4 — Frontend providers + JWT bridge (20 min)

New `components/rail3/crossmint-providers.tsx`:
```tsx
"use client";
import { CrossmintProvider } from "@crossmint/client-sdk-react-ui";
import { JwtSync } from "./jwt-sync";
export function CrossmintProviders({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY required");
  return (
    <CrossmintProvider apiKey={apiKey}>
      <JwtSync />
      {children}
    </CrossmintProvider>
  );
}
```
No `CrossmintWalletProvider` — that's a wallets-quickstart construct that would auto-create a wallet on mount (per D-5).

New `components/rail3/jwt-sync.tsx`:
```tsx
"use client";
import { useEffect } from "react";
import { useCrossmint } from "@crossmint/client-sdk-react-ui";
import { useAuth } from "@/features/platform-management/auth/auth-context";
export function JwtSync() {
  const { user } = useAuth();
  const { setJwt } = useCrossmint();
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    user.getIdToken().then(t => { if (!cancelled) setJwt(t); });
    return () => { cancelled = true; };
  }, [user, setJwt]);
  return null;
}
```

Wrap dashboard + setup layouts in `<CrossmintProviders>`.

### Phase 5 — Setup wizard rewrite (`app/setup/rail3/page.tsx`) (1 h)

Five sequential steps matching the quickstart:

1. **Ensure agent.** Call `GET /api/v1/rail3/agent`. If null, show "Create agent" button → `POST /api/v1/rail3/agent`. Store `agentId` in component state.
2. **Save card.** Render `<CrossmintPaymentMethodManagement onPaymentMethodSaved={(pm) => onPmSaved(pm.paymentMethodId)} />`. On callback, re-list PMs via BFF.
3. **Start enrollment.** Server-side POST `/payment-methods/:id/agentic-enrollment` with the owner's email. Store the returned enrollment.
4. **Verify card (passkey).** Render `<PaymentMethodAgenticEnrollmentVerification enrollment={pendingEnrollment} appearance={verificationAppearance} onVerificationComplete={() => refetch()} onVerificationError={onErr} />`. On complete, enrollment status flips to `active` server-side.
5. **Done.** Redirect to `/virtual-cards`.

Delete the postMessage listener entirely.

### Phase 6 — AddCardDialog rewrite (`components/rail3/add-card-dialog.tsx`) (40 min)

Wizard:
- Step 1: select PM + mode (open / limited) + maxAmount + period + description/prompt + merchant info — unchanged.
- Step 2: submit → `POST /api/v1/rail3/order-intents` returns the full intent including `verificationConfig`.
- Step 3: if `intent.phase === "requires-verification"`, render `<OrderIntentVerification orderIntent={intent} appearance={verificationAppearance} onVerificationComplete={onAuthorized} onVerificationError={onErr} />`. On complete, persist the virtual card row in our DB with `permission_phase = active`.
- Step 4: success; close.

Delete polling.

### Phase 7 — Tenant theming (deferred)

Custom `verificationAppearance` skipped for v1; SDK defaults are fine. Revisit only if the verification modals visually clash with the CreditClaw shell.

### Phase 8 — End-to-end test on staging (1 h)

Test card `4242 4242 4242 4242`. Walk a fresh Firebase user through:
1. Land on `/setup/rail3`.
2. Create agent → POST /agents 201.
3. Save card → SDK iframe → onPaymentMethodSaved fires → BFF refetch returns the new PM.
4. Start enrollment → POST agentic-enrollment 200 with pending status.
5. Verify card → passkey modal → `onVerificationComplete` fires → enrollment GET now returns `active`.
6. Redirect to `/virtual-cards`. PM strip shows the card.
7. AddCard → submit mandate form → POST /order-intents returns `requires-verification` intent.
8. Passkey ceremony → `onVerificationComplete` → virtual card row persists with `permission_phase = active`.
9. Bot integration test: `POST /api/v1/bot/rail3/checkout` → POST /credentials returns one-time PAN.

### Phase 9 — Surface in nav (optional, separate task)

Flip sidebar "Virtual Cards" entry from `inactive: true` to active, fix path `/cards` → `/virtual-cards`. Add to onboarding wizard alongside Rail 5. Out of scope here.

---

## What stays the same (external shape) vs what changes internally

- Bot endpoints `/api/v1/bot/rail3/*` — **external shape unchanged**, internals fully rewired (see Phase 3).
- `features/agent-interaction/rail3-fulfillment.ts` (if present) — external behavior unchanged, internal calls to the rail3 client get the new signatures. Verify in Phase 1 and update.
- Approval gating semantics — unchanged.
- `payment-methods-strip.tsx` — needs an enrollment-status fetch per PM (since `verification_status` column is dropped). Use parallel `GET /api/v1/rail3/payment-methods/:id/enrollment` per row; <10 PMs in practice so N+1 is acceptable.

---

## Risks

- **`unstable` API surface.** Crossmint explicitly versions this surface as `unstable` and warns about breaking changes. Mitigation: pin a thin wrapper layer (already what `features/payment-rails/rail3/` is) and add a single staging-hitting integration test we run on a schedule to catch drift.
- **Per-owner Firebase email needed** for `POST /agentic-enrollment` body. Already available from the Firebase user record; just need to surface it in the BFF route.
- Items previously listed here (`CrossmintWalletProvider` side effects, enrollment prop shape, merchant `countryCode`) moved to the **TBD** section above.

---

## Estimated effort

| Phase | Hours |
|---|---|
| 0 — Console setup | 0.25 |
| 1 — Backend client rewrite | 1.5 |
| 2 — Schema + storage | 0.5 |
| 3 — BFF + bot routes | 1.5 |
| 4 — Providers + JWT bridge | 0.3 |
| 5 — Setup wizard | 1 |
| 6 — AddCardDialog + PM strip | 1 |
| 7 — Tenant theming | deferred |
| 8 — End-to-end test | 1 |
| **Total** | **~7 hours** |

Bigger than initially scoped because the backend was wrong, not just the frontend.

---

## Phase 2.5 — Rework: 1 Crossmint agent per bot (post-Phase 2/3, applied 2026-05-18)

Reversal of D-1 ("one agent per owner") after surfacing the Crossmint constraint that `agentId` is set at OrderIntent creation and immutable thereafter — so a virtual card is locked to one agent for life. Combined with the user-stated rail5 precedent (1 card ↔ 1 bot), the natural model is **1 Crossmint agent per CreditClaw bot**, auto-created lazily on first card-per-bot. Bot name → agent metadata so Crossmint dashboards show real bot identity.

### Schema changes (applied)
- `rail3_agents`: PK rekeyed from `owner_uid` → `bot_id`. Added `owner_uid` column (NOT NULL) + index for owner-scoped lookups. 0 rows in table, drop+recreate via direct psql ALTER (drizzle-kit push blocked on unrelated rail5_transactions_checkout_id_unique TTY prompt).
- `rail3_cards.bot_id`: NULL → NOT NULL. 0 rows, no backfill needed.
- `rail3CreateCardSchema.bot_id`: `.optional()` removed; now required on every card-create request.

### Storage changes
- Renamed `getRail3AgentByOwnerUid` → `getRail3AgentByBotId`.
- Added `deleteRail3AgentByBotId` (callable from a future bot-delete hook; no caller yet — explicitly out of scope per user "no unrequested scope").

### Route changes
- **Deleted** `app/api/v1/rail3/agent/route.ts` entirely. No more user-facing agent endpoint; agent creation is an implementation detail of card creation.
- `app/api/v1/rail3/cards/route.ts` POST: now requires `bot_id`, verifies bot ownership, then `getRail3AgentByBotId` → if missing calls `createAgent` with `bot.botName` + `bot.description || ${botType} for ${ownerEmail}` as Crossmint agent metadata, stores `rail3_agents` row, then proceeds with `createOrderIntent` using the per-bot agentId.

### UI changes
- `app/setup/rail3/page.tsx`: collapsed from 3 steps (agent → PM → enroll) to 2 (PM → enroll). Removed `ensureAgent` effect, `agentReady`/`agentError` state, Bot icon import.
- `components/rail3/add-card-dialog.tsx`: added required Bot picker (fetches `/api/v1/bots/mine` on open, defaults to first bot). New empty state when owner has 0 bots with CTA → `/bots`. `bot_id` now always sent on POST.

### Post-review fixes (architect, same session)
- **Race on lazy agent create**: `POST /api/v1/rail3/cards` wraps the `createRail3Agent` insert in a `code === "23505"` (unique_violation on `bot_id` PK) catch. Loser of the race re-reads the winner's row and orphans its just-created Crossmint agent (logged as warning). Better to waste one Crossmint agent than to 500 on concurrent card-create.
- **PATCH bot relink removed**: `app/api/v1/rail3/cards/[cardId]` PATCH schema no longer accepts `bot_id`. Since `OrderIntent.agentId` is immutable on Crossmint's side and our agent is bound 1:1 to a bot, relinking would strand the card on the wrong agent. To move a card to another bot: delete + recreate. Closed the IDOR-style gap (no ownership check on target bot_id was happening before this change).

### Out of scope (intentional)
- Bot-delete → Crossmint agent cleanup: no `DELETE /api/v1/bots/:id` route exists yet; when one is built, it should call `deleteRail3AgentByBotId` + `DELETE /agents/:agentId` on Crossmint. Noted; not built.
- Multi-card-per-bot UX hint ("create another virtual card on the same PM for a different bot"): not surfaced in copy. Add when first user asks.

### Migration applied
```sql
ALTER TABLE rail3_agents DROP CONSTRAINT rail3_agents_pkey;
ALTER TABLE rail3_agents DROP COLUMN owner_uid;
ALTER TABLE rail3_agents ADD COLUMN bot_id text NOT NULL;
ALTER TABLE rail3_agents ADD COLUMN owner_uid text NOT NULL;
ALTER TABLE rail3_agents ADD PRIMARY KEY (bot_id);
CREATE INDEX rail3_agents_owner_uid_idx ON rail3_agents(owner_uid);
ALTER TABLE rail3_cards ALTER COLUMN bot_id SET NOT NULL;
```

---

## Cross-references

- Operational doc: `rail3-crossmint-card-permissions.md`
- Open points (this plan resolves Q1, Q2; webhook + automated tests still open): `rail3-open-points.md`
- Historical plan: `rail3-virtual-cards-technical-plan.md`
