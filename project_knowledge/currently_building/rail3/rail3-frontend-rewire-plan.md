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

### Auth model
- **Real:** Card Permissions endpoints are **user-scoped**. Two valid auth modes (from `list-payment-methods` reference):
  1. **JWT mode** — `X-API-KEY: <CLIENT_KEY>` + `Authorization: Bearer <jwt>`. JWT subject identifies the user. Used by the quickstart from the browser (via server actions for CORS only).
  2. **Server-key mode** — `X-API-KEY: <SERVER_KEY>` + `?userLocator=<type>:<value>` query param (e.g. `email:alice@example.com`, `userId:abc123`). Without `userLocator`, the server can't pick a user → 403.
- **Ours:** server key alone, no `userLocator`, no JWT. Will fail.
- **Decision needed:** see "Decision 1" below. Recommend **server-key + userLocator** so the BFF stays the single point of credential use; client never holds a JWT for Crossmint.

### Crossmint Console prerequisite
- **Required if we go JWT mode:** Console → JWT authentication → 3P Auth providers → add Firebase → enter Firebase project ID, set `Verifier Id = sub`. Once per env.
- **Required if we go server-key mode:** still useful to register Firebase so the SDK's verification components (which always sign-in via JWT) can authenticate the user inside the iframe.

### `userLocator` value
- Crossmint identifies users by stable identifier. Our owners are Firebase users. Options:
  - `userId:<firebase_uid>` — most stable, opaque.
  - `email:<firebase_user_email>` — readable but mutable.
- **Recommend `userId:<firebase_uid>`** (immutable). Pair with Crossmint Console 3P Firebase registration so JWT-mode and key-mode resolve to the same user record.

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
- "maxAmount" | "description" | "merchantAllowlist" | "merchantBlocklist"
+ "maxAmount" | "description" | "prompt"
// Allowlist/Blocklist are not in the public type. We'd be sending garbage Crossmint may reject.

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
- We need a new place for `agent_id` per owner (one agent reused across PMs; mirrors quickstart). Cheapest: a `rail3_owner_agent` table `(owner_id PK, agent_id, created_at)` so we don't pollute existing owner tables.
- `rail3_virtual_cards.permission_phase` — values need to match real enum (`requires-verification | active | expired`), not `pending_authorization | active | revoked`.

### Frontend mismatches

- `app/setup/rail3/page.tsx` loads `<iframe src=".../embed/save-payment-method">` — endpoint doesn't exist. Replace with `<CrossmintPaymentMethodManagement onPaymentMethodSaved={...} />`. No `agentId` prop.
- `components/rail3/add-card-dialog.tsx` loads `<iframe src=".../embed/order-intent-verification">` — endpoint doesn't exist. Replace with `<OrderIntentVerification orderIntent={createdIntent} appearance={…} onVerificationComplete onVerificationError />`. Needs the **full intent object**, not just the id.
- Missing entirely: agent creation step, agentic-enrollment verification step (the post-save passkey ceremony before a card is usable for agents). Use `<PaymentMethodAgenticEnrollmentVerification enrollment={pendingEnrollment} appearance={…} onVerificationComplete onVerificationError />`.
- Missing entirely: `CrossmintProvider` + `CrossmintWalletProvider` wrappers + a `JwtSync` component bridging Firebase `getIdToken()` → `useCrossmint().setJwt()`. Required even in server-key mode so the SDK iframe components can authenticate the user.

---

## Decision points (need owner sign-off before implementing)

**Decision 1 — Where do REST calls originate?**

- **Option A: Server-key + userLocator (recommended).** All Crossmint REST calls go through our existing BFF (`app/api/v1/rail3/*`). Server uses `CROSSMINT_SERVER_API_KEY` + `?userLocator=userId:<firebase_uid>`. Browser never holds a Crossmint JWT. Crossmint SDK components still need a JWT, but only for the verification iframes — bridged via `setJwt(firebaseIdToken)` once 3P Firebase is registered in Crossmint Console.
- **Option B: Client-key + Bearer JWT proxy.** Mirror the quickstart: server actions that take the Firebase ID token from the browser and forward to Crossmint with client key + Bearer. Slightly thinner backend, but token round-trips on every call and we lose centralized rate-limiting/logging.

Recommend **A**.

**Decision 2 — Where does `agentId` live?**

- **Option A: One agent per owner (recommended).** New `rail3_owner_agent` row. All order intents for that owner reuse it. Mirrors quickstart.
- **Option B: One agent per PM.** Today's `agent_id` column. Doesn't reflect how Crossmint models things and isn't necessary.
- **Option C: One agent per virtual card.** Most granular; useful only if we ever want per-card agent identities. Not needed.

Recommend **A**. Drop column from PM, add new owner-scoped table.

**Decision 3 — Drop polling endpoints?**

