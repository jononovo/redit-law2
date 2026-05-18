---
name: Rail 3 — Frontend Rewire to Real Crossmint SDK
description: Plan to replace the invented `/embed/*` iframes with the actual `@crossmint/client-sdk-react-ui` components and Firebase BYO-auth bridge per Crossmint's Card Permissions docs. Also fixes the missing "create agent" step and verifies the backend REST endpoint paths.
created: 2026-05-18
last_updated: 2026-05-18
status: plan
---

# Rail 3 — Frontend Rewire to Real Crossmint SDK

> The current frontend loads `https://www.crossmint.com/embed/save-payment-method?...` which returns 404 — that endpoint doesn't exist. Crossmint ships React components for this exact flow. SDK (`@crossmint/client-sdk-react-ui@2.6.15`) is already installed. We also missed a required step: **create an `agentId`** before any payment method can be saved. This plan rewires the frontend, adds the agent-creation step, and verifies the backend REST calls against Crossmint's real API surface.

---

## Source of truth

- Bring Your Own Auth (Firebase): https://docs.crossmint.com/wallets/guides/bring-your-own-auth
- Cards Quickstart: https://docs.crossmint.com/agents/cards-quickstart
- Customize Verification UI: https://docs.crossmint.com/agents/payment-methods/cards/customize-verification-ui
- Reference repo (Stytch-based, structure identical to what we need with Firebase): https://github.com/Crossmint/card-permissions-quickstart
- Live demo: https://card-permissions-quickstart.vercel.app/

---

## Current state (what's broken)

| Area | Today | What it should be |
|---|---|---|
| Auth bridge | None. No `CrossmintProvider`, no `setJwt`, no 3P config in Crossmint Console. | `CrossmintProvider` + `CrossmintWalletProvider` wrap dashboard; tiny `JwtSync` component calls `setJwt(firebaseIdToken)` on auth change. Firebase registered in Crossmint Console → JWT auth → 3P. |
| Save card UI | `<iframe src=".../embed/save-payment-method?clientApiKey=…">` → **404**. | `<CrossmintPaymentMethodManagement />` SDK component. |
| Verify card UI | Step 2 copy claims "complete the passkey ceremony in the popup that opened." No popup. Wizard just polls. | `<PaymentMethodAgenticEnrollmentVerification paymentMethodId>` SDK component with `onVerificationComplete`. |
| Authorize orderIntent | `<iframe src=".../embed/order-intent-verification?...">` → also 404. | `<OrderIntentVerification orderIntent>` SDK component with `onVerificationComplete`. |
| Agent creation | **Missing entirely.** Setup wizard expects `agentId` to arrive via postMessage from the fictional iframe. It never arrives. | Explicit "Create agent" step (or auto-create one per owner on first save). `POST /agents` via Crossmint REST → store `agentId` either on owner or on PM row. |
| Backend REST paths | `client.ts` hits `crossmint.com/api/2025-06-09/payment-methods/{id}` and `/order-intents/{id}/credentials`. **Unverified.** | Cross-reference against actual Crossmint API endpoints; the reference repo's `lib/crossmint-api` is the canonical sample. |
| Polling | We poll `/verification-status` and `/authorization-status` every few seconds. | SDK components fire `onVerificationComplete` synchronously. Drop polling, or keep as a webhook fallback. |

---

## Proposed architecture

```
app/
  (dashboard)/
    layout.tsx                                ← wrap children in Crossmint providers + JwtSync
  setup/rail3/page.tsx                        ← rewrite: agent (if none) → save card → verify card
  setup/rail3/components/
    agent-step.tsx                            ← create-agent button + status
    save-card-step.tsx                        ← <CrossmintPaymentMethodManagement>
    verify-card-step.tsx                      ← <PaymentMethodAgenticEnrollmentVerification>

components/
  rail3/
    crossmint-providers.tsx                   ← <CrossmintProvider><CrossmintWalletProvider><JwtSync>…
    jwt-sync.tsx                              ← effect: setJwt(await user.getIdToken()) on auth change
    add-card-dialog.tsx                       ← keep shell; swap iframe → <OrderIntentVerification>
    payment-methods-strip.tsx                 ← unchanged

features/payment-rails/rail3/
  client.ts                                   ← verify base URL + API version
  paymentMethods.ts                           ← verify endpoint paths
  permissions.ts                              ← verify endpoint paths
  credentials.ts                              ← verify endpoint paths
  agents.ts                                   ← NEW: createAgent, listAgents, deleteAgent
```

