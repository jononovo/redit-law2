# Rail 3 — Staging Migration Plan & Current Status

**Goal:** Move all Crossmint integration (Rails 2 + 3) onto a separate Crossmint **staging** project, prove the full Rail 3 (Card Permissions) flow end-to-end there, then flip back to a production project with the `cardPaymentMethod` addon enabled.

**Driver:** Crossmint support told us to validate the full flow in staging before they enable the production `cardPaymentMethod` addon on our production project.

---

## Status snapshot — what's done

- ✅ Sidebar entry "Virtual Cards" → `/virtual-cards`, visible to all owners (`components/dashboard/sidebar.tsx:51`).
- ✅ Setup wizard live at `/setup/rail3` (`app/setup/rail3/page.tsx`), Firebase→Crossmint JWT bridge wired (`components/rail3/crossmint-provider.tsx`).
- ✅ Server-side agent + order-intent + payment-method API routes (`app/api/v1/rail3/`), backed by `features/payment-rails/rail3/` (createAgent, createOrderIntent, buildMandates, etc.).
- ✅ `CROSSMINT_ENV=staging|prod` toggle wired in both rails: `features/payment-rails/rail3/client.ts:4` and `features/payment-rails/rail2/client.ts:10`. Flipping the env var switches the base URL — no code change needed.
- ✅ Docs cleaned up: speculative inbound Crossmint webhook event names removed from all rail3 docs (we only have the outbound `rails.updated` bot webhook).
- ✅ Card eligibility copy in wizard verified against `docs.crossmint.com/agents/payment-methods/cards/enroll-card`.

## Status snapshot — what's blocked

- 🚫 **Production `cardPaymentMethod` addon not enabled** on Crossmint project `01c18166-ca9d-4759-8116-545600d32278`. Calling `payment-methods.create` returns: *"Project addon required. Your Crossmint project requires the cardPaymentMethod addon."*
- 🚫 Crossmint support's instruction: prove the flow in staging first, then they'll enable the prod addon.

---

## Crossmint env vars — current shape

These env vars are referenced in code today:

| Var | Used by | Notes |
|---|---|---|
| `CROSSMINT_ENV` | `features/payment-rails/{rail2,rail3}/client.ts` | `"staging"` → `staging.crossmint.com/api/…`. Unset/anything else → `www.crossmint.com/api/…`. |
| `CROSSMINT_SERVER_API_KEY` | Rail 2 (`rail2/client.ts:16`) + Rail 3 (`rail3/client.ts:10`) server-side | Single server key, shared by both rails. |
| `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY` | Rail 3 provider (`components/rail3/crossmint-provider.tsx:48`) + Rail 2 card-wallet (`app/(dashboard)/card-wallet/page.tsx:462`) | Single client key, shared by both rails. |
| `CROSSMINT_WEBHOOK_SECRET` | Rail 2 inbound webhook (`app/api/v1/card-wallet/webhooks/crossmint/route.ts:10`) | Per-endpoint signing secret. |

**Key observation:** the same two keys serve both rails. Flipping to staging keys flips both rails together — which is fine because the goal is to move the whole Crossmint integration to staging.

---

## Migration plan — step by step

### 1. Provision the Crossmint staging project (Crossmint console — no code)

1. In Crossmint Console, switch to **Staging** (top-right env toggle).
2. Create a new project (or reuse an existing staging one). Note the staging **Project ID**.
3. Confirm staging includes Card Permissions out-of-the-box. Staging projects typically have all addons enabled by default — Crossmint support confirmed we should test there.

### 2. Provision staging API keys (Crossmint console — no code)

For both a **client key** and a **server key**, configure these scopes (combined Rail 2 + Rail 3 set):

**Wallets (Rail 2):** `wallets.read`, `wallets:transactions.read`, `wallets:balance.read`, `wallets.fund`
**Orders (Rail 2):** `orders.create`, `orders.ws.create`, `orders.ws.search`
**Tokens (Rail 2):** `tokens.read`
**Payment Methods (Rail 3):** `payment-methods.read`, `payment-methods.create`, `payment-methods.update`, `payment-methods.delete`
**Order Intents (Rail 3):** `order-intents.read`, `order-intents.create`, `order-intents.credentials` *(+ `order-intents.revoke` on the server key only)*
**Agents (Rail 3):** `agents.read` *(+ `agents.create`, `agents.delete` on the server key only)*
**Users (server key only):** `users.read`, `users.create`

