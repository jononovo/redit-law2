---
name: Rail 3 — Open Points Before End-to-End Works
description: Three known gaps between the current Rail 3 code and a working owner flow. Env vars are all set; backend compiles; UI ceremonies are unverified against live Crossmint. Hand this doc to whoever picks Rail 3 back up.
created: 2026-05-18
last_updated: 2026-05-18
status: in-process
---

# Rail 3 — Open Points

> All three Crossmint env vars are set (`CROSSMINT_SERVER_API_KEY`, `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY`, `CROSSMINT_WEBHOOK_SECRET`). Backend client + storage + API routes compile and run. The owner-facing ceremonies have **not** been live-tested end-to-end. Three real gaps before a real card can be vaulted and a virtual card can authorize.

---

## 1. Firebase → Crossmint JWT bridge is missing (biggest unknown)

### What the code does today
`app/setup/rail3/page.tsx` (step 1) and `components/rail3/add-card-dialog.tsx` (post-create) both load bare iframes:

```ts
// setup/rail3/page.tsx:114
`${iframeOrigin}/embed/save-payment-method?clientApiKey=${encodeURIComponent(clientKey)}`

// add-card-dialog.tsx:270
`${iframeOrigin}/embed/order-intent-verification?clientApiKey=${encodeURIComponent(clientKey)}&orderIntentId=${...}`
```

No `<CrossmintProvider>`, no `<CrossmintAuthProvider>`, no Firebase ID token passed. The iframe knows our public client key and nothing about *which user* is on the other end.

### Why this probably doesn't work
Crossmint Card Permissions scopes saved payment methods + order intents to a Crossmint user identity (passkey-backed). Two consequences if we don't bridge:
- A PM saved in step 1 won't be tied to the same Crossmint user that later runs `OrderIntentVerification` → authorization lands on the wrong account or fails outright.
- Cross-session continuity (return-visit flows, multi-tab) won't work because there's no anchor between Firebase UID and Crossmint user.

### Two ways to fix
**Option A — Use the React SDK with Firebase 3P auth (recommended in the original plan):**
1. Register Firebase as a 3P auth provider in Crossmint Console → API Keys → JWT authentication → 3P Auth providers → Firebase.
2. Replace the bare iframes with `<CrossmintProvider apiKey={NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY}>` wrapping the rail3 pages.
3. Add a small client component (`JwtSync`) that runs `crossmint.experimental_setJwt(await user.getIdToken())` on auth change and on token refresh.
4. Replace the iframes with the SDK's `CrossmintPaymentMethodManagement`, `PaymentMethodAgenticEnrollmentVerification`, `OrderIntentVerification` components.

**Option B — Anonymous client-key flow** (if Crossmint actually supports it for Card Permissions): confirm with Crossmint support; leave code as-is. Low probability based on docs.

### What to check first
Hit Crossmint support / docs and ask: "For Card Permissions, can `/embed/save-payment-method` be used with just a client API key, no JWT? Or is 3P auth required?" Their answer determines A vs B.

### Files to touch (Option A)
- `app/setup/rail3/page.tsx` — wrap in provider, swap iframe for `CrossmintPaymentMethodManagement` + `PaymentMethodAgenticEnrollmentVerification`.
- `components/rail3/add-card-dialog.tsx` — swap iframe for `OrderIntentVerification`.
- `app/(dashboard)/layout.tsx` (or a new shared provider component) — mount `CrossmintProvider` + `JwtSync` once for the whole dashboard so the dialog + page share it.
- New: `components/rail3/jwt-sync.tsx` — ~20 lines.
- npm: confirm `@crossmint/client-sdk-react-ui` is installed (`grep crossmint package.json`).

---

## 2. Verification step copy is wrong and the popup may never open

### What the code says
`app/setup/rail3/page.tsx` step 2 (line 161):
> "Crossmint is verifying your card. Check your email and complete the passkey ceremony in the popup that opened."

### What the code actually does
Nothing opens a popup. The wizard transitions to step 2 on receiving a `crossmint:paymentMethodSelected` postMessage, then polls `/api/v1/rail3/payment-methods/[pmId]/verification-status` waiting for `verification_status === active`.

