# Phase 4: Brand Claims Enhancements — Technical Plan (Revised)

## Context

Phase 3 delivered the core brand claims system: single-owner claim model, domain-match auto-verify, free email blocking, manual review queue, claim/revoke/review APIs, and three UI surfaces (claim button on vendor detail page, My Claims page, admin review queue).

Phase 4 focuses on **navigation, admin integration, and UI polish**. The multi-user role system (admin/editor) has been deferred to a future phase. The single-owner claim model is retained as-is.

### Key design principle
The primary purpose of the Skills Hub is **serving brand/product/shopping resources to AI agents**. Brand claiming is a secondary, low-priority feature. All UI changes must keep claiming unobtrusive — it must never compete with or obscure the main product/brand content.

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

### Platform components (reuse, don't rebuild)
- `components/nav.tsx` — global navigation bar (public pages)
- `components/dashboard/sidebar.tsx` — dashboard sidebar with nav items grouped by section (Main, Sales, Procurement)
- `components/ui/badge.tsx`, `components/ui/button.tsx` — shadcn UI primitives
- `app/admin123/page.tsx` — admin dashboard with card grid linking to admin sub-pages
- `app/admin123/layout.tsx` — server-side admin auth gate (`getCurrentUser()` + `flags.includes('admin')`)
- `app/admin123/admin-layout-shell.tsx` — admin shell using `AppSidebar` + `Header` + `SidebarProvider`
- `useAuth()` hook from `lib/auth/auth-context.tsx` — provides `user` with `uid`, `email`, `flags`

### Tests
- `tests/brand-claims/domain.test.ts` — 23 unit tests (all passing)
- `tests/brand-claims/api.test.ts` — 4 DB integration tests (all passing)
- `tests/brand-claims/manual-checklist.md` — manual test procedures

---

## Decisions made (from user feedback)

1. **Single-owner model retained for v1** — No `role` column, no index change, no editor logic. One person claims a brand, that's it. Multi-user roles deferred to a future phase.
2. **No `claimer_domain` column needed** — The existing `brand_domain` field on the `brand_index` table already stores the brand's actual website domain. No need to snapshot the claimer's email domain into `brand_claims`.
3. **No schema changes at all** — Phase 4 is purely navigation, admin integration, and UI work. Zero database migrations.
4. **My Claims page stays at `/brands/claims`** — Keep it as a standalone public-layout page. Don't move it into the dashboard route group to avoid complexity. Just ensure a link exists to reach it.
5. **Claim UI must be subtle** — The claim button and badges on the vendor detail page should be visually secondary. The main content (brand info, capabilities, skill download) must dominate.

---

## Step 1: Navigation — make My Claims discoverable

### Current problem
The My Claims page (`/brands/claims`) exists but has no navigation link anywhere. Users can only reach it by knowing the URL directly.

### Changes

#### 1A. Dashboard sidebar link
**File:** `components/dashboard/sidebar.tsx`

Add a "My Brand Claims" item to the `procurementNavItems` array:
```typescript
const procurementNavItems: NavItem[] = [
  { icon: Send, label: "Submit Supplier", href: "/skill-builder/submit" },
  { icon: Sparkles, label: "Skill Builder", href: "/skill-builder/review" },
  { icon: Store, label: "Supplier Hub", href: "/skills", external: true },
  { icon: Shield, label: "Brand Claims", href: "/brands/claims", external: true },
];
```

- Import `Shield` from `lucide-react` (already used elsewhere in codebase).
- Mark as `external: true` because `/brands/claims` is outside the `(dashboard)` route group — it uses the public layout, not the dashboard layout. This ensures the sidebar renders it as a regular link rather than using client-side navigation that expects the dashboard shell.

#### 1B. Vendor detail page — link claim badges to My Claims
**File:** `app/skills/[vendor]/page.tsx`

When `BrandClaimButton` shows the "Claimed" or "Claim Pending" badge, wrap it in a `<Link href="/brands/claims">` so users can navigate to manage their claims.

Current (line 127-131):
```tsx
if (claimState === "verified") {
  return (
    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs border" data-testid="badge-claim-verified">
      <CheckCircle2 className="w-3 h-3 mr-1" /> Claimed
    </Badge>
  );
}
```

