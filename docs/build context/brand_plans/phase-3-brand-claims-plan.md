# Phase 3: Brand Claims — Technical Plan

## Overview

Brand claims allow brand owners to prove they represent a brand in the `brand_index`, upgrading its maturity from `community`/`draft` to `official`. Verification is instant when the claimer's email domain matches the brand's domain. Free email providers are blocked. Claims can be revoked, reverting maturity to `community`.

---

## Architecture

### New table: `brand_claims`

```sql
CREATE TABLE brand_claims (
  id              serial PRIMARY KEY,
  brand_slug      text NOT NULL,           -- references brand_index.slug
  claimer_uid     text NOT NULL,           -- Firebase UID
  claimer_email   text NOT NULL,           -- email used to claim
  claim_type      text NOT NULL DEFAULT 'domain_match',  -- domain_match, manual_review
  status          text NOT NULL DEFAULT 'pending',       -- pending, verified, rejected, revoked
  rejection_reason text,                   -- populated on rejection
  verified_at     timestamp,
  revoked_at      timestamp,
  reviewed_by     text,                    -- admin UID who reviewed (for manual claims)
  created_at      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX brand_claims_brand_slug_idx ON brand_claims (brand_slug);
CREATE INDEX brand_claims_claimer_uid_idx ON brand_claims (claimer_uid);
CREATE INDEX brand_claims_status_idx ON brand_claims (status);
CREATE UNIQUE INDEX brand_claims_active_claim_idx ON brand_claims (brand_slug) WHERE status = 'verified';
```

The unique partial index on `(brand_slug) WHERE status = 'verified'` ensures only one active claim per brand at any time.

### Relationship to `brand_index`

When a claim is verified:
- `brand_index.claimed_by` → claimer's UID
- `brand_index.claim_id` → this claim's ID
- `brand_index.maturity` → `'official'`
- `brand_index.submitter_type` → `'brand_verified'`

When a claim is revoked:
- `brand_index.claimed_by` → `null`
- `brand_index.claim_id` → `null`
- `brand_index.maturity` → `'community'` (data is still valid, just unowned)
- `brand_index.submitter_type` → unchanged (keeps historical record)

---

## Domain verification logic

### Auto-verify conditions

A claim is auto-verified when the claimer's email domain matches the brand's `domain` column in `brand_index`. Matching rules:

1. **Exact match**: email `@staples.com` + brand domain `staples.com` → verified
2. **Subdomain match (email is subdomain)**: email `@shop.nike.com` + brand domain `nike.com` → verified
3. **Subdomain match (brand is subdomain)**: email `@staples.com` + brand domain `shop.staples.com` → verified (parent domain ownership implies subdomain ownership)

### Implementation

```typescript
function domainsMatch(emailDomain: string, brandDomain: string): boolean {
  const e = emailDomain.toLowerCase();
  const b = brandDomain.toLowerCase();
  if (e === b) return true;
  if (e.endsWith('.' + b)) return true;  // email is subdomain of brand
  if (b.endsWith('.' + e)) return true;  // brand is subdomain of email
  return false;
}
```

### Free email provider blocklist

Maintain a constant array of blocked domains. Block claims from these domains entirely (return 400, not a manual review):

```typescript
const FREE_EMAIL_PROVIDERS = [
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.co.jp",
  "hotmail.com", "outlook.com", "live.com", "msn.com",
  "aol.com",
  "icloud.com", "me.com", "mac.com",
  "protonmail.com", "proton.me",
  "zoho.com",
  "yandex.com", "yandex.ru",
  "mail.com", "email.com",
  "gmx.com", "gmx.net",
  "tutanota.com", "tuta.io",
  "fastmail.com",
  "hey.com",
];
```

Store this in `lib/brand-claims/blocklist.ts`.

### Manual review fallback

When the email domain does NOT match the brand domain and is NOT a free provider, the claim enters `pending` status with `claim_type = 'manual_review'`. An admin can later verify or reject it.

---

## API endpoints

### `POST /api/v1/brands/[slug]/claim`

**Auth**: Required (Firebase session)

