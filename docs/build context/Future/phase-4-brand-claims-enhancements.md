# Phase 4: My Skills Unification + Admin Integration — Technical Plan

## Context

Phase 3 delivered the core brand claims system: single-owner claim model, domain-match auto-verify, free email blocking, manual review queue, claim/revoke/review APIs, and three UI surfaces (claim button on vendor detail page, My Claims page, admin review queue).

Phase 4 **unifies the user's skill contributions into a single "My Skills" page**, replacing the standalone claims page. It also integrates the admin review queue into the admin dashboard and polishes the claim button on vendor detail pages.

### Key design principle
The primary purpose of the Skills Hub is **serving brand/product/shopping resources to AI agents**. Brand claiming is a very secondary feature. A user may create 10 skills but only claim one brand (the one matching their email domain). The UI must reflect this hierarchy — skills first, claiming is just one small action within the broader contribution story.

---

## What already exists (DO NOT rebuild)

### Schema & DB
- `brand_claims` table: id, brand_slug, claimer_uid, claimer_email, claim_type, status, rejection_reason, verified_at, revoked_at, reviewed_by, created_at
- Partial unique index `brand_claims_active_claim_idx ON (brand_slug) WHERE status = 'verified'`
- `brand_index` table with `claimed_by`, `claim_id`, `maturity`, `submitter_type` columns
- `skill_drafts` table: id, vendor_url, vendor_slug, vendor_data (JSONB), status, submitter_uid, submitter_email, submitter_type, confidence (JSONB), review_needed, warnings, created_at, updated_at
- `skill_submitter_profiles` table: owner_uid, display_name, email, skills_submitted, skills_published, skills_rejected
- `skill_versions` table: versioned published skills with skill_md, vendor_data, published_by

### Domain helpers
- `lib/brand-claims/blocklist.ts` — FREE_EMAIL_PROVIDERS array
- `lib/brand-claims/domain.ts` — extractEmailDomain, domainsMatch, isFreeEmailProvider, canAutoVerifyClaim

### Storage layer
- `server/storage/brand-claims.ts` — createBrandClaim, getBrandClaimById, getActiveClaimForBrand, getPendingClaimForBrand, getClaimsByUser, getPendingClaims, verifyClaim (transactional), rejectClaim, revokeClaim (transactional)
- `server/storage/skills.ts` — listSkillDraftsBySubmitter, getSubmitterProfile
- `server/storage/brand-index.ts` — searchBrands (full-text + faceted search)

### API endpoints
- `POST /api/v1/brands/[slug]/claim` — create claim (auto-verify or pending)
- `GET /api/v1/brands/claims/mine` — list user's claims (enriched with brand name/domain)
- `POST /api/v1/brands/claims/[id]/revoke` — revoke a verified claim
- `GET /api/v1/brands/claims/review` — admin: list pending claims
- `POST /api/v1/brands/claims/[id]/review` — admin: verify or reject
- `GET /api/v1/skills/submissions/mine` — list user's skill submissions + submitter profile stats
- `POST /api/v1/skills/submissions` — submit a vendor URL for AI analysis
- `GET /api/v1/bot/skills?search=X` — search brands by name (uses `storage.searchBrands`)

### UI pages
- `app/(dashboard)/skill-builder/submit/page.tsx` — "Submit a Vendor Skill" page (dashboard layout). Has: stats row (submitted/published/rate), submit form, "Your Submissions" list. **This is the page we will evolve into "My Skills".**
- `app/(dashboard)/skill-builder/review/page.tsx` — Skill review/edit page (dashboard, admin-ish)
- `app/brands/claims/page.tsx` — Standalone "My Brand Claims" page (public layout). **Will be deleted.**
- `app/admin/brand-claims/page.tsx` — Admin review queue (public layout, not auth-gated). **Will be moved.**
- `app/skills/[vendor]/page.tsx` — Vendor detail page with `BrandClaimButton` component (lines 86-165)

### Platform components (reuse, don't rebuild)
- `components/ui/dialog.tsx` — Radix-based Dialog (Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose)
- `components/ui/badge.tsx`, `components/ui/button.tsx` — shadcn UI primitives
- `components/dashboard/sidebar.tsx` — dashboard sidebar with nav items grouped by section (Main, Sales, Procurement)
- `app/admin123/page.tsx` — admin dashboard with card grid
- `app/admin123/layout.tsx` — server-side admin auth gate
- `app/admin123/admin-layout-shell.tsx` — admin shell using AppSidebar + Header
- `useAuth()` hook — provides `user` with `uid`, `email`, `flags`