SDK verification components fire `onVerificationComplete` synchronously. We can drop the existing `/verification-status` and `/authorization-status` poll routes. Keep them only if we want a fallback for users who close the tab mid-ceremony (webhook would be cleaner — already in `rail3-open-points.md`).

Recommend **drop** for now, revisit with the webhook work.

**Decision 4 — Keep merchant allow/blocklist mandate support?**

We invented these mandate types. Not in the public quickstart types. Either:
- (a) drop them entirely (recommend), OR
- (b) ask Crossmint if they exist on a private API surface.

Recommend **drop**. Use `description` or `prompt` mandate text to express the same intent in a free-form field if needed.

---

## Implementation plan (in order)

### Phase 0 — Audit + Console setup (30 min, owner work)
1. Register Firebase as 3P auth provider in Crossmint **Staging** console (Settings → API Keys → JWT auth → 3P providers → Firebase → enter Firebase project ID, leave Verifier Id = `sub`).
2. Repeat for production console when ready.
3. Confirm `CROSSMINT_SERVER_API_KEY` is set in `.env` for staging.
4. Confirm `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY` is set (needed by SDK on the browser).

### Phase 1 — Backend rewrite (`features/payment-rails/rail3/`) (1.5 h)

Rewrite all four files against the real API surface.

`client.ts`:
- Base URL: `https://staging.crossmint.com/api/unstable` / `https://www.crossmint.com/api/unstable`.
- Drop `API_VERSION` constant.
- `crossmintCardsFetch(path, { method, body, userLocator })` — always appends `?userLocator=userId:<uid>` (or merges into existing query) when caller passes one.
- Accept `userLocator` as a required param on every user-scoped call.
- Keep `CrossmintApiError` + `unwrapCrossmint` helpers.

`agents.ts` (new):
- `createAgent({ userLocator, name, description? })` → POST `/agents` with `{ metadata: { name, description } }`.
- `listAgents({ userLocator })` → GET `/agents`.
- `deleteAgent({ userLocator, agentId })` → DELETE `/agents/:agentId`.

`paymentMethods.ts` (rename from `cards.ts`):
- `listPaymentMethods({ userLocator, limit?, cursor? })` → GET `/payment-methods`. Return `{ data, nextCursor }`.
- `deletePaymentMethod({ userLocator, paymentMethodId })`.
- Drop `getPaymentMethod` (no such endpoint).
- Drop `getVerificationStatus` (status lives in enrollment resource).
- Keep `generateRail3CardId` / `generateRail3TransactionId` (internal IDs for our virtual card rows).

`agenticEnrollment.ts` (new):
- `getEnrollment({ userLocator, paymentMethodId })` → GET `/payment-methods/:id/agentic-enrollment`. Translate 404 to `{ status: "not_started" }`.
- `createEnrollment({ userLocator, paymentMethodId, email })` → POST same path with `{ email }`. Returns pending enrollment with `verificationConfig`.

`permissions.ts` (rewrite):
- Mandate types: `maxAmount | description | prompt` only. Drop `merchantAllowlist`/`merchantBlocklist`.
- `buildMandates(input)`: same shape as quickstart. Open mode = yearly maxAmount ceiling + description.
- `createOrderIntent({ userLocator, agentId, paymentMethodId, mandates })` → POST `/order-intents` with `{ agentId, payment: { paymentMethodId }, mandates }`.
- `getOrderIntent({ userLocator, orderIntentId })` → there's no single-get in quickstart — use `listOrderIntents` and filter, or omit.
- `listOrderIntents({ userLocator })` → GET `/order-intents`.
- `revokeOrderIntent({ userLocator, orderIntentId })` → DELETE.
- `OrderIntent` type updated to match real shape (`payment.paymentMethodId`, real phase enum, `verificationConfig` when applicable).

`credentials.ts`:
- Body wraps `{ merchant: { name, url, countryCode } }` (already correct).
- Response is `{ card: { number, expirationMonth, expirationYear, cvc }, expiresAt }` — rewrite our type, drop the merchant echo, drop expMonth/Year integer assumption.

`index.ts`: re-export the new surface.

### Phase 2 — Schema + storage changes (45 min)

- New table `rail3_owner_agent (owner_id PK, agent_id, name, description?, created_at)`.
- `rail3_payment_methods`: drop `agent_id` column (or keep as nullable historical). Drop `verification_status` (or move to a denormalized `rail3_agentic_enrollments` table, see below).
- New optional table `rail3_agentic_enrollments (payment_method_id PK, enrollment_id?, status, updated_at)` for denormalized status. Or — simpler — don't store it, always re-read on demand.
- `rail3_virtual_cards.permission_phase` enum: `requires_verification | active | expired` (rename from `pending_authorization | active | revoked`). Drizzle migration.
- Storage fragment `server/storage/rail3-owner-agent.ts` for the new agent record.

