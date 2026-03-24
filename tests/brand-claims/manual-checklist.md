# Brand Claims — Manual Test Checklist

Use this checklist when testing the brand claims flow manually (as a human or AI agent).

## Prerequisites
- App running locally on port 5000
- At least one brand seeded in `brand_index` (e.g. staples, amazon)
- A logged-in user account with an email address

---

## 1. Claim Button Visibility

- [ ] Visit `/skills/staples` while **logged out** → Claim button is NOT visible
- [ ] Visit `/skills/staples` while **logged in** → "Claim Brand" button appears next to the maturity badge
- [ ] If the brand is already claimed → button shows "Claimed" badge instead

## 2. Domain-Match Auto-Verify (happy path)

- [ ] Log in with an email whose domain matches the brand's `domain` column (e.g. `user@staples.com` for the `staples` brand)
- [ ] Click "Claim Brand" → response shows `status: "verified"`, `claim_type: "domain_match"`
- [ ] Brand maturity badge should update to "Official"
- [ ] Visit `/brands/claims` → claim appears with "Verified" status

## 3. Free Email Blocked

- [ ] Log in with a Gmail/Yahoo/Outlook account
- [ ] Click "Claim Brand" → should get error: "Brand claims require a corporate email address"
- [ ] No claim row should be created in the database

## 4. Manual Review (domain mismatch)

- [ ] Log in with a corporate email that doesn't match the brand domain
- [ ] Click "Claim Brand" → response shows `status: "pending"`, `claim_type: "manual_review"`
- [ ] Button changes to "Claim Pending" badge
- [ ] Clicking "Claim Brand" again → error: "You already have a pending claim"

## 5. My Claims Page (`/brands/claims`)

- [ ] Shows all claims for the logged-in user
- [ ] Each claim shows brand name, email used, date, and status badge
- [ ] Verified claims have a "Revoke" button
- [ ] Pending/rejected/revoked claims do NOT have a revoke button

## 6. Revoke Flow

- [ ] On a verified claim, click "Revoke" → confirmation dialog appears
- [ ] Confirm → claim status changes to "Revoked"
- [ ] Brand maturity reverts to "Community" (check `/skills/<slug>`)
- [ ] A different user can now claim the brand

## 7. Admin Review Queue (`/admin/brand-claims`)

- [ ] Only accessible to admin users (users with `admin` flag)
- [ ] Shows all pending claims with brand info, email, domain match indicator
- [ ] "Verify" button → claim becomes verified, brand becomes Official, claim disappears from queue
- [ ] "Reject" button → rejection reason form appears, must fill reason, claim disappears from queue

## 8. Edge Cases

- [ ] Two users try to claim the same brand simultaneously → only one succeeds (partial unique index)
- [ ] Revoking a claim that is no longer the active `claim_id` on `brand_index` → brand_index is NOT changed (no-op on the brand side)
- [ ] Claiming a brand that doesn't exist in `brand_index` → 404 error

## 9. API Direct Tests (curl)

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