---

## Decisions made (from user feedback)

1. **Single-owner claim model retained** — No multi-user roles. One person claims a brand. Deferred to future phase.
2. **No schema changes** — No new columns needed. Zero database migrations.
3. **"My Skills" = evolved Submit Supplier page** — The existing `/skill-builder/submit` page already shows stats + submit form + submissions list. We evolve it into "My Skills" by adding brand claims to the list and a claim modal.
4. **No separate claims page** — `/brands/claims` is deleted. Claims appear as rows in the "My Skills" unified list.
5. **Claim modal, not a full page** — Claiming a brand is a quick modal action from the My Skills page, using existing Dialog component.
6. **Vendor detail BrandClaimButton stays** — Good for discovery. Non-logged-in users see the button; it guides them to register. Logged-in users with claims see a badge that links to My Skills.

---

## Step 1: Evolve Submit Supplier page into "My Skills"

### Current state
**File:** `app/(dashboard)/skill-builder/submit/page.tsx` (283 lines)

The page currently has three sections:
1. **Header** (lines 109-114): "Submit a Vendor Skill" heading + subtitle
2. **Stats row** (lines 116-142): 3 stat cards (Submitted / Published / Acceptance Rate) from `profile` data
3. **Submit form** (lines 144-203): URL input + Submit button + error/success feedback
4. **Submissions list** (lines 205-279): "Your Submissions" heading + list of `Submission` cards

### Changes

#### 1A. Rename page header
**Lines 109-114** — Change heading and subtitle:

Old:
```tsx
<h1 className="text-2xl font-bold" data-testid="text-submit-heading">Submit a Vendor Skill</h1>
<p className="text-neutral-500 text-sm mt-1">
  Help grow the procurement skills library by submitting vendor websites for analysis
</p>
```

New:
```tsx
<h1 className="text-2xl font-bold" data-testid="text-submit-heading">My Skills</h1>
<p className="text-neutral-500 text-sm mt-1">
  Your skill contributions — submitted vendors and claimed brands
</p>
```

#### 1B. Add claims to stats row
**Lines 116-142** — Add a 4th stat card for brand claims. Change grid from `grid-cols-3` to `grid-cols-4`.

New stat card (after the 3 existing ones):
```tsx
<div className="bg-white rounded-2xl border border-neutral-200 p-5 text-center">
  <div className="flex items-center justify-center mb-2">
    <Shield className="w-5 h-5 text-emerald-600" />
  </div>
  <div className="text-2xl font-bold text-emerald-600" data-testid="text-stat-claimed">{claimsCount}</div>
  <div className="text-xs text-neutral-500 mt-1">Claimed</div>
</div>
```

Where `claimsCount` = number of claims with status `verified`.

Import `Shield` from `lucide-react` (add to existing import).

#### 1C. Fetch claims alongside submissions
**Lines 57-70** — The existing `fetchSubmissions()` function calls `GET /api/v1/skills/submissions/mine`. Add a parallel fetch to `GET /api/v1/brands/claims/mine`.

New data fetching:
```tsx
type ClaimItem = {
  id: number;
  brand_slug: string;
  brand_name: string;
  brand_domain: string | null;
  claimer_email: string;
  claim_type: string;
  status: string;
  rejection_reason: string | null;
  verified_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

// Add state
const [claims, setClaims] = useState<ClaimItem[]>([]);

// Update fetchSubmissions to also fetch claims
const fetchData = async () => {
  setLoading(true);
  try {
    const [subRes, claimRes] = await Promise.all([
      fetch("/api/v1/skills/submissions/mine"),
      fetch("/api/v1/brands/claims/mine"),
    ]);
    if (subRes.ok) {
      const data = await subRes.json();
      setSubmissions(data.submissions || []);
      setProfile(data.profile);
    }
    if (claimRes.ok) {
      const claimData = await claimRes.json();
      setClaims(claimData.claims || []);
    }
  } catch {
    // ignore
  }
  setLoading(false);
};
```

Rename `fetchSubmissions` → `fetchData` throughout the file (used in `useEffect` line 72, `handleSubmit` line 93).