**JWT Auth (both keys):** Enable. Mode = **3P Auth providers → Firebase**. Paste the Firebase project ID from Firebase Console → Project Settings → General.

**Client key allowed origins:** add `creditclaw.com`, your Replit preview host (e.g. `*.replit.dev`), and `localhost:5000`.

### 3. Provision staging webhook endpoint (Crossmint console — no code yet)

- Skip for now. Rail 3 doesn't depend on inbound Crossmint webhooks, and Rail 2 inbound webhooks aren't on the critical path for the Card Permissions test.
- If the staging Event Catalog now shows `payment-methods.*` / `order-intents.*` / `agents.*` event types (it should once the staging project has Card Permissions), record what's available for future reference — don't subscribe yet.

### 4. Add staging env vars (Replit Secrets — no code)

Set the following on the Replit dev environment:

```
CROSSMINT_ENV=staging
CROSSMINT_SERVER_API_KEY=sk_staging_…   (from step 2)
NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY=ck_staging_…   (from step 2)
```

Leave `CROSSMINT_WEBHOOK_SECRET` as-is (or unset) — not needed for the test.

Restart the `Start application` workflow so Next.js picks up the new client-side env var.

**No code change required.** The `CROSSMINT_ENV` toggle and the existing env var names cover the whole migration.

### 5. End-to-end smoke test on staging

On dev (`localhost:5000` or the Replit preview URL), signed in as a Firebase user:

1. Visit `/setup/rail3` → confirm the `CrossmintPaymentMethodManagement` iframe loads (no 403, no scope errors, no "addon required" errors).
2. Save a card. Use a Crossmint test card (check their docs — they publish test PANs for staging) or, if staging accepts real cards, use a low-limit real card and immediately revoke.
3. Complete the `PaymentMethodAgenticEnrollmentVerification` ceremony (passkey on phone/laptop). Confirm card status flips to verified.
4. Create one virtual card / order intent via the wizard for a real bot. Inspect the returned credentials (PAN/CVV/exp).
5. Trigger a tiny test charge from that virtual card (any merchant that accepts test charges, or a $0.01 auth). Confirm Crossmint shows the transaction tied to the right `order-intent`.
6. Revoke the order intent from the UI or via the server-side revoke endpoint. Confirm Crossmint reflects the revocation.

### 6. Document gaps / surprises (this doc, "Findings" section below)

As the smoke test runs, note any:
- Endpoint behavior that differs from the technical plan
- Required scopes we missed
- Inbound webhook events that turned out to be necessary
- JWT auth quirks (token refresh timing, etc.)
- Eligibility / verification edge cases

### 7. Flip prod once staging is proven

1. Email Crossmint support: "Staging tested end-to-end, please enable `cardPaymentMethod` addon on prod project `01c18166-ca9d-4759-8116-545600d32278`."
2. Once they confirm, provision **production** keys with the same scope set + JWT Auth + Firebase 3P config.
3. Swap the env vars on Replit:
   ```
   CROSSMINT_ENV=          (unset, or =prod)
   CROSSMINT_SERVER_API_KEY=sk_production_…
   NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY=ck_production_…
   ```
4. Restart workflow. Repeat the smoke test against prod with a real low-limit card.
5. Done.

---

## Findings during staging test

*(Add notes here as you run the smoke test. Empty until step 5 begins.)*

- …

---

## Open questions still unresolved

- Do staging Crossmint Card Permissions accept the same test card PANs as their checkout product? Check `docs.crossmint.com` test card section.
- Does staging Firebase 3P auth need a separate Firebase project, or can it validate JWTs from the production Firebase project? **Recommendation:** point staging Crossmint at the prod Firebase project for now — owners sign in once, the JWT works in both Crossmint envs. Revisit if Crossmint rejects cross-env JWTs.
- Will the prod `cardPaymentMethod` addon, once enabled, retroactively enable webhook event types in the prod Event Catalog? Likely yes, but worth confirming.
