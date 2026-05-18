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
- "maxAmount" | "description" | "merchantAllowlist" | "merchantBlocklist"
+ "maxAmount" | "description" | "prompt"
// merchantAllowlist/Blocklist were invented — zero presence in Crossmint docs or quickstart types.
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
- We need a new place for `agent_id` per owner (one agent reused across PMs; mirrors quickstart). Cheapest: a `rail3_owner_agent` table `(owner_id PK, agent_id, created_at)` so we don't pollute existing owner tables.
- `rail3_virtual_cards.permission_phase` — values need to match real enum (`requires-verification | active | expired`), not `pending_authorization | active | revoked`.

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

## TBD — open decisions blocking implementation

These need an answer before Phase 1+ can start. Listed in order of how much they reshape the plan.

### TBD-1 — Where does `agentId` live?
Options:
- **(a)** One agent per owner. New `rail3_owner_agent` table. Mirrors quickstart. Simplest.
- **(b)** One agent per PM. Keep today's `agent_id` column. Doesn't reflect how Crossmint models things.
- **(c)** One agent per virtual card. Most granular; useful only if we ever want per-card agent identities visible in Crossmint dashboard.

Agent metadata (`name` / `description` for `POST /agents`) also undecided. Quickstart uses `"Card Payment Agent"` / `"Default agent for card payments"`. Could mirror or use CreditClaw-branded values.

### TBD-2 — Polling endpoints: keep or drop?
SDK fires `onVerificationComplete` synchronously, so polling is redundant on the happy path. Question is whether to keep `/verification-status` and `/authorization-status` as a fallback for users who close the tab mid-ceremony, or drop them now and rely on the planned webhook (tracked in `rail3-open-points.md`).

### TBD-4 — Schema migration posture
Plan currently calls for dropping `rail3_payment_methods.agent_id`, dropping `verification_status`, renaming `permission_phase` enum values. Are there existing rows in those tables to preserve, or is this a clean-slate refactor (drop + recreate)?

### TBD-5 — Merchant `countryCode` default
Crossmint requires `merchant.countryCode` on `POST /order-intents/:id/credentials`. Our bot checkout payload may not always carry it. Default to `"US"` for unknown merchants, or fail loudly and require it upstream?

### TBD-6 — `CrossmintWalletProvider` necessity
Quickstart wraps in `CrossmintWalletProvider` because it's also a wallets demo. For Card Permissions only, may not be needed. If it auto-creates a wallet on mount, we'd have an unwanted side effect. Phase 0 reads SDK source to verify; if not needed, omit.

### TBD-7 — `PaymentMethodAgenticEnrollmentVerification` prop shape
Customize-UI doc confirms the component exists and accepts `appearance`. The `enrollment` prop shape (id vs full object with `verificationConfig`) is inferred from the quickstart, not stated in public docs. Phase 0 reads the .d.ts to confirm.

---

## Implementation plan (in order)

### Phase 0 — Console setup + SDK verification (30 min)
1. Register Firebase as 3P auth provider in Crossmint **Staging** console (Settings → API Keys → JWT auth → 3P providers → Firebase → enter Firebase project ID, leave Verifier Id = `sub`). Owner action.
2. Repeat for production console when ready. Owner action.
3. Confirm `CROSSMINT_SERVER_API_KEY` and `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY` set for staging.
4. Read SDK .d.ts files to resolve **TBD-6** (`CrossmintWalletProvider` necessity) and **TBD-7** (`PaymentMethodAgenticEnrollmentVerification` prop shape).

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
- Mandate types: `maxAmount | description | prompt` only.
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

## Risks

- **`unstable` API surface.** Crossmint explicitly versions this surface as `unstable` and warns about breaking changes. Mitigation: pin a thin wrapper layer (already what `features/payment-rails/rail3/` is) and add a single staging-hitting integration test we run on a schedule to catch drift.
- **Per-owner Firebase email needed** for `POST /agentic-enrollment` body. Already available from the Firebase user record; just need to surface it in the BFF route.
- Items previously listed here (`CrossmintWalletProvider` side effects, enrollment prop shape, merchant `countryCode`) moved to the **TBD** section above.

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