#### 1D. Add "Claim a Brand" button next to submit form
After the submit form card (line 203), add a small secondary action:

```tsx
<div className="flex items-center gap-3">
  <Button
    variant="outline"
    size="sm"
    className="rounded-xl text-xs"
    onClick={() => setShowClaimModal(true)}
    data-testid="button-open-claim-modal"
  >
    <Shield className="w-3.5 h-3.5 mr-1.5" />
    Claim a Brand
  </Button>
</div>
```

This sits below the main submit form — visually secondary. The submit form remains the primary action.

State: `const [showClaimModal, setShowClaimModal] = useState(false);`

#### 1E. Rename "Your Submissions" → "Your Skills" and merge claims into the list
**Lines 205-279** — The list section currently shows only submissions.

Change heading:
```tsx
<h2 className="text-lg font-bold mb-4">Your Skills</h2>
```

Build a unified list by combining submissions and claims into a single sorted array:

```tsx
type UnifiedItem =
  | { kind: "submission"; data: Submission }
  | { kind: "claim"; data: ClaimItem };

const unifiedItems: UnifiedItem[] = [
  ...submissions.map(s => ({ kind: "submission" as const, data: s })),
  ...claims.map(c => ({ kind: "claim" as const, data: c })),
].sort((a, b) => {
  const dateA = a.kind === "submission" ? a.data.createdAt : a.data.created_at;
  const dateB = b.kind === "submission" ? b.data.createdAt : b.data.created_at;
  return new Date(dateB).getTime() - new Date(dateA).getTime();
});
```

Then render:
```tsx
{unifiedItems.map(item => {
  if (item.kind === "submission") {
    return <SubmissionCard key={`sub-${item.data.id}`} sub={item.data} />;
  }
  return <ClaimCard key={`claim-${item.data.id}`} claim={item.data} onRevoke={handleRevoke} />;
})}
```

Extract the existing submission rendering into a `SubmissionCard` component (extract lines 222-275 into a local function — no new file needed).

#### 1F. ClaimCard component (inline in same file)
A new local component rendering a brand claim row in the same visual style as submission cards:

