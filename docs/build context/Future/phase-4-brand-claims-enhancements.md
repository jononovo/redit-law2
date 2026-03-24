# Phase 4: Brand Claims Enhancements — Technical Plan

## Context

Phase 3 delivered the core brand claims system: single-owner claim model, domain-match auto-verify, free email blocking, manual review queue, claim/revoke/review APIs, and three UI surfaces (claim button on vendor detail page, My Claims page, admin review queue).

Phase 4 extends this with the multi-user role system from the original design conversations, adds the `brand_domain` audit column, connects the admin review queue into the existing admin dashboard, and adds navigation so users can actually discover the My Claims page.

---

## What already exists (DO NOT rebuild)

### Schema & DB
- `brand_claims` table: id, brand_slug, claimer_uid, claimer_email, claim_type, status, rejection_reason, verified_at, revoked_at, reviewed_by, created_at
- Partial unique index `brand_claims_active_claim_idx ON (brand_slug) WHERE status = 'verified'`
- Three standard indexes on brand_slug, claimer_uid, status
- `brand_index` table with `claimed_by`, `claim_id`, `maturity`, `submitter_type` columns

### Domain helpers
- `lib/brand-claims/blocklist.ts` — FREE_EMAIL_PROVIDERS array
- `lib/brand-claims/domain.ts` — extractEmailDomain, domainsMatch, isFreeEmailProvider, canAutoVerifyClaim

### Storage layer
- `server/storage/brand-claims.ts` — createBrandClaim, getBrandClaimById, getActiveClaimForBrand, getPendingClaimForBrand, getClaimsByUser, getPendingClaims, verifyClaim (transactional), rejectClaim, revokeClaim (transactional)
- Wired into `server/storage/types.ts` (IStorage) and `server/storage/index.ts`

### API endpoints
- `POST /api/v1/brands/[slug]/claim` — create claim (auto-verify or pending)
- `GET /api/v1/brands/claims/mine` — list user's claims
- `POST /api/v1/brands/claims/[id]/revoke` — revoke a verified claim
- `GET /api/v1/brands/claims/review` — admin: list pending claims
- `POST /api/v1/brands/claims/[id]/review` — admin: verify or reject

### UI
- `BrandClaimButton` component inline in `app/skills/[vendor]/page.tsx` — shows claim button, pending badge, or verified badge
- `app/brands/claims/page.tsx` — My Claims page (list, revoke)
- `app/admin/brand-claims/page.tsx` — Admin review queue (verify, reject with reason)

### Existing platform components (reuse, don't rebuild)
- `components/nav.tsx` — global navigation bar (public pages)
- `components/dashboard/sidebar.tsx` — dashboard sidebar with nav items grouped by section
- `components/ui/badge.tsx`, `components/ui/button.tsx` — shadcn UI primitives
- `app/admin123/page.tsx` — admin dashboard with card grid linking to admin sub-pages
- `useAuth()` hook from `lib/auth/auth-context.tsx` — provides `user` with `uid`, `email`, `flags`
- `getCurrentUser()` from `lib/auth/session.ts` — server-side session check

### Tests
- `tests/brand-claims/domain.test.ts` — 23 unit tests (all passing)
- `tests/brand-claims/api.test.ts` — 4 DB integration tests (all passing)
- `tests/brand-claims/manual-checklist.md` — manual test procedures

---

## Step 1: Schema additions — `brand_domain` and `role` columns

### What
Add two columns to `brand_claims`:
- `brand_domain text` — the email domain extracted at claim time (e.g. "staples.com"). Audit/display column, not used for filtering.
- `role text NOT NULL DEFAULT 'admin'` — `admin` (first claimer from a domain for this brand) or `editor` (subsequent claimers from the same domain).

### Why
- `brand_domain` captures the domain match that was used for verification at claim time. Useful for admin review ("this person claimed via staples.com") and for the role system below.
- `role` enables multiple people from the same company to manage a brand listing. The first verified claimer is admin; additional claimers from the same domain become editors.

