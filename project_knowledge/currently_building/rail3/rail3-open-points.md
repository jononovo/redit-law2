---
name: Rail 3 — Open Points Before End-to-End Works
description: Tracker for what's left between the current Rail 3 code and a verified working owner flow on Crossmint staging. Originally written 2026-05-18 against the bare-iframe implementation; rewritten 2026-05-18 after the SDK + per-bot-agent rebuild landed.
created: 2026-05-18
last_updated: 2026-05-18
status: in-process
---

# Rail 3 — Open Points

> All three Crossmint env vars are set (`CROSSMINT_SERVER_API_KEY`, `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY`, `CROSSMINT_WEBHOOK_SECRET`). Backend client + storage + API routes compile and run. The 1-agent-per-bot rework (Phase 2.5 in the rewire plan) is in. The owner-facing ceremonies have **not** been live-tested end-to-end yet.

---

## Resolved (kept for history, no work needed)

### ✅ 1. Firebase → Crossmint JWT bridge — DONE
Was: bare `<iframe src="/embed/save-payment-method">` with no auth bridge.
Now: `components/rail3/crossmint-provider.tsx` wraps both the setup wizard and AddCardDialog in `<CrossmintProvider>`, and a small inner component calls `setJwt(await user.getIdToken())` on auth change with token-refresh on a 50-minute interval. SDK components `CrossmintPaymentMethodManagement` and `OrderIntentVerification` are used in place of the iframes. Firebase is registered as a 3P auth provider in the Crossmint Console (manual step, owner did it).

### ✅ 2. Verification step copy + popup — DONE
Was: misleading "check your email" copy on top of a postMessage iframe that may never have fired.
Now: setup wizard step 2 renders the agentic-enrollment status read from `GET /payment-methods/:id/agentic-enrollment` polled every 3s; AddCardDialog renders `<OrderIntentVerification>` which fires `onVerificationComplete` authoritatively. No popup, no postMessage, no email-link instructions left in the UI.

---

## Still open

### 3. Live end-to-end test on Crossmint staging — **NOT DONE**
The whole rebuild is structurally correct against the docs but unverified against a live Crossmint backend. Nothing has been walked through with a real test card.

Test path (Phase 8 of the rewire plan):
1. Fresh Firebase user lands on `/setup/rail3`.
2. Save card via `CrossmintPaymentMethodManagement` (test card `4242 4242 4242 4242`).
3. Enrollment auto-starts; passkey ceremony completes; `enrollment.status` flips to `active`.
4. Land on `/virtual-cards`, open AddCardDialog.
5. Pick a bot + PM + limit → submit → `POST /api/v1/rail3/cards` lazily creates the Crossmint agent for that bot and returns an OrderIntent.
6. Passkey ceremony in `<OrderIntentVerification>` flips phase to `active`.
7. Bot integration test: `POST /api/v1/bot/rail3/checkout` with a real merchant URL + country → confirm `/credentials` returns a one-time PAN.

This is the only remaining blocker to "rail3 actually works."

### 4. Webhook handler — **NOT BUILT**
`CROSSMINT_WEBHOOK_SECRET` is set but no route exists.

State drift risk: if Crossmint revokes a PM or order intent server-side (issuer fraud, owner action in Crossmint dashboard), our `rail3_payment_methods.status` / `rail3_cards.permission_phase` will silently stay "active" until next poll. Bot checkout fails closed (Crossmint will reject the credentials fetch with a clear error), so it's degraded UX, not unsafe behavior.

If we add it:
- New route `app/api/v1/rail3/webhook/route.ts` — verify HMAC against `CROSSMINT_WEBHOOK_SECRET`, switch on event type, update PM or card row.
- Register webhook URL in Crossmint Console.
- Optionally drop owner-side polling.

Pattern to copy: `features/agent-interaction/procurement/crossmint-worldstore/webhook.ts` (Rail 2 already verifies Crossmint signatures).

### 5. Bot-delete → Crossmint agent cleanup — **NOT BUILT, NO CALLER YET**
Phase 2.5 added `deleteRail3AgentByBotId` to storage but nothing calls it. There is no `DELETE /api/v1/bots/:botId` route in the codebase today. When/if one gets built, it should:
1. Call `deleteRail3AgentByBotId(botId)` on our DB.
2. Call `DELETE /agents/:agentId` on Crossmint (we already have `createAgent` in `features/payment-rails/rail3/agents.ts` — add `deleteAgent`).
3. Probably revoke any open OrderIntents for that bot first.

Until a bot-delete route exists, this is theoretical.

### 6. Sidebar nav still inactive — **NOT FLIPPED**
`components/dashboard/sidebar.tsx:53`:
```ts
{ icon: CreditCard, label: "Virtual Cards", href: "/cards", inactive: true, requiredAccess: "admin" },
```
Should become `href: "/virtual-cards"` + drop `inactive: true`. Also worth removing the `requiredAccess: "admin"` gate so it's visible to regular owners once we're confident rail3 works. (Phase 9 of the rewire plan.) One-line change but explicitly gated on the live test passing first — don't surface a broken flow.

---

## Smaller items (not blocking)

- **`app/api/v1/rail3/transactions/`** — exists but not audited. Confirm it isn't a stale skeleton next time someone is in there.
- **No DB FK** on `rail3_cards.payment_method_id` or `rail3_cards.bot_id`. Application-enforced. Tracked in the operational doc.
- **PM eligibility surfacing** — wizard copy says "US-issued Visa/Mastercard credit/debit only. Not supported: non-US, business, prepaid, Chase, Fidelity. AMEX/Ramp need Crossmint approval." No live check before save. If the user submits an ineligible card the Crossmint SDK iframe shows its own error; nothing reaches our UI. Cosmetic until a real user hits it.

---

## Recommended order if you pick this up

1. **Live-test end-to-end on staging** (#3). Everything else hinges on this passing.
2. Flip sidebar nav (#6) once #3 passes.
3. Decide on webhook (#4) based on whether silent state drift is actually observed in normal operation.
4. Defer #5 until a bot-delete route is needed for unrelated reasons.

---

## Cross-references

- Operational doc: `project_knowledge/currently_building/rail3/rail3-crossmint-card-permissions.md`
- Rewire plan (incl. Phase 2.5 per-bot agent rework): `project_knowledge/currently_building/rail3/rail3-frontend-rewire-plan.md`
- Historical plan: `project_knowledge/currently_building/rail3/rail3-virtual-cards-technical-plan.md`
- Rail 2 webhook pattern (for #4): `features/agent-interaction/procurement/crossmint-worldstore/webhook.ts`