```tsx
function ClaimCard({ claim, onRevoke }: { claim: ClaimItem; onRevoke: (id: number) => void }) {
  const claimStatus = CLAIM_STATUS_CONFIG[claim.status] || CLAIM_STATUS_CONFIG.pending;
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 transition-all" data-testid={`claim-${claim.id}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-lg font-bold text-emerald-400">
            {claim.brand_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link href={`/skills/${claim.brand_slug}`}>
                <h3 className="font-bold text-base hover:text-primary transition-colors" data-testid={`text-claim-name-${claim.id}`}>
                  {claim.brand_name}
                </h3>
              </Link>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-semibold flex items-center gap-0.5">
                <Shield className="w-3 h-3" />
                Brand Claim
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-neutral-400">{claim.claimer_email}</span>
              {claim.brand_domain && (
                <>
                  <span className="text-xs text-neutral-300">·</span>
                  <span className="text-xs text-neutral-400">{claim.brand_domain}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {claim.status === "rejected" && claim.rejection_reason && (
            <span className="text-xs text-red-500 max-w-[200px] truncate">{claim.rejection_reason}</span>
          )}
          <Badge className={`${claimStatus.color} border text-xs font-medium flex items-center gap-1`}>
            {claimStatus.icon}
            {claimStatus.label}
          </Badge>
          {claim.status === "verified" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => onRevoke(claim.id)}
              data-testid={`button-revoke-${claim.id}`}
            >
              Revoke
            </Button>
          )}
        </div>
      </div>
      <div className="mt-2 text-[11px] text-neutral-400">
        Claimed {new Date(claim.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}
```

With claim status config matching existing patterns:
```tsx
const CLAIM_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  verified: { label: "Verified", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  pending: { label: "Pending Review", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="w-3 h-3" /> },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="w-3 h-3" /> },
  revoked: { label: "Revoked", color: "bg-neutral-100 text-neutral-500 border-neutral-200", icon: <XCircle className="w-3 h-3" /> },
};
```

#### 1G. Revoke handler
Port the revoke logic from the deleted claims page:

```tsx
const [revoking, setRevoking] = useState<number | null>(null);

const handleRevoke = useCallback(async (claimId: number) => {
  if (!confirm("Are you sure you want to revoke this claim?")) return;
  setRevoking(claimId);
  try {
    const res = await fetch(`/api/v1/brands/claims/${claimId}/revoke`, { method: "POST" });
    if (res.ok) {
      setClaims(prev => prev.map(c =>
        c.id === claimId ? { ...c, status: "revoked", revoked_at: new Date().toISOString() } : c
      ));
    }
  } catch {}
  setRevoking(null);
}, []);
```

Pass `revoking` state to `ClaimCard` to disable the button during revocation.

#### 1H. Update empty state
**Lines 211-216** — The current empty state says "No submissions yet." Update to reflect both submissions and claims:

```tsx
<div className="text-center py-12 text-neutral-400 bg-white rounded-2xl border border-neutral-200" data-testid="text-empty-skills">
  <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-40" />
  <p className="font-medium">No skills yet</p>
  <p className="text-sm mt-1">Submit a vendor URL above or claim a brand to get started</p>
</div>
```

Only show when `unifiedItems.length === 0`.

### Risk assessment
- All changes are contained within one existing file. No new pages, no new routes.
- The two API endpoints (`/api/v1/skills/submissions/mine` and `/api/v1/brands/claims/mine`) already exist and are tested.
- The `ClaimCard` reuses the same visual patterns as `SubmissionCard` — same rounded-2xl cards, same badge styling.
- The `handleRevoke` logic is a direct port from the existing claims page.

---

## Step 2: Claim Brand Modal

### What
A Dialog modal opened from the "Claim a Brand" button on the My Skills page. Uses the existing `Dialog` component from `components/ui/dialog.tsx`.

### Implementation
Add to `app/(dashboard)/skill-builder/submit/page.tsx`:

```tsx
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
```

Modal state (add to component):
```tsx
const [showClaimModal, setShowClaimModal] = useState(false);
const [claimSlug, setClaimSlug] = useState("");
const [claimSearchResults, setClaimSearchResults] = useState<{ slug: string; name: string }[]>([]);
const [claimSearching, setClaimSearching] = useState(false);
const [claiming, setClaiming] = useState(false);
const [claimError, setClaimError] = useState<string | null>(null);
const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
```

Modal JSX (placed at end of component, before closing `</div>`):

```tsx
<Dialog open={showClaimModal} onOpenChange={setShowClaimModal}>
  <DialogContent className="sm:max-w-md">
    <DialogTitle>Claim a Brand</DialogTitle>
    <DialogDescription>
      Search for a brand in the Skills Hub and request ownership. If your email domain matches the brand, it will be verified automatically.
    </DialogDescription>

    <div className="space-y-4 mt-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          value={claimSlug}
          onChange={handleClaimSearch}
          placeholder="Search brands..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          data-testid="input-claim-search"
        />
      </div>

      {claimSearchResults.length > 0 && (
        <div className="border border-neutral-200 rounded-xl max-h-48 overflow-y-auto">
          {claimSearchResults.map(brand => (
            <button
              key={brand.slug}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 transition-colors flex items-center justify-between border-b border-neutral-100 last:border-b-0"
              onClick={() => handleClaimBrand(brand.slug)}
              disabled={claiming}
              data-testid={`button-claim-${brand.slug}`}
            >
              <span className="font-medium">{brand.name}</span>
              <span className="text-xs text-neutral-400">{brand.slug}</span>
            </button>
          ))}
        </div>
      )}

      {claimError && (
        <div className="flex items-center gap-2 text-sm text-red-600" data-testid="text-claim-error">
          <AlertTriangle className="w-4 h-4" />
          {claimError}
        </div>
      )}
      {claimSuccess && (
        <div className="flex items-center gap-2 text-sm text-green-600" data-testid="text-claim-success">
          <CheckCircle2 className="w-4 h-4" />
          {claimSuccess}
        </div>
      )}
    </div>
  </DialogContent>
</Dialog>
```

#### Search handler
Uses the existing `GET /api/v1/bot/skills?search=X` endpoint to find brands:

```tsx
const handleClaimSearch = useCallback(
  debounce(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setClaimSlug(q);
    setClaimError(null);
    setClaimSuccess(null);
    if (q.trim().length < 2) {
      setClaimSearchResults([]);
      return;
    }
    setClaimSearching(true);
    try {
      const res = await fetch(`/api/v1/bot/skills?search=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setClaimSearchResults(
          (data.vendors || []).slice(0, 8).map((v: { slug: string; name: string }) => ({
            slug: v.slug,
            name: v.name,
          }))
        );
      }
    } catch {}
    setClaimSearching(false);
  }, 300),
  []
);
```

**Note on debounce:** Use a simple inline debounce implementation (3 lines) or import from a tiny utility. The codebase doesn't currently import lodash. A simple `setTimeout`/`clearTimeout` pattern is sufficient:

```tsx
const searchTimer = useRef<NodeJS.Timeout | null>(null);

const handleClaimSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
  const q = e.target.value;
  setClaimSlug(q);
  setClaimError(null);
  setClaimSuccess(null);
  if (searchTimer.current) clearTimeout(searchTimer.current);
  if (q.trim().length < 2) {
    setClaimSearchResults([]);
    return;
  }
  searchTimer.current = setTimeout(async () => {
    setClaimSearching(true);
    try {
      const res = await fetch(`/api/v1/bot/skills?search=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setClaimSearchResults(
          (data.vendors || []).slice(0, 8).map((v: { slug: string; name: string }) => ({
            slug: v.slug,
            name: v.name,
          }))
        );
      }
    } catch {}
    setClaimSearching(false);
  }, 300);
};
```

Add `import { useRef } from "react"` (already imported via `useState, useEffect`—just add `useRef, useCallback`).

#### Claim handler
Calls the existing `POST /api/v1/brands/[slug]/claim` endpoint:

```tsx
const handleClaimBrand = async (slug: string) => {
  setClaiming(true);
  setClaimError(null);
  setClaimSuccess(null);
  try {
    const res = await fetch(`/api/v1/brands/${slug}/claim`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setClaimError(data.message || "Claim failed");
    } else {
      setClaimSuccess(data.message);
      setClaimSearchResults([]);
      setClaimSlug("");
      fetchData();
    }
  } catch {
    setClaimError("Network error — please try again");
  }
  setClaiming(false);
};
```

### Risk assessment
- Uses existing Dialog component (Radix-based, well-tested in codebase).
- Uses existing search API (`/api/v1/bot/skills?search=`) — no new backend needed. **Note:** This is pragmatic for Phase 4 — we're routing human UI through the bot API to avoid creating a new endpoint. In Phase 5, when we clean up the data flow, this should be replaced with a dedicated internal route (`/api/internal/brands/search` or a server-side `storage.searchBrands()` call) so the bot API stays focused on external agent consumers.
- Uses existing claim API (`POST /api/v1/brands/[slug]/claim`) — no changes.
- All error states already defined by the claim API (unauthorized, already_claimed, free_email_blocked, pending_claim_exists).

---

## Step 3: Update sidebar navigation

### File: `components/dashboard/sidebar.tsx`

#### 3A. Rename "Submit Supplier" to "My Skills"
**Line 61** — Change the first item in `procurementNavItems`:

Old:
```typescript
{ icon: Send, label: "Submit Supplier", href: "/skill-builder/submit" },
```

New:
```typescript
{ icon: Sparkles, label: "My Skills", href: "/skill-builder/submit" },
```

Use `Sparkles` icon instead of `Send` to better represent a skills overview page. `Sparkles` is already imported (line 16).

#### 3B. No other sidebar changes needed
- "Skill Builder" (`/skill-builder/review`) stays — it's the admin review/edit tool.
- "Supplier Hub" (`/skills`) stays — it's the public catalog.
- No "My Brand Claims" link needed — claims are now part of My Skills.

### Risk assessment
- One-line change in an array. No structural change. Risk: none.

---

## Step 4: Update vendor detail BrandClaimButton

### File: `app/skills/[vendor]/page.tsx`

#### 4A. Non-logged-in users see the claim button → guides to registration
**Line 124** — Currently returns `null` for non-logged-in users. Change to show a subtle prompt:

Old:
```tsx
if (!user) return null;
```

New:
```tsx
if (!user) {
  return (
    <Link href="/login">
      <Button
        variant="ghost"
        size="sm"
        className="text-[11px] text-neutral-400 hover:text-primary rounded-full px-3 h-7"
        data-testid="button-claim-brand-login"
      >
        <Shield className="w-3 h-3 mr-1" />
        Claim this brand
      </Button>
    </Link>
  );
}
```

Import `Shield` — add to the existing lucide-react import block at the top of the file. Check if already imported: it's not currently in the `BrandClaimButton` section's local imports but `Shield` is NOT in the file's main import list (lines 7-85). Need to add it.

#### 4B. Verified/pending badges link to My Skills page
**Lines 126-140** — Wrap badges in `<Link href="/skill-builder/submit">`:

Old (verified):
```tsx
if (claimState === "verified") {
  return (
    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs border" data-testid="badge-claim-verified">
      <CheckCircle2 className="w-3 h-3 mr-1" /> Claimed
    </Badge>
  );
}
```

New (verified):
```tsx
if (claimState === "verified") {
  return (
    <Link href="/skill-builder/submit">
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs border cursor-pointer hover:bg-emerald-200/60 transition-colors" data-testid="badge-claim-verified">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Claimed
      </Badge>
    </Link>
  );
}
```

Same wrapping pattern for the pending badge (lines 134-140).

`Link` is already imported at line 2 of the file.

#### 4C. Make unclaimed button more subtle
**Lines 150-163** — Reduce visual weight of the "Claim Brand" button:

Old:
```tsx
<Button
  variant="outline"
  size="sm"
  className="text-xs rounded-full"
  onClick={handleClaim}
  disabled={claimState === "loading"}
  data-testid="button-claim-brand"