### How
1. Add columns to `brandClaims` pgTable in `shared/schema.ts`:
   ```typescript
   brandDomain: text("brand_domain"),
   role: text("role").notNull().default("admin"),
   ```
2. Apply via direct SQL (same pattern as Phase 3 — avoids Drizzle push dropping `search_vector`):
   ```sql
   ALTER TABLE brand_claims ADD COLUMN IF NOT EXISTS brand_domain text;
   ALTER TABLE brand_claims ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';
   ```
3. Update `BrandClaim` and `InsertBrandClaim` types (automatic from $inferSelect/$inferInsert).

### Files changed
- `shared/schema.ts` — add columns to `brandClaims` pgTable

---

## Step 2: Multi-user role logic — allow editors from same domain

### Current behavior
The partial unique index enforces one verified claim per brand. Only one person can "own" a brand. Any second claim attempt returns 409 "already claimed."

### New behavior
- If a brand already has a verified claim, a new claimer from the **same email domain** can submit a claim that is auto-verified with `role: 'editor'`.
- Claimers from a **different domain** are still blocked (409).
- The partial unique index constraint needs adjustment: change from unique on `(brand_slug) WHERE status = 'verified'` to unique on `(brand_slug, claimer_uid) WHERE status = 'verified'` — allows multiple verified claims per brand but only one per user.
- `brand_index.claimed_by` stays set to the **admin** claimer's UID (the first one). It represents the primary owner.

### Revocation rules
- **Admin** can revoke their own claim → this also revokes all editor claims for the brand and resets brand_index to community.
- **Editor** can revoke only their own claim → brand stays official, admin claim unaffected.
- Only users with role `admin` (or platform admins) can manage the brand listing in the future.

### How
1. Update the claim API endpoint (`app/api/v1/brands/[slug]/claim/route.ts`):
   - When `activeClaim` exists: check if the new claimer's email domain matches `activeClaim.brandDomain`.
   - If same domain → create claim with `role: 'editor'`, auto-verify.
   - If different domain → 409 "already claimed."
2. Update `createBrandClaim` calls to include `brandDomain` (extracted from email).
3. Adjust the partial unique index:
   ```sql
   DROP INDEX brand_claims_active_claim_idx;
   CREATE UNIQUE INDEX brand_claims_active_claim_idx ON brand_claims (brand_slug, claimer_uid) WHERE status = 'verified';
   ```
4. Update `verifyClaim` in storage — only update `brand_index.claimed_by` if this is the first (admin) claim, not for editors.
5. Update `revokeClaim` in storage:
   - If revoking an admin claim: also revoke all editor claims for this brand, then reset brand_index.
   - If revoking an editor claim: just revoke that single claim, don't touch brand_index.

### Files changed
- `app/api/v1/brands/[slug]/claim/route.ts` — editor claim logic
- `server/storage/brand-claims.ts` — verifyClaim, revokeClaim adjustments
- `lib/brand-claims/domain.ts` — no changes needed (extractEmailDomain already exists)

---

## Step 3: Navigation — make My Claims discoverable

### Current problem
The My Claims page (`/brands/claims`) exists but has no navigation link. Users can only reach it by knowing the URL.

### What to add
1. **Dashboard sidebar** (`components/dashboard/sidebar.tsx`): Add a "My Brand Claims" item in the "Supplier" section (alongside "Submit Supplier", "Skill Builder", "Supplier Hub"):
   ```typescript
   { icon: Shield, label: "My Brand Claims", href: "/brands/claims" },
   ```
2. **Vendor detail page claim button**: When a user has a verified or pending claim, the badge should link to `/brands/claims` so they can manage it.

### Files changed
- `components/dashboard/sidebar.tsx` — add nav item
- `app/skills/[vendor]/page.tsx` — wrap claim badges with Link to `/brands/claims`

---

## Step 4: Admin dashboard integration

