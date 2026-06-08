---
name: Rail 3 — Open Points
description: Flat checklist of everything outstanding on Rail 3. One line per item. Deep dives live in their own files (linked at the bottom). Read this first whenever picking up Rail 3 work.
created: 2026-05-23
last_updated: 2026-06-05
status: living
---

# Rail 3 — Open Points

> Canonical operational doc: `../rail3-virtual-cards.md` (parent folder).
> This file is the **what's left** tracker. Update it as items close — don't archive until everything ships.

---

## Blocking — must land before production

- [ ] **Resolve Crossmint auth model question** (shared `agentId` vs JWT-bound). Gates Master Agent design; a Path-A outcome would let the Master Agent spend with the org server key, reducing reliance on the per-owner refresh-token exchange for that flow. Action: email Crossmint support, or test in staging with two Firebase users sharing one agentId. Deep dive: `260528_rail3-master-agent-plan.md`.

## Production readiness

- [ ] **Live prod smoke test, two devices.** PM enrollment → orderIntent ceremony → bot checkout at a real low-risk merchant. Repeat from a second device to exercise the cross-device-passkey path that staging's Visa mock hides. Procedure: see "How to flip to production" in the canonical doc.
- [ ] **Flip `crossmint-env.ts` from staging to production** (three-line edit; see canonical doc "Staging vs production"). The refresh-token exchange is already shipped; just confirm owners' tokens are being captured in prod first.
- [ ] **Bump `@crossmint/client-sdk-react-ui`** `^4.2.1` → `4.2.2` (and to whatever's latest at flip time). Crossmint absorbs prod-vs-staging overlay differences inside the SDK.

## Code cleanup

- [ ] **Stale comment in `app/setup/rail3/page.tsx`** says "Crossmint agents are created lazily per-bot" — should be per-owner. One-line fix.
- [ ] **Audit `/api/v1/rail3/transactions/` route** against current schema. Route exists, never validated post-refactor.
- [ ] **Mobile prod verification re-test.** Was observed unmounting mid-flow pre-dialog-removal (2026-05-23 refactor). May or may not still reproduce.

## Deferred / unknowns

- [ ] **Master Agent runtime decision** (Browserbase vs self-hosted Playwright vs Anthropic Computer Use). Don't start until the auth-model question above is resolved. Deep dive: `rail3-master-agent-plan.md`.
- [ ] **Master Agent compliance review** — when CreditClaw executes on a user's card, we're the actor of record. AML/KYC, dispute handling, fraud monitoring scale up. Non-technical gating concern. Deep dive: `rail3-master-agent-plan.md`.

---

## Deep-dive plans

- **`260528_rail3-master-agent-plan.md`** — holding doc for the in-house Master Agent capability. Coupled to Rail 3 only via the auth-model question; will graduate to its own `currently_building/master-agent/` folder once a runtime is chosen.

## Recently closed (kept for one cycle, then prune)

- ✅ Headless bot-checkout auth — Firebase refresh-token exchange shipped (`getFreshIdToken`; token captured at sign-in, `credentials.ts` sends Bearer). Refresh token stored **plaintext by decision** — app-layer encryption intentionally declined, no `OWNER_REFRESH_TOKEN_ENCRYPTION_KEY`. Remaining: live in-app prod E2E (tracked under Production readiness).
- ✅ Dialog → inline panel refactor on `AddCardDialog` (2026-05-23) — passkey ceremony was un-clickable inside Radix Dialog.
- ✅ End-to-end verified on Crossmint staging (2026-05-23) — orderIntent reached `status: "active"`.
- ✅ Per-owner agent provisioning, race-safe via `ON CONFLICT DO NOTHING` (see `_completed/rail3-per-user-agent-plan.md`).
- ✅ Verification writeback via `/refresh-phase` (see `_completed/rail3-verification-writeback-plan.md`).
- ✅ `crossmint-env.ts` single source of truth for host + keys (see `_completed/rail3-crossmint-env-single-source-plan.md`).