>
  {claimState === "loading" ? "Claiming..." : "Claim Brand"}
</Button>
```

New:
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

#### 4D. Badge text clarification: "Claimed" vs "Official"
The `BrandClaimButton` component only renders for the **logged-in claimer** — it shows their personal claim status ("Claimed", "Claim Pending"). Other visitors never see these badges. Instead, all visitors see the **maturity badge** from `MATURITY_CONFIG`, which already shows "Official" for brands with `maturity === 'official'`. This is correct behavior — "Official" is the public-facing label, "Claimed" is the private owner-facing label. No changes needed, but documenting this explicitly to avoid future confusion.

### Risk assessment
- Visual changes only to one component in one file. No functional change to the claim flow.
- The claim still happens via the same API call on click.
- Non-logged-in users now see the button (currently hidden) — this is intentional for discovery, linking to login.

---

## Step 5: Delete standalone claims page

### Action
Delete `app/brands/claims/page.tsx`.

### Verification before deletion
- No navigation links point to `/brands/claims` in production code (confirmed by codebase search).
- The vendor detail `BrandClaimButton` badges will now link to `/skill-builder/submit` (Step 4B).
- The sidebar will have "My Skills" pointing to `/skill-builder/submit` (Step 3A).
- All claim functionality (list, revoke) is now handled by the My Skills page (Step 1).

### Also check
- `app/brands/` directory — if `claims/` is the only subdirectory, delete the empty `brands/` directory too.

### Risk assessment
- Page has no inbound links. URL `/brands/claims` will 404 after deletion.
- All functionality has been ported to the My Skills page.

---

## Step 6: Move admin review queue into admin123

### Current state
`app/admin/brand-claims/page.tsx` (232 lines) renders the admin review queue at URL `/admin/brand-claims`. It uses the public layout (`<Nav />` + `<Footer />`), has its own client-side auth check, and links back to `/admin123`.

### Changes

#### 6A. Create `app/admin123/brand-claims/page.tsx`
Copy the content from `app/admin/brand-claims/page.tsx` with these modifications:

1. **Remove `<Nav />` and `<Footer />`** — The admin layout shell already provides `AppSidebar` + `Header`.
2. **Remove outer `<div className="min-h-screen ...">` wrapper** — Admin shell provides this.
3. **Remove `useAuth()` import and the client-side auth guard** (lines 34, 83-91) — The server-side layout at `app/admin123/layout.tsx` already gates on `user.flags.includes('admin')`. The page uses `useAuth` only for the auth check, not to pass user data to API calls (API calls use cookies).
4. **Remove `import { Nav } from "@/components/nav"` and `import { Footer } from "@/components/footer"`** — No longer needed.
5. **Keep the "Back to Admin" link** pointing to `/admin123` (it already does).
6. **Wrap page content in a simple fragment** — Just the content section, no full-page shell.

The resulting page structure:
```tsx
"use client";
// imports (same minus Nav, Footer, useAuth)