### Current problem
The admin review queue is at `/admin/brand-claims` but:
- The admin dashboard (`app/admin123/page.tsx`) has no card linking to it.
- The admin layout is at `/admin123/` (with auth gate), but the review queue is at `/admin/brand-claims/` — this means it's not behind the admin layout guard.

### What to do
1. **Move the review queue** from `app/admin/brand-claims/page.tsx` to `app/admin123/brand-claims/page.tsx` so it sits under the existing admin layout with its auth gate.
2. **Add a card** to the admin dashboard (`app/admin123/page.tsx`):
   ```typescript
   {
     icon: Shield,
     title: "Brand Claims",
     description: "Review and manage brand ownership claims.",
     href: "/admin123/brand-claims",
     ready: true,
   },
   ```
3. **Delete** the orphaned `app/admin/brand-claims/page.tsx`.
4. **Update** the back link in the review queue page from `/admin123` to match.
5. **Add pending count badge** on the admin dashboard card (optional, nice-to-have): fetch count client-side on dashboard load.

### Files changed
- `app/admin123/page.tsx` — add Brand Claims card
- `app/admin123/brand-claims/page.tsx` — move review queue here (from `app/admin/brand-claims/`)
- `app/admin/brand-claims/page.tsx` — delete

---

## Step 5: UI polish — claim status on catalog cards

### Current state
The skills catalog page (`app/skills/page.tsx`) shows cards for each vendor with maturity badges. But it doesn't show whether the brand is claimed or if the logged-in user has a claim.

### What to add
1. On the catalog page, for brands with `maturity === 'official'`: show an "Official" badge (already works via `MATURITY_CONFIG`).
2. Optionally: if the logged-in user has a verified claim on a brand, show a small "You manage this" indicator on the card.
3. This is lightweight — just a single fetch to `/api/v1/brands/claims/mine` on page load, then cross-reference with the brand list.

### Files changed
- `app/skills/page.tsx` — add user claim indicator on cards

---

## Step 6: Extend tests

### New unit tests (`tests/brand-claims/domain.test.ts`)
- No new tests needed (domain logic unchanged).

### New DB tests (`tests/brand-claims/api.test.ts`)
- Test: inserting two verified claims for same brand with different `claimer_uid` (should succeed with new index).
- Test: inserting two verified claims for same brand with same `claimer_uid` (should fail — unique index).
- Test: `brand_domain` and `role` columns exist and accept values.

### Update manual checklist (`tests/brand-claims/manual-checklist.md`)
- Add editor claim flow scenarios.
- Add admin revoke cascading editors scenario.
- Add navigation discovery tests (sidebar link, admin card).

---

## Build order & dependencies

```
Step 1 (Schema) ← no dependencies
Step 2 (Role logic) ← depends on Step 1
Step 3 (Navigation) ← no dependencies, can parallel with Step 1-2
Step 4 (Admin integration) ← no dependencies, can parallel with Step 1-2
Step 5 (Catalog polish) ← no dependencies, can parallel
Step 6 (Tests) ← depends on Steps 1-5
```

Steps 1→2 are sequential. Steps 3, 4, 5 can be done in parallel with each other (and partially in parallel with Steps 1-2 since they touch different files). Step 6 comes last.

---

## Edge cases

1. **Admin revokes their claim — what happens to editors?** All editor claims for this brand are revoked in the same transaction. Brand reverts to community.
2. **Editor tries to revoke admin's claim** — rejected (403). Only the admin themselves or a platform admin can do this.
3. **Two people from same domain claim simultaneously** — the unique index on `(brand_slug, claimer_uid)` prevents the same user from having two verified claims. Two different users from the same domain can both succeed (one as admin, one as editor).
4. **Admin changes email after claiming** — claim remains valid (point-in-time verification). The `brand_domain` column records what domain was used.
5. **Brand has no domain set** — editors cannot auto-join since there's no domain to match against. Only the original manual-review claimer becomes admin.