New:
```tsx
if (claimState === "verified") {
  return (
    <Link href="/brands/claims">
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs border cursor-pointer hover:bg-emerald-200/60 transition-colors" data-testid="badge-claim-verified">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Claimed
      </Badge>
    </Link>
  );
}
```

Same pattern for the "pending" badge (lines 134-140).

**Note:** The `Link` import already exists at the top of the file. No new imports needed for this change.

### Risk assessment
- **Sidebar**: Adding an item to an existing array. No structural change. Risk: none.
- **Badge links**: Wrapping an existing Badge in a Link. No layout shift. Risk: none. The `already_claimed` and error states are NOT linked (they're informational, not actionable for the user).

---

## Step 2: Admin dashboard integration

### Current problems
1. The admin review queue lives at `app/admin/brand-claims/page.tsx` — this is at URL `/admin/brand-claims`, which is **outside** the admin auth gate at `/admin123/`. Anyone can visit the page (the API checks admin, but the page shell renders for all users).
2. The admin dashboard at `app/admin123/page.tsx` has no card linking to the review queue.

### Changes

#### 2A. Move review queue into admin123 layout
**Action:** Create `app/admin123/brand-claims/page.tsx` with the content from `app/admin/brand-claims/page.tsx`, then delete the old file.

Required modifications when moving:
1. **Remove `<Nav />` and `<Footer />`** — the admin layout shell (`AdminLayoutShell`) already provides `AppSidebar` + `Header`. The moved page should render only its content, not a full page shell.
2. **Remove the outer `<div className="min-h-screen ...">` wrapper** — the admin shell already provides `min-h-screen`.
3. **Remove the client-side auth guard** (`if (!user) return "Admin access required"`) — the server-side layout at `app/admin123/layout.tsx` already gates on `user.flags.includes('admin')`. Redundant client-side check can be removed.
4. **Remove `useAuth()` import and usage** — since the layout already guarantees admin access. The page still needs `user` to know who is logged in... Actually, the page doesn't use `user` for anything beyond the auth check. The API calls use cookies for auth, not a user object passed from the page. So `useAuth()` can be fully removed.
5. **Keep the "Back to Admin" link** pointing to `/admin123` (it already does, line 98).
6. **Style alignment**: Update card styling from `rounded-xl border-neutral-200` to `rounded-2xl border-neutral-100` to match brand style guide. This is optional polish.

**Action:** Delete `app/admin/brand-claims/page.tsx`.

#### 2B. Add Brand Claims card to admin dashboard
**File:** `app/admin123/page.tsx`

Add a new entry to the `adminCards` array:
```typescript
{
  icon: Shield,
  title: "Brand Claims",
  description: "Review and manage brand ownership claims.",
  href: "/admin123/brand-claims",
  ready: true,
},
```

Import `Shield` from `lucide-react` (it's already in the import list on line 11).

### Risk assessment
- **Moving the page**: The old URL `/admin/brand-claims` will 404 after deletion. No existing navigation links point to it (confirmed by codebase search). The "Back to Admin" link on the page already points to `/admin123`. Risk: none.
- **Admin card**: Adding to an existing array. Existing cards are unaffected. Risk: none.
- **Auth gate**: The admin123 layout uses `getCurrentUser()` server-side. If a non-admin visits `/admin123/brand-claims`, they get a 404 from the layout — the page never renders. This is stronger than the current client-side check. Risk: improvement.

---

## Step 3: Claim button visual refinement

### Current state
The `BrandClaimButton` on the vendor detail page (line 249 of `app/skills/[vendor]/page.tsx`) renders inline next to the maturity badge in the header area. It's a standard outlined button with text "Claim Brand".

### Problem
Per design principle: claiming is very secondary to the main purpose (serving brand resources to agents). The claim button should be visually subtle and not compete with the primary content (capabilities, skill download, checkout methods).

### Changes
**File:** `app/skills/[vendor]/page.tsx`

1. **Reduce claim button visual weight**: Change from `variant="outline"` button to a smaller, more subtle ghost-style text link:
```tsx
<Button
  variant="ghost"
  size="sm"
  className="text-[11px] text-neutral-400 hover:text-primary rounded-full px-3 h-7"
  onClick={handleClaim}
  disabled={claimState === "loading"}
  data-testid="button-claim-brand"
>
  <Shield className="w-3 h-3 mr-1" />
  {claimState === "loading" ? "Claiming..." : "Claim this brand"}
</Button>
```

2. **Keep badges subtle**: The existing verified/pending badges are already small (`text-xs`). No change needed — they're appropriately secondary.

3. **Import `Shield`**: Add to the existing lucide-react import in the `BrandClaimButton` section. `Shield` is not currently imported in this file — need to add it.

### Risk assessment
- Visual-only change to one component. No functional change. Risk: none.
- The button still works the same way — just looks less prominent.

---

## Step 4: Update manual test checklist

### File: `tests/brand-claims/manual-checklist.md`

Add test scenarios for the new navigation and admin integration:

1. **Sidebar navigation**: Log in → open dashboard → verify "Brand Claims" link appears in Procurement section → click it → verify it opens `/brands/claims`.
2. **Vendor detail badge links**: Navigate to a vendor where you have a verified claim → verify "Claimed" badge is clickable → click it → verify it navigates to `/brands/claims`.
3. **Admin dashboard card**: Log in as admin → visit `/admin123` → verify "Brand Claims" card appears → click it → verify it opens `/admin123/brand-claims`.
4. **Admin auth gate**: Log in as non-admin → visit `/admin123/brand-claims` → verify 404 response.
5. **Old admin URL removed**: Visit `/admin/brand-claims` → verify 404.
6. **Claim button subtlety**: Visit any vendor detail page while logged in → verify claim button is ghost-styled, small, and doesn't dominate the page.

---

## Build order & dependencies

```
Step 1 (Navigation)      ← no dependencies
Step 2 (Admin integration) ← no dependencies, can parallel with Step 1
Step 3 (Claim button polish) ← no dependencies, can parallel
Step 4 (Test checklist)  ← depends on Steps 1-3 (documents their outcomes)
```

Steps 1, 2, and 3 are fully independent and can be built in parallel. Step 4 comes last.

**No database changes. No schema changes. No migration needed.**

---

## Files changed (complete list)

| File | Action | Step |
|------|--------|------|
| `components/dashboard/sidebar.tsx` | Edit: add Brand Claims nav item to procurementNavItems | 1A |
| `app/skills/[vendor]/page.tsx` | Edit: wrap claim badges in Link, restyle claim button | 1B, 3 |
| `app/admin123/brand-claims/page.tsx` | Create: moved + adapted from admin/brand-claims | 2A |
| `app/admin/brand-claims/page.tsx` | Delete | 2A |
| `app/admin123/page.tsx` | Edit: add Brand Claims card to adminCards array | 2B |
| `tests/brand-claims/manual-checklist.md` | Edit: add new test scenarios | 4 |

**6 files touched. 1 created, 1 deleted, 4 edited. Zero schema/DB changes.**

---

## What is NOT in Phase 4 (deferred)

- Multi-user role system (admin/editor) — deferred to future phase
- `role` column on `brand_claims` — deferred
- `claimer_domain` / `brand_domain` column on `brand_claims` — not needed
- Partial unique index change — deferred with role system
- "You manage this" indicator on catalog cards — deferred (requires client-side fetch on public page, low priority)
- Moving My Claims page into dashboard route group — too complex for the benefit, staying as standalone page

---

## Edge cases

1. **Non-logged-in user sees sidebar link** — The dashboard sidebar is only visible inside the dashboard layout, which requires auth. Non-auth users won't see it. ✓
2. **Non-logged-in user visits `/brands/claims` directly** — The page already handles this with a "Sign in" prompt. No change needed. ✓
3. **Non-admin visits `/admin123/brand-claims`** — Server-side layout returns 404. Never renders. ✓
4. **User with no claims clicks sidebar link** — My Claims page already shows an empty state with a "Browse Skills" button. ✓
5. **Old `/admin/brand-claims` URL bookmarked** — Returns 404 after file deletion. No redirect needed (internal tool, no external links). ✓