---

## Open questions to answer **before** writing code

1. **Where does `agentId` live in our model?**
   Options:
   - (a) One agent per owner — store on a new `rail3_owner` row or just memoize the most recent agentId on the owner record.
   - (b) One agent per PM — keep `agent_id` on `rail3_payment_methods` (current schema).
   - (c) One agent per virtual card — would let owner give each card a different agent identity.

   Quickstart uses (a) — single agent reused across cards. Simplest. Recommend (a) unless we have a reason to differentiate.

2. **Should we keep the polling status endpoints?**
   - The SDK fires `onVerificationComplete` so we know in real time on the same tab.
   - Polling is still useful if the owner has the tab open across a passkey ceremony interruption, but is optional. Recommend: drop polling, rely on SDK callback, surface a "Refresh" button if anything looks stuck.

3. **Webhook?** Already covered in `rail3-open-points.md` — defer. SDK callbacks plus on-demand REST reads are enough for the owner UI.

4. **Do our backend REST paths actually match Crossmint's API?**
   Need to verify against the quickstart's `lib/crossmint-api.ts` (or equivalent OpenAPI). Specifically:
   - `GET /payment-methods/{id}` — do we get back `{ paymentMethodId, agentId, brand, last4, expMonth, expYear, cardholderName, verificationStatus }` exactly?
   - `POST /order-intents/{id}/credentials` — is the body `{ merchant: { name, url, countryCode } }`?
   - `POST /agents` — exists? what's the body?
   - `POST /payment-methods/{id}/verify` — separate call? or is verification a pure SDK passkey flow with no REST companion?
   - `DELETE /payment-methods/{id}` — supported? required scope?

5. **Does verification of the card create the agent association, or does the agent need to exist first?**
   Per quickstart flow: agent first, then card save, then enrollment verification. Card save returns a `paymentMethodId` already linked to the agentId in the SDK call.

6. **Does `CrossmintPaymentMethodManagement` take the `agentId` directly or via context?**
   Need to read the component's prop signature (only exported type is `CrossmintPaymentMethodManagementProps` from `@crossmint/client-sdk-base`). Quick `cat` of the .d.ts in the next session.

7. **Crossmint Console — Firebase 3P registration.**
   Owner action required, not code. Steps: Console → API Keys → JWT authentication → 3P Auth providers → Firebase → enter Firebase project ID → save. One-time setup per environment (staging + prod). Document in `replit.md` user-actions or `.env.example`.

---

## Implementation steps (in order)

### Phase 0 — Verify
1. `cat node_modules/@crossmint/client-sdk-base/dist/types/payment-method-management/*.d.ts` — read `CrossmintPaymentMethodManagementProps` exactly so we know required props (agentId? onSuccess shape? appearance?).
2. Open the live quickstart demo, inspect network calls to confirm Crossmint REST paths + payloads. Adjust `features/payment-rails/rail3/*.ts` to match.
3. Confirm Firebase 3P registration is configured in Crossmint Console for our staging project. If not, do it before testing.

### Phase 1 — Auth bridge (one-time setup)
Files: new `components/rail3/crossmint-providers.tsx`, new `components/rail3/jwt-sync.tsx`, modified `app/(dashboard)/layout.tsx`.

```tsx
// components/rail3/crossmint-providers.tsx
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

```tsx
// components/rail3/jwt-sync.tsx
"use client";
import { useEffect } from "react";
import { useCrossmint } from "@crossmint/client-sdk-react-ui";
import { useAuth } from "@/features/platform-management/auth/auth-context";