### Why this is broken
- If Crossmint's `save-payment-method` iframe internally launches a passkey popup, the wording is fine and verification might actually advance — but we have no event handler to confirm it succeeded other than the polling status. **Untested.**
- If Crossmint expects a *separate* call to start verification (e.g. `PaymentMethodAgenticEnrollmentVerification` from the SDK), then step 2 will spin forever because we never trigger the ceremony.

### Fix path (depends on #1)
- If we move to Option A above, mount `<PaymentMethodAgenticEnrollmentVerification paymentMethodId={savedPm.payment_method_id} />` in step 2. It handles the passkey ceremony in-flow and emits an `onSuccess` we can use to mark verified — no polling.
- If we stay on bare iframes, we need to confirm what postMessage Crossmint emits when verification completes from inside `save-payment-method` (no docs cited; needs live test).
- Update copy either way.

### Files to touch
- `app/setup/rail3/page.tsx` — step 2 logic + copy.

---

## 3. Webhook secret is set but unused

### State
- `CROSSMINT_WEBHOOK_SECRET` is in env.
- No route at `app/api/v1/rail3/webhook/route.ts` (or anywhere that handles rail3 events).
- We rely on owner-side polling for both `verification-status` and `authorization-status`.

### Why it's not blocking
Polling is sufficient for the owner UI — both endpoints are dirt-cheap reads. Bot checkout doesn't need a webhook because it fetches credentials synchronously and reads `permission_phase` off our row.

### Why we might want it
- If Crossmint revokes a payment method or order intent server-side (e.g. issuer fraud signal, owner revokes via Crossmint dashboard), our `rail3_payment_methods.verification_status` and `rail3_cards.permission_phase` will drift out of sync silently. Bot checkout will still call Crossmint and get a clear error, so it fails closed — but the UI will show stale "active" state until the next poll.
- Crossmint may emit `paymentMethod.verified` and `orderIntent.authorized` events that would let us drop owner-side polling entirely.

### If we add it
- New route: `app/api/v1/rail3/webhook/route.ts` — verify HMAC against `CROSSMINT_WEBHOOK_SECRET`, switch on event type, update PM or card row.
- Register webhook URL in Crossmint Console.
- Remove or keep polling as backup.

Pattern to copy: `features/agent-interaction/procurement/crossmint-worldstore/webhook.ts` already verifies Crossmint webhook signatures for Rail 2 — same shape applies.

---

## Smaller items (not blocking, worth a glance)

- **`app/api/v1/rail3/transactions/`** — exists but not audited. Confirm it isn't a stale skeleton.
- **postMessage origin trust list** in `app/setup/rail3/page.tsx:41` only allows `www.crossmint.com` + `staging.crossmint.com`. Fine for prod but if Crossmint ever serves the iframe from a sub-origin (e.g. `embed.crossmint.com`), the listener silently drops the event.
- **No DB FK** on `rail3_cards.payment_method_id`. Application-enforced. Tracked in the operational doc.
- **PM eligibility surfacing** — wizard says "US-issued Visa/Mastercard, not Chase/Fidelity/etc." in static copy. No live check before save. If the user submits an ineligible card, Crossmint will reject inside the iframe and we'll just sit on step 1 with no error reaching our UI.

---

## Recommended order if you pick this up

1. Confirm 3P auth requirement with Crossmint (one email).
2. Implement #1 (JWT bridge) — unblocks #2 by default since the SDK component handles the ceremony.
3. Live-test setup wizard with a real US Visa. Adjust copy + error handling.
4. Live-test add-card dialog → order intent authorization → bot checkout (call `/api/v1/bot/rail3/checkout` with a real merchant URL, confirm one-time PAN comes back).
5. Decide on webhook based on whether polling is acceptable.

---

## Cross-references

- Operational doc: `project_knowledge/currently_building/rail3/rail3-crossmint-card-permissions.md`
- Original plan: `project_knowledge/currently_building/rail3/rail3-virtual-cards-technical-plan.md`
- Rail 2 webhook pattern (for #3): `features/agent-interaction/procurement/crossmint-worldstore/webhook.ts`
