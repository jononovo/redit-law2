# Brand Claims — Manual Test Checklist

Use this checklist when testing the brand claims flow manually (as a human or AI agent).

## Prerequisites
- App running locally on port 5000
- At least one brand seeded in `brand_index` (e.g. staples, amazon)
- A logged-in user account with an email address

---

## 1. Claim Button Visibility (Vendor Detail Page)

- [ ] Visit `/skills/staples` while **logged out** → Subtle "Claim this brand" ghost button links to `/login`
- [ ] Visit `/skills/staples` while **logged in** → "Claim this brand" ghost button appears next to the maturity badge
- [ ] If the brand is already claimed by you → "Claimed" badge links to `/skill-builder/submit`
- [ ] If you have a pending claim → "Claim Pending" badge links to `/skill-builder/submit`
- [ ] If another user claimed it → "Already Claimed" badge appears

## 2. My Skills Page (`/skill-builder/submit`)

- [ ] Page heading says "My Skills"
- [ ] Stats row shows 4 cards: Submitted, Published, Acceptance Rate, Claimed
- [ ] Responsive: 2 columns on mobile, 4 on desktop
- [ ] "Claim a Brand" button opens a search modal
- [ ] Unified list shows both submissions and claims sorted by date (newest first)
- [ ] Claim cards show brand avatar, name (links to vendor detail), claim type badge, status badge
- [ ] Verified claims have a "Revoke" button

## 3. Claim Modal

- [ ] Search field searches brands via `/api/v1/bot/skills?search=X`
- [ ] Typing < 2 characters clears results
- [ ] Results show up to 8 brands with name and slug
- [ ] Clicking a brand triggers `POST /api/v1/brands/{slug}/claim`
- [ ] Success: modal shows green success message, list refreshes
- [ ] Error: modal shows red error message (e.g. "Brand claims require a corporate email address")

## 4. Domain-Match Auto-Verify (happy path)

- [ ] Log in with an email whose domain matches the brand's `domain` column (e.g. `user@staples.com` for the `staples` brand)
- [ ] Claim brand via modal → response shows `status: "verified"`, `claim_type: "domain_match"`
- [ ] Brand maturity badge should update to "Official"
- [ ] Claim appears in My Skills list with "Verified" status

## 5. Free Email Blocked

- [ ] Log in with a Gmail/Yahoo/Outlook account
- [ ] Claim brand via modal → should get error: "Brand claims require a corporate email address"
- [ ] No claim row should be created in the database

## 6. Manual Review (domain mismatch)

- [ ] Log in with a corporate email that doesn't match the brand domain
- [ ] Claim brand via modal → response shows `status: "pending"`, `claim_type: "manual_review"`
- [ ] Claim appears in My Skills list with "Pending Review" status
- [ ] Claiming the same brand again → error: "You already have a pending claim"

## 7. Revoke Flow

- [ ] On a verified claim in My Skills, click "Revoke" → confirmation dialog appears
- [ ] Confirm → claim status changes to "Revoked"
- [ ] Brand maturity reverts to "Community" (check `/skills/<slug>`)
- [ ] A different user can now claim the brand

## 8. Sidebar Navigation

- [ ] Sidebar shows "My Skills" (not "Submit Supplier") in the Skills section
- [ ] Icon is Sparkles (not Send)
- [ ] Link navigates to `/skill-builder/submit`

## 9. Admin Review Queue (`/admin123/brand-claims`)

- [ ] Only accessible via admin auth gate (admin123 layout checks admin flag)
- [ ] Shows all pending claims with brand info, email, domain match indicator
- [ ] "Verify" button → claim becomes verified, brand becomes Official, claim disappears from queue
- [ ] "Reject" button → rejection reason form appears, must fill reason, claim disappears from queue
- [ ] Brand Claims card appears on admin dashboard (`/admin123`)

## 10. Edge Cases

- [ ] Two users try to claim the same brand simultaneously → only one succeeds (partial unique index)
- [ ] Revoking a claim that is no longer the active `claim_id` on `brand_index` → brand_index is NOT changed (no-op on the brand side)
- [ ] Claiming a brand that doesn't exist in `brand_index` → 404 error

## 11. Deleted Pages

- [ ] `/brands/claims` → returns 404 (standalone claims page removed)
- [ ] `/admin/brand-claims` → returns 404 (moved to `/admin123/brand-claims`)

## 12. API Direct Tests (curl)

```bash
# Claim a brand (requires auth cookie)
curl -X POST http://localhost:5000/api/v1/brands/staples/claim

# List my claims
curl http://localhost:5000/api/v1/brands/claims/mine

# Revoke a claim
curl -X POST http://localhost:5000/api/v1/brands/claims/1/revoke

# Admin: list pending claims
curl http://localhost:5000/api/v1/brands/claims/review

# Admin: verify a claim
curl -X POST http://localhost:5000/api/v1/brands/claims/1/review \
  -H "Content-Type: application/json" \
  -d '{"action": "verify"}'

# Admin: reject a claim
curl -X POST http://localhost:5000/api/v1/brands/claims/1/review \
  -H "Content-Type: application/json" \
  -d '{"action": "reject", "reason": "Unable to verify ownership"}'
```