export default function AdminBrandClaimsPage() {
  const [claims, setClaims] = useState<PendingClaim[]>([]);
  const [fetching, setFetching] = useState(true);
  // ... same state and handlers ...

  useEffect(() => {
    fetch("/api/v1/brands/claims/review")
      .then(r => r.json())
      .then(data => setClaims(data.claims ?? []))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  return (
    <>
      <Link href="/admin123" className="..." data-testid="link-back-admin">
        <ArrowLeft className="w-4 h-4" /> Back to Admin
      </Link>
      {/* ... rest of page content unchanged ... */}
    </>
  );
}
```

#### 6B. Add Brand Claims card to admin dashboard
**File:** `app/admin123/page.tsx`, line 57 (end of `adminCards` array)

Add new entry:
```typescript
{
  icon: Shield,
  title: "Brand Claims",
  description: "Review and manage brand ownership claims.",
  href: "/admin123/brand-claims",
  ready: true,
},
```

`Shield` is already imported (line 11).

#### 6C. Delete old admin page
Delete `app/admin/brand-claims/page.tsx`. Check if `app/admin/` directory is now empty and delete if so.

### Risk assessment
- Old URL `/admin/brand-claims` was never linked from navigation — only from manual URL entry.
- New URL `/admin123/brand-claims` is behind server-side auth gate.
- Admin dashboard now has a direct link.
- The API endpoints remain unchanged — the page just calls them from a different route.

---

## Step 7: Update manual test checklist

### File: `tests/brand-claims/manual-checklist.md`

Add/update test scenarios:

1. **My Skills page — submissions visible**: Log in → navigate to My Skills (sidebar or `/skill-builder/submit`) → verify skill submissions appear in the list.
2. **My Skills page — claims visible**: Claim a brand via vendor detail page → navigate to My Skills → verify the claim appears in the unified list with "Brand Claim" badge and correct status.
3. **My Skills page — claim modal**: Click "Claim a Brand" button → verify modal opens → search for a brand → click to claim → verify success message and claim appears in list.
4. **My Skills page — revoke**: Find a verified claim in the list → click "Revoke" → confirm → verify status changes to "Revoked."
5. **Vendor detail — non-logged-in**: Visit a vendor detail page while logged out → verify "Claim this brand" button appears → click it → verify redirect to login.
6. **Vendor detail — badge links**: Visit a vendor where you have a claim → verify badge links to `/skill-builder/submit`.
7. **Old claims page removed**: Visit `/brands/claims` → verify 404.
8. **Admin dashboard card**: Log in as admin → visit `/admin123` → verify "Brand Claims" card appears → click → verify review queue loads at `/admin123/brand-claims`.
9. **Admin auth gate**: Log in as non-admin → visit `/admin123/brand-claims` → verify 404.
10. **Old admin URL removed**: Visit `/admin/brand-claims` → verify 404.

---

## Build order & dependencies

```
Step 1 (My Skills page)          ← no dependencies
Step 2 (Claim modal)             ← depends on Step 1 (added to same page)
Step 3 (Sidebar rename)          ← no dependencies, can parallel with Step 1
Step 4 (Vendor detail updates)   ← no dependencies, can parallel
Step 5 (Delete claims page)      ← depends on Steps 1, 2, 3, 4 (all references must be updated first)
Step 6 (Admin integration)       ← no dependencies, can parallel with Steps 1-4
Step 7 (Test checklist)          ← depends on all above
```

**Recommended build sequence:**
1. Steps 1+2 together (same file, sequential logic)
2. Steps 3, 4, 6 in parallel (different files, no dependencies)
3. Step 5 (deletion, after all references updated)
4. Step 7 (documentation)

---

## Files changed (complete list)

| File | Action | Step |
|------|--------|------|
| `app/(dashboard)/skill-builder/submit/page.tsx` | Edit: rename to My Skills, add claims fetch, unified list, claim modal, revoke handler | 1, 2 |
| `components/dashboard/sidebar.tsx` | Edit: rename "Submit Supplier" → "My Skills", change icon | 3 |
| `app/skills/[vendor]/page.tsx` | Edit: show claim button for non-logged-in, link badges to My Skills, subtle button style | 4 |
| `app/brands/claims/page.tsx` | Delete | 5 |
| `app/admin123/brand-claims/page.tsx` | Create: moved + adapted from admin/brand-claims (stripped Nav/Footer/auth) | 6A |
| `app/admin/brand-claims/page.tsx` | Delete | 6C |
| `app/admin123/page.tsx` | Edit: add Brand Claims card to adminCards array | 6B |
| `tests/brand-claims/manual-checklist.md` | Edit: add new test scenarios | 7 |

**8 file operations: 1 created, 2 deleted, 4 edited, 1 updated documentation.**
**Zero schema/DB changes. Zero new API endpoints. Zero new dependencies.**

---

## What is NOT in Phase 4 (deferred)

- Multi-user role system (admin/editor) — future phase
- `role` column on `brand_claims` — future phase
- Partial unique index change — future phase
- "You manage this" indicator on catalog grid cards — low priority, deferred
- Moving My Skills page to a new URL — stays at `/skill-builder/submit` for now to avoid breaking existing bookmarks/links

---

## Phase 5: Eliminate vendor registry — single source of truth (database only)

The in-memory TypeScript vendor registry (`VENDOR_REGISTRY` in `lib/procurement-skills/registry.ts`) will be **fully eliminated**. The database (`brand_index`) becomes the sole source of truth for all surfaces — bots, humans, and exports.

### Why this is urgent (but not a Phase 4 blocker)
Currently two sources of truth exist side by side:
- **Bot-facing API** (`/api/v1/bot/skills`) reads from `brand_index` in the database — correct, up to date.
- **Human-facing catalog** (`app/skills/page.tsx` and `app/skills/[vendor]/page.tsx`) imports `VENDOR_REGISTRY` and `getVendorBySlug()` from `lib/procurement-skills/registry.ts` — stale TypeScript files.

This means:
- Brand claims that update `maturity` to "official" in the DB are invisible on the catalog.
- New brands added through the Skill Builder pipeline appear for bots but not for humans.
- Filter facets (sectors, tiers) on the catalog only reflect the 14 hardcoded vendors, not new DB entries.

Phase 4 is unaffected because it works entirely through database-backed APIs (claims, submissions). No Phase 4 code touches the registry.

### What to do

#### 1. Switch catalog pages to database
- `app/skills/page.tsx` — Replace `VENDOR_REGISTRY` import with a server-side call to `storage.searchBrands()` or a dedicated internal API route. **Do NOT route through `/api/v1/bot/skills`** — that API is designed for external agent consumers with its own response shape, rate limiting, and auth model. The human-facing catalog should call storage directly (server component) or through a dedicated internal route (e.g. `/api/internal/brands/search`). Keep audiences separate even though they read from the same table. Use the facets response from `storage.getAllBrandFacets()` for filter sidebar options instead of computing from the in-memory array.
- `app/skills/[vendor]/page.tsx` — Replace `getVendorBySlug()` with a server-side call to `storage.getBrandBySlug()`.
- Remove the in-memory `.filter()` chains and use query parameters for filtering/sorting.
- Also switch the Phase 4 claim modal search from `/api/v1/bot/skills?search=` to the new internal route.

#### 2. Switch export route to database
- `/api/v1/skills/export` still imports `VENDOR_REGISTRY`. Switch to read from `brand_index`.

#### 3. Delete the vendor registry files
- Once all consumers are switched over, delete `lib/procurement-skills/registry.ts` and the individual vendor files in `lib/procurement-skills/vendors/`.
- Remove any remaining imports of `VENDOR_REGISTRY`, `getVendorBySlug`, `getAllVendors` across the codebase.

#### 4. "You manage this" indicator on catalog cards
- Once catalog reads from DB, optionally show a subtle badge on cards for brands the logged-in user has claimed.
- Requires client-side fetch to `/api/v1/brands/claims/mine` and cross-referencing with catalog results.

#### 5. Consider renaming the My Skills page URL
- Currently stays at `/skill-builder/submit` for backward compatibility.
- Once the switchover is stable, consider moving to a cleaner URL like `/my-skills` with a redirect from the old path.

---

## Phase 6: Master Skill Document

(Planned separately — see dedicated spec when ready.)

---

## Future: Multi-user role system (admin/editor)

- Add `role` column to `brand_claims` (`admin` / `editor`)
- Change partial unique index from `(brand_slug)` to `(brand_slug, claimer_uid)` WHERE status = 'verified'
- First verified claimer = admin, same-domain subsequent claimers = editor
- Admin revoke cascades to editors
- Update `verifyClaim` to only set `brand_index.claimed_by` for admin claims