### Phase 3 — BFF routes (`app/api/v1/rail3/`) (1 h)

Each BFF route resolves the owner from the Firebase session, derives `userLocator = "userId:" + firebase_uid`, and calls the rewritten client. Routes needed:

- `GET /api/v1/rail3/agent` → returns owner's `agent` row or null.
- `POST /api/v1/rail3/agent` → creates Crossmint agent + stores row.
- `DELETE /api/v1/rail3/agent` → deletes Crossmint agent + drops row (optional).
- `GET /api/v1/rail3/payment-methods` → list (proxy + pagination).
- `DELETE /api/v1/rail3/payment-methods/:id` → delete.
- `GET /api/v1/rail3/payment-methods/:id/enrollment` → returns enrollment status.
- `POST /api/v1/rail3/payment-methods/:id/enrollment` → starts enrollment (server-side; the SDK component then verifies the returned `enrollmentId` + `verificationConfig` via passkey on the browser).
- `POST /api/v1/rail3/order-intents` → create (used by AddCardDialog). Returns the **full** intent including `verificationConfig`.
- `DELETE /api/v1/rail3/order-intents/:id` → revoke (used when a virtual card row is deleted).
- `POST /api/v1/rail3/order-intents/:id/credentials` → fetch one-time PAN (bot-facing, gated by approvals).

Delete old polling routes: `verification-status`, `authorization-status`.

### Phase 4 — Frontend providers + JWT bridge (20 min)

New `components/rail3/crossmint-providers.tsx`:
```tsx
"use client";
import { CrossmintProvider, CrossmintWalletProvider } from "@crossmint/client-sdk-react-ui";
import { JwtSync } from "./jwt-sync";
export function CrossmintProviders({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY required");
  return (
    <CrossmintProvider apiKey={apiKey}>
      <CrossmintWalletProvider>
        <JwtSync />
        {children}
      </CrossmintWalletProvider>
    </CrossmintProvider>
  );
}
```

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

**Risk:** `CrossmintWalletProvider` may try to auto-create a wallet on mount. Quickstart includes it because it's also a wallets demo. If it triggers unwanted side effects for card-only use, remove it. Verify in Phase 0.

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

### Phase 7 — Tenant theming (15 min)

`components/rail3/verification-appearance.ts`:
```ts
export const verificationAppearance = {
  variables: {
    fontFamily: "var(--font-jakarta), system-ui, sans-serif",
    fontSizeUnit: "14px",
    spacingUnit: "16px",
    borderRadius: "1rem",
    colors: { accent: "#f97316", backgroundPrimary: "#ffffff" },
  },
} as const;
```

Pass to both verification components.

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

## What stays the same

- Bot endpoints `/api/v1/bot/rail3/*` keep their shape (internally call the new BFF or directly the new client with `userLocator` resolved from approver/owner).
- `rail3-fulfillment.ts` and approvals integration — unchanged.
- `payment-methods-strip.tsx` — minor: read PM list from new `GET /payment-methods` route, render the same way.
- Approval gating semantics unchanged.

---

## Risks / unknowns

- **`unstable` API surface.** Crossmint warns about breaking changes. We should pin a wrapper version and add a single integration test that hits staging weekly to catch drift.
- **`CrossmintWalletProvider` side effects.** Verify in Phase 0 — may need to omit for card-only use.
- **`PaymentMethodAgenticEnrollmentVerification` prop signature.** Customize-UI doc confirms it exists and accepts `appearance`. The `enrollment` prop shape (id vs full object) is inferred from the quickstart but not in the public docs. Phase 0 reads the .d.ts.
- **Merchant `countryCode` requirement.** Quickstart marks it required on the credentials call. Our schema doesn't store merchant country today; we'd need it from the bot's checkout payload or default to `"US"`.
- **Per-owner Firebase email** — needed for `POST /agentic-enrollment` body. We have it from Firebase user record; ensure available in BFF route.

---

## Estimated effort

| Phase | Hours |
|---|---|
| 0 — Console + audit | 0.5 |
| 1 — Backend client rewrite | 1.5 |
| 2 — Schema + storage | 0.75 |
| 3 — BFF routes | 1 |
| 4 — Providers + JWT bridge | 0.3 |
| 5 — Setup wizard | 1 |
| 6 — AddCardDialog | 0.7 |
| 7 — Tenant theming | 0.25 |
| 8 — End-to-end test | 1 |
| **Total** | **~7 hours** |

Bigger than initially scoped because the backend was wrong, not just the frontend.

---

## Cross-references

- Operational doc: `rail3-crossmint-card-permissions.md`
- Open points (this plan resolves Q1, Q2; webhook + automated tests still open): `rail3-open-points.md`
- Historical plan: `rail3-virtual-cards-technical-plan.md`