**Request body**: None (uses the authenticated user's email)

**Flow**:
1. Verify user is authenticated, has an email
2. Look up brand by slug in `brand_index`
3. Check brand exists and is not already claimed (`claimed_by IS NULL`)
4. Check no pending claim exists for this brand by this user
5. Extract email domain, check against free provider blocklist → 400 if blocked
6. Check if brand has a `domain` column value
7. If domain matches → create claim with `status = 'verified'`, update `brand_index` immediately
8. If domain doesn't match or brand has no domain → create claim with `status = 'pending'`, `claim_type = 'manual_review'`
9. Return claim object with status

**Response** (auto-verified):
```json
{
  "claim": { "id": 1, "status": "verified", "claim_type": "domain_match" },
  "brand": { "slug": "staples", "maturity": "official", "claimed_by": "uid123" },
  "message": "Brand claimed successfully. Your email domain matches the brand domain."
}
```

**Response** (pending review):
```json
{
  "claim": { "id": 2, "status": "pending", "claim_type": "manual_review" },
  "message": "Claim submitted for review. Your email domain does not match the brand domain."
}
```

**Error cases**:
- 401: Not authenticated
- 400: Free email provider
- 404: Brand not found
- 409: Brand already claimed / pending claim exists

### `GET /api/v1/brands/claims/mine`

**Auth**: Required

Returns all claims for the current user, grouped by status.

**Response**:
```json
{
  "claims": [
    { "id": 1, "brand_slug": "staples", "brand_name": "Staples", "status": "verified", "created_at": "..." },
    { "id": 2, "brand_slug": "nike", "status": "pending", "created_at": "..." }
  ]
}
```

### `POST /api/v1/brands/claims/[id]/revoke`

**Auth**: Required (must be the claimer OR an admin)

Revokes an active claim. Updates `brand_index` to remove ownership.

### `GET /api/v1/brands/claims/review` (admin)

**Auth**: Required + admin flag check (`flags.includes('admin')`)

Lists all pending claims for manual review. Returns claimer info and brand info for context.

### `POST /api/v1/brands/claims/[id]/review` (admin)

**Auth**: Required + admin flag

**Request body**: `{ "action": "verify" | "reject", "reason?": "string" }`

On verify: same as auto-verify flow.
On reject: `status → 'rejected'`, `rejection_reason` populated.

---

## Storage layer

### New file: `server/storage/brand-claims.ts`

```typescript
interface BrandClaimMethods {
  createBrandClaim(data: InsertBrandClaim): Promise<BrandClaim>;
  getBrandClaimById(id: number): Promise<BrandClaim | null>;
  getActiveClaimForBrand(brandSlug: string): Promise<BrandClaim | null>;
  getPendingClaimForBrand(brandSlug: string, claimerUid: string): Promise<BrandClaim | null>;
  getClaimsByUser(claimerUid: string): Promise<BrandClaim[]>;
  getPendingClaims(): Promise<BrandClaim[]>;  // admin review queue
  verifyClaim(id: number, reviewedBy?: string): Promise<BrandClaim>;
  rejectClaim(id: number, reason: string, reviewedBy: string): Promise<BrandClaim>;
  revokeClaim(id: number): Promise<BrandClaim>;
}
```

`verifyClaim` is a transaction that:
1. Updates `brand_claims.status` → `'verified'`, sets `verified_at`
2. Updates `brand_index.claimed_by`, `claim_id`, `maturity` → `'official'`, `submitter_type` → `'brand_verified'`

`revokeClaim` is a transaction that:
1. Updates `brand_claims.status` → `'revoked'`, sets `revoked_at`
2. Updates `brand_index.claimed_by` → null, `claim_id` → null, `maturity` → `'community'`

### Wire into IStorage

Add all `BrandClaimMethods` to `IStorage` in `server/storage/types.ts`. Import types from schema. Wire `brandClaimMethods` into `server/storage/index.ts`.

---

## Domain helper module

### New file: `lib/brand-claims/domain.ts`

Exports:
- `extractEmailDomain(email: string): string`
- `domainsMatch(emailDomain: string, brandDomain: string): boolean`
- `isFreeEmailProvider(emailDomain: string): boolean`
- `canAutoVerifyClaim(email: string, brandDomain: string | null): "auto_verify" | "manual_review" | "blocked"`

### New file: `lib/brand-claims/blocklist.ts`

Exports `FREE_EMAIL_PROVIDERS: string[]`

---

## UI components

### Claim button on brand detail page

Location: `app/skills/[vendor]/page.tsx`

Add a "Claim this brand" button visible to authenticated users when `brand.claimed_by === null`. The button:
- Shows "Claim this brand" when unclaimed
- Shows "Official — Claimed by you" when claimed by current user
- Shows "Official — Claimed" when claimed by someone else
- Opens a confirmation dialog explaining that claiming requires a matching corporate email
- On submit, calls `POST /api/v1/brands/[slug]/claim`
- Shows success/pending/error state

### My Claims page

Location: `app/brands/claims/page.tsx`

A dashboard showing the user's claims with status badges (verified/pending/rejected/revoked) and the ability to revoke active claims.

### Admin review queue

Location: `app/admin/brand-claims/page.tsx`

Table of pending claims with:
- Brand name + domain
- Claimer email + domain
- Domain match indicator (visual comparison)
- Verify / Reject buttons with reason input for rejections

---

## File inventory

| File | Action | Purpose |
|------|--------|---------|
| `shared/schema.ts` | Modify | Add `brandClaims` table definition + types |
| `lib/brand-claims/domain.ts` | Create | Domain matching + auto-verify logic |
| `lib/brand-claims/blocklist.ts` | Create | Free email provider blocklist |
| `server/storage/brand-claims.ts` | Create | Storage methods with transactional verify/revoke |
| `server/storage/types.ts` | Modify | Add BrandClaim methods to IStorage |
| `server/storage/index.ts` | Modify | Wire brandClaimMethods |
| `app/api/v1/brands/[slug]/claim/route.ts` | Create | POST claim endpoint |
| `app/api/v1/brands/claims/mine/route.ts` | Create | GET user's claims |
| `app/api/v1/brands/claims/[id]/revoke/route.ts` | Create | POST revoke endpoint |
| `app/api/v1/brands/claims/review/route.ts` | Create | GET admin review queue |
| `app/api/v1/brands/claims/[id]/review/route.ts` | Create | POST admin verify/reject |
| `app/skills/[vendor]/page.tsx` | Modify | Add claim button + status badge |
| `app/brands/claims/page.tsx` | Create | My Claims dashboard |
| `app/admin/brand-claims/page.tsx` | Create | Admin review queue UI |
| `drizzle/0008_*.sql` | Generate | Migration for brand_claims table |

---

## Build order

### Step 1: Schema + migration
- Add `brandClaims` table to `shared/schema.ts`
- Generate and run Drizzle migration
- Add partial unique index via custom SQL

### Step 2: Domain helpers
- Create `lib/brand-claims/blocklist.ts`
- Create `lib/brand-claims/domain.ts`

### Step 3: Storage layer
- Create `server/storage/brand-claims.ts`
- Update `IStorage` interface
- Wire into storage index

### Step 4: API endpoints
- `POST /api/v1/brands/[slug]/claim`
- `GET /api/v1/brands/claims/mine`
- `POST /api/v1/brands/claims/[id]/revoke`
- `GET /api/v1/brands/claims/review` (admin)
- `POST /api/v1/brands/claims/[id]/review` (admin)

### Step 5: UI
- Claim button on `app/skills/[vendor]/page.tsx`
- My Claims page at `app/brands/claims/page.tsx`
- Admin review queue at `app/admin/brand-claims/page.tsx`

Steps 1-3 have no dependencies on each other's internals and could be parallelized. Step 4 depends on Steps 1-3. Step 5 depends on Step 4.

---

## Edge cases

1. **Brand has no domain**: All claims go to manual review (no auto-verify possible)
2. **User already has a pending claim for the brand**: Return 409
3. **Brand already claimed by someone else**: Return 409 with message explaining brand is taken
4. **User claims multiple brands**: Allowed — no limit on claims per user
5. **Admin revokes a claim**: Same as user revoke but bypasses ownership check
6. **Brand is deleted from brand_index**: Claims table references slug as text, not FK — orphan claims are harmless
7. **User's email changes after claim**: Claim remains valid — verification was point-in-time
8. **Concurrent claim attempts**: The partial unique index on `(brand_slug) WHERE status = 'verified'` prevents race conditions at the DB level