export function JwtSync() {
  const { user } = useAuth();
  const { setJwt } = useCrossmint();
  useEffect(() => {
    if (!user) { setJwt(undefined); return; }
    let cancelled = false;
    user.getIdToken().then((t) => { if (!cancelled) setJwt(t); });
    return () => { cancelled = true; };
  }, [user, setJwt]);
  return null;
}
```

Wrap dashboard children in `<CrossmintProviders>`. Setup pages live in `app/setup/` — wrap there too (or extract a shared `(authenticated)` group layout).

### Phase 2 — Agents API
Files: new `features/payment-rails/rail3/agents.ts`, new `app/api/v1/rail3/agents/route.ts`.

- Backend helpers: `createAgent(name, description)`, `listAgents()`, `deleteAgent(agentId)`.
- API endpoints owner-authed via existing middleware.
- Store reference on owner record (likely a new `rail3_owner_agents` row, or simplest: store the most recent agentId on the owner's row in an existing user/owner table — confirm during phase 0).
- If we go owner-scoped, expose a single `GET /api/v1/rail3/agent` returning current agentId or null, and `POST` to create.

### Phase 3 — Setup wizard rewrite
Files: `app/setup/rail3/page.tsx`.

New step sequence:
1. **Ensure agent.** Load owner's agent; if none, show "Create agent" button → POST → store agentId.
2. **Save card.** `<CrossmintPaymentMethodManagement agentId={agent.agentId} onSuccess={onPmSaved} />`. On success, `POST /api/v1/rail3/payment-methods` to persist the row.
3. **Verify card.** `<PaymentMethodAgenticEnrollmentVerification paymentMethodId={pm.id} appearance={ourTheme} onVerificationComplete={onVerified} onVerificationError={onErr} />`. On success, mark PM `verification_status = active` (either via SDK callback firing `PATCH /api/v1/rail3/payment-methods/{id}` or by trusting the next read from Crossmint which we already do via `getVerificationStatus`).
4. Redirect to `/virtual-cards`.

Delete:
- The fake iframe block.
- The `crossmint:paymentMethodSelected` postMessage listener.
- Step 2 copy about "popup" — replace with the SDK modal.
- Polling fallback (or keep as a hidden safety net behind a feature flag).

### Phase 4 — AddCardDialog rewrite
Files: `components/rail3/add-card-dialog.tsx`.

Post-create step (currently `<iframe src=".../embed/order-intent-verification">`):
- Replace with `<OrderIntentVerification orderIntent={createdOrderIntent} appearance={ourTheme} onVerificationComplete={onAuthorized} onVerificationError={onErr} />`.
- The component needs the **full `OrderIntent` object** (type from `@crossmint/client-sdk-base`), not just the `orderIntentId`. That means our `POST /api/v1/rail3/cards` response must include the Crossmint orderIntent object verbatim, not just the id. Update `app/api/v1/rail3/cards/route.ts` accordingly.
- Drop the polling loop on `authorization-status`.

### Phase 5 — Tenant theming for verification modals
Files: shared `appearance` object passed to both verification components.

CreditClaw uses Plus Jakarta Sans + pastel oranges + 1rem radius. Define once:

```ts
// components/rail3/verification-appearance.ts
export const verificationAppearance = {
  variables: {
    fontFamily: "var(--font-jakarta), system-ui, sans-serif",
    fontSizeUnit: "14px",
    spacingUnit: "16px",
    borderRadius: "1rem",
    colors: {
      accent: "#f97316",            // orange-500
      backgroundPrimary: "#ffffff",
    },
  },
} as const;
```

Pass to both `<PaymentMethodAgenticEnrollmentVerification>` and `<OrderIntentVerification>`.

### Phase 6 — Backend REST verification + cleanup
Files: `features/payment-rails/rail3/{client.ts, paymentMethods.ts, permissions.ts, credentials.ts}`.

- Adjust API base path and version if Phase 0 revealed mismatches.
- Confirm `X-API-KEY` is the right header (it is per docs, but verify the value format — staging keys are `ck_staging_...`).
- Remove now-unused polling endpoints OR leave them as a fallback for when the SDK callback misses (e.g. user closes the tab mid-ceremony).

### Phase 7 — Console config + env doc
- Register Firebase as 3P auth in Crossmint Staging + Prod consoles (one-time owner action).
- Add to `.env.example` (or `replit.md` user-actions section): `NEXT_PUBLIC_CROSSMINT_ENV=staging|production`, plus a note that the Crossmint Console must have Firebase 3P configured for the same project.

### Phase 8 — Test end-to-end on staging
1. Sign in on creditclaw tenant.
2. Navigate to `/setup/rail3`.
3. Create agent → save 4242 4242 4242 4242 test card → complete passkey ceremony.
4. Land on `/virtual-cards` with one verified PM in the strip.
5. "+ Add Virtual Card" → wizard → submit → passkey ceremony → card `permission_phase` = active.
6. Bot integration test: hit `POST /api/v1/bot/rail3/checkout` with a test merchant → confirm one-time PAN returned.

### Phase 9 — Surface in nav (separate optional task)
- Flip sidebar "Virtual Cards" entry from `inactive: true` to active and fix path `/cards` → `/virtual-cards`.
- Consider adding Rail 3 to the main onboarding wizard alongside Rail 5.
- Out of scope for this plan; track separately.

---

## What stays the same

- `shared/schema.ts` rail3 tables (PMs + cards).
- All `server/storage/payment-rails/rail3*` storage code.
- All bot endpoints (`/api/v1/bot/rail3/*`).
- `rail3-fulfillment.ts` and approvals integration.
- `payment-methods-strip.tsx`.
- The intent-optional helper `buildMandates()` and the open/limited modes.
- DELETE semantics (PM blocked when cards exist, card deletes revoke only its orderIntent).

Backend stays. Owner-facing frontend gets rewired around real SDK components plus a missing agent-creation step.

---

## Estimated effort

| Phase | Effort |
|---|---|
| 0 — Verify SDK + REST | 30 min |
| 1 — Auth bridge | 20 min |
| 2 — Agents API + storage | 45 min (depends on Q1) |
| 3 — Setup wizard rewrite | 45 min |
| 4 — AddCardDialog rewrite | 30 min |
| 5 — Tenant theming | 15 min |
| 6 — Backend REST fixes | 15–60 min (depends what's wrong) |
| 7 — Console + env doc | 10 min |
| 8 — Live test + fixes | 30–60 min |
| **Total** | **~4 hours** if no surprises, up to ~6 if backend REST needs major adjustments |

---

## Risks / unknowns

- **Backend REST paths may be substantially wrong.** If `paymentMethods.ts` and `permissions.ts` were also written speculatively, they could be hitting endpoints that don't exist. Phase 0 surfaces this; Phase 6 fixes it. Worst case: rewrite half the backend client. Mitigation: clone the reference repo locally first and diff its `lib/crossmint-api.ts` against ours.
- **`CrossmintWalletProvider` may force unwanted wallet creation.** The Firebase BYO-auth doc wraps in `CrossmintWalletProvider` because the doc example creates a wallet next. For Card Permissions specifically, we may not need it. If it pulls in unwanted UI or auto-creates a wallet, replace with a lighter wrapper or omit. Check during Phase 0.
- **Agent storage choice (Q1)** affects how many files Phase 2 touches. (a) is one new column on an existing owner table; (b) is what we have today; (c) is a schema change. Recommend (a).
- **Crossmint staging may have rate limits or test-card restrictions** that won't surface until Phase 8.

---

## Cross-references

- Operational doc: `project_knowledge/currently_building/rail3/rail3-crossmint-card-permissions.md`
- Open points (this plan resolves the first two): `project_knowledge/currently_building/rail3/rail3-open-points.md`
- Original plan (historical): `project_knowledge/currently_building/rail3/rail3-virtual-cards-technical-plan.md`
