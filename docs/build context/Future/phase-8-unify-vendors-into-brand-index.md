# Phase 8: Unify Vendors Table into Brand Index

## Objective

Eliminate the standalone `vendors` table by absorbing its role into `brand_index`. After this phase, `brand_index` is the single canonical record for every brand/merchant in the system. The `merchant_accounts` and `orders` tables point to `brand_index` instead of `vendors`. The "vendor" naming convention is retired in favor of "brand" across all affected code paths.

## Why this matters

Today, the same real-world entity (e.g., Amazon) exists in two unconnected tables:

| Table | Fields | Purpose |
|---|---|---|
| `vendors` | slug, name, websiteUrl, logoUrl, vendorType, orderingSystem, config, supportedCountries | Parent record for `merchant_accounts` and `orders` |
| `brand_index` | slug, name, url, logoUrl, domain, description, sector, tier, capabilities, agentReadiness, brandData, skillMd, + 30 more columns | Agent-searchable catalog, skill registry, brand claims |

Problems:
1. **No formal link** — they share the same slug by coincidence, but there's no foreign key. A brand can exist in `brand_index` without a corresponding `vendors` row, and vice versa.
2. **Duplicated basic info** — slug, name, logoUrl, websiteUrl/url, supportedCountries all appear in both tables.
3. **Naming confusion** — "Vendor" vs "Brand" refers to the same thing. `merchant_accounts.vendorId` points to `vendors.id`, but conceptually it's "my account at this brand." The `orders.vendorId` field also points to `vendors.id`, creating a parallel naming system.
4. **Any brand should be able to have merchant accounts** — right now, only brands that happen to exist in the `vendors` table (a separate, manually populated table) can have merchant accounts linked. If a brand is in `brand_index` (e.g., added through the Skill Builder), there's no way to attach a merchant account to it without also inserting a `vendors` row.

## What the `vendors` table has that `brand_index` doesn't

| `vendors` column | `brand_index` equivalent | Action |
|---|---|---|
| `id` (serial PK) | `id` (serial PK) | Use `brand_index.id` as the new FK target |
| `slug` | `slug` | Already exists, identical |
| `name` | `name` | Already exists, identical |
| `websiteUrl` | `url` | Already exists (different column name) |
| `logoUrl` | `logoUrl` | Already exists, identical |
| `vendorType` | No direct equivalent | Absorb — see Step 2 |
| `orderingSystem` | `ordering` column exists | Map `orderingSystem` values into `ordering` |
| `config` (JSONB) | `brandData` (JSONB) could hold this | Absorb into `brandData` or new column — see Step 2 |
| `supportedCountries` | `supportedCountries` | Already exists, identical |

**Only 2-3 fields need new homes**: `vendorType`, `orderingSystem` (partially covered by `ordering`), and `config`.

## Dependencies

- **Phase 5 must be complete first** — Phase 5 eliminates the `VENDOR_REGISTRY` TypeScript files and switches the catalog to read from `brand_index`. This phase then eliminates the `vendors` DB table, completing the consolidation.

## Current consumers of `vendors` table

### Schema (`shared/schema.ts`)
- `vendors` table definition (line 1064)
- `Vendor` / `InsertVendor` types (line 1080-1081)
- `insertVendorSchema` (line 1083)
- `merchantAccounts.vendorId` → references `vendors.id` (line 1097)
- `orders.vendorId` → references `vendors.id` (line 1137)

### Storage layer
- `server/storage/vendors.ts` — `vendorMethods` object with 8 methods:
  - `getVendorBySlug`, `getVendorById`, `getAllVendors`
  - `createMerchantAccount`, `getMerchantAccountsByOwner`, `getMerchantAccountByVendor`, `updateMerchantAccount`, `deleteMerchantAccount`
- `server/storage/types.ts` — IStorage interface includes all 8 methods (lines 305-312)
- `server/storage/index.ts` — composes `vendorMethods`

### API routes
- `app/api/v1/vendors/route.ts` — `GET /api/v1/vendors` returns all vendors
- `app/api/v1/merchant-accounts/route.ts` — `GET` lists user's accounts, `POST` creates one (validates `vendorId` against `vendors` table)
- `app/api/v1/merchant-accounts/[id]/route.ts` — `PATCH` and `DELETE` for individual accounts

### Order creation
- `lib/orders/create.ts` — `recordOrder()` passes `vendor` (string) and `vendorId` (int, optional) to `createOrder`
- `app/api/v1/bot/merchant/checkout/route.ts` — sets `vendor: data.merchant_name` on orders
- Various fulfillment files (`lib/approvals/rail1-fulfillment.ts`, `rail2-fulfillment.ts`, `rail4-fulfillment.ts`, `rail5-fulfillment.ts`) — call `recordOrder`

### Seed script
- `scripts/seed-brand-index.ts` — seeds `brand_index` (does NOT seed `vendors`)

---

## Implementation Plan

### Step 1: Add missing columns to `brand_index`

Add 2 columns to `brand_index` that exist on `vendors` but have no equivalent:

```sql
ALTER TABLE brand_index ADD COLUMN vendor_type text;
ALTER TABLE brand_index ADD COLUMN merchant_config jsonb;
```

- `vendor_type` — stores the vendor classification (if any). Maps from `vendors.vendorType`.
- `merchant_config` — stores operational config for merchant integrations (login URLs, API keys, ordering system specifics). This is distinct from `brandData` which holds skill/catalog data.

Update `shared/schema.ts` to add these columns to the `brandIndex` table definition.

**Note on `orderingSystem`**: The `brand_index` table already has an `ordering` column (text). The `vendors.orderingSystem` values should map into this during data migration. If the values differ semantically, we reconcile during Step 4.

### Step 2: Rename `merchant_accounts.vendorId` → `merchant_accounts.brandId`

Schema migration:

```sql
ALTER TABLE merchant_accounts RENAME COLUMN vendor_id TO brand_id;
```

This column will now reference `brand_index.id` instead of `vendors.id`.

Update in `shared/schema.ts`:
- Rename `vendorId` → `brandId` on the `merchantAccounts` table definition
- Update `insertMerchantAccountSchema` to use `brandId`
- Update `MerchantAccount` type (auto-inferred, no manual change needed)

### Step 3: Update `orders` table references

The `orders` table has two vendor-related fields:
- `vendorId` (integer, optional) — currently points to `vendors.id`
- `vendor` (text, optional) — stores the merchant name as a free-text string

**Approach**: Rename `vendorId` → `brandId`. Keep `vendor` as-is for now (it's a display string, not a FK). Consider renaming it to `brandName` or `merchantName` in a future pass — this is cosmetic and doesn't affect data integrity.

```sql
ALTER TABLE orders RENAME COLUMN vendor_id TO brand_id;
```

Update `shared/schema.ts`, `insertOrderSchema`, and `lib/orders/create.ts`.

### Step 4: Data migration — merge `vendors` rows into `brand_index`

Write a migration script that:

1. For each row in `vendors`:
   a. Find the matching `brand_index` row by slug
   b. If found: copy `vendorType` → `vendor_type`, `config` → `merchant_config`, reconcile `orderingSystem` with `ordering`
   c. If NOT found: insert a minimal `brand_index` row with the vendor's basic info (slug, name, url, logo) and set `maturity = 'draft'`, `submittedBy = 'system'`, `brandData = {}`, `description = name`
2. Update `merchant_accounts`: set `brand_id` = the matching `brand_index.id` for each row (join on `vendors.id` → `vendors.slug` → `brand_index.slug`)
3. Update `orders`: set `brand_id` = the matching `brand_index.id` for each row where `vendor_id` was set

This must be a single transaction to maintain referential integrity.

**Validation query after migration:**
```sql
-- Every merchant_account should have a valid brand_id
SELECT ma.id, ma.brand_id 
FROM merchant_accounts ma 
LEFT JOIN brand_index bi ON bi.id = ma.brand_id 
WHERE bi.id IS NULL;

-- Should return 0 rows
```

### Step 5: Rewrite storage layer

**Replace** `server/storage/vendors.ts` with updated methods:

Old methods → New methods:
| Old | New | Change |
|---|---|---|
| `getVendorBySlug(slug)` | Remove (use existing `getBrandBySlug`) | Already exists in brand-index storage |
| `getVendorById(id)` | Remove (use existing `getBrandById` or add if missing) | Brand index lookup by ID |
| `getAllVendors()` | Remove (use existing `searchBrands({})`) | Already exists |
| `createMerchantAccount(data)` | `createMerchantAccount(data)` | Change `vendorId` → `brandId` in schema reference |
| `getMerchantAccountsByOwner(uid)` | `getMerchantAccountsByOwner(uid)` | No logic change, field rename only |
| `getMerchantAccountByVendor(uid, vendorId)` | `getMerchantAccountByBrand(uid, brandId)` | Rename method + parameter |
| `updateMerchantAccount(id, updates)` | `updateMerchantAccount(id, updates)` | No change |
| `deleteMerchantAccount(id)` | `deleteMerchantAccount(id)` | No change |

The merchant account methods stay in a storage file (rename to `server/storage/merchant-accounts.ts` for clarity). The vendor-specific lookup methods are removed since `brand-index.ts` already provides them.

Update `server/storage/types.ts` (IStorage interface) and `server/storage/index.ts` accordingly.

### Step 6: Update API routes

#### 6A: `app/api/v1/vendors/route.ts` → Deprecate or redirect

Option A (recommended): Rewrite to return brands from `brand_index` instead of `vendors`:
```tsx
const brands = await storage.searchBrands({ limit: 500, sortBy: "name", sortDir: "asc" });
return NextResponse.json({ vendors: brands }); // keep response shape for backward compat
```

Option B: Delete the route entirely if no external consumers depend on it.

#### 6B: `app/api/v1/merchant-accounts/route.ts`

- POST handler: Change `storage.getVendorById(parsed.data.vendorId)` → `storage.getBrandById(parsed.data.brandId)` (or similar)
- Accept `brandId` in the request body instead of `vendorId`
- Keep backward compatibility: if `vendorId` is sent, treat it as `brandId` (with deprecation log)

#### 6C: `app/api/v1/merchant-accounts/[id]/route.ts`

No changes needed — operates on `merchant_accounts.id`, doesn't reference `vendorId` directly.

### Step 7: Update order creation

- `lib/orders/create.ts` — rename `vendorId` → `brandId` in the `OrderInput` type and `recordOrder` function
- `lib/orders/types.ts` — update `OrderInput` interface
- `app/api/v1/bot/merchant/checkout/route.ts` — where it passes `vendor: data.merchant_name` and `vendorDetails`, optionally look up the `brand_index.id` by merchant name/URL slug and pass `brandId`
- Fulfillment files (`rail1-fulfillment.ts` through `rail5-fulfillment.ts`) — update `recordOrder` calls if they pass `vendorId`

### Step 8: Drop the `vendors` table

After all references are migrated:

```sql
DROP TABLE vendors;
```

Remove from `shared/schema.ts`:
- `vendors` table definition
- `Vendor` / `InsertVendor` types
- `insertVendorSchema`

Run the codebase-wide search:
```bash
grep -r "vendors" --include="*.ts" --include="*.tsx"
```

Clean up any remaining references (imports, type annotations, comments).

### Step 9: Update documentation

- Update `replit.md` — remove vendors table references, note unified brand model
- Update any API docs that reference `/api/v1/vendors`
- Update Phase 5 plan if needed (it references `getVendorBySlug` on the vendors storage as "unrelated" — it won't exist anymore)

---

## Naming conventions after this phase

| Before | After |
|---|---|
| `vendors` table | Deleted — `brand_index` is the single source |
| `Vendor` type | `BrandIndex` type |
| `vendorId` (on merchant_accounts) | `brandId` |
| `vendorId` (on orders) | `brandId` |
| `vendor` (text on orders) | Keep as-is (display string) or rename to `merchantName` |
| `getVendorBySlug` (vendors storage) | `getBrandBySlug` (brand-index storage, already exists) |
| `getAllVendors` | `searchBrands({})` (already exists) |
| `/api/v1/vendors` | Deprecated or rewritten to serve from `brand_index` |
| `merchant_accounts` table | Stays (name is accurate — it's the user's account at a merchant/brand) |

---

## Risk assessment

### Low risk
- **Column renames are safe** — `ALTER TABLE RENAME COLUMN` is metadata-only in PostgreSQL, instant, no data rewrite
- **No data loss** — all vendor data is migrated into brand_index before the table is dropped
- **Merchant account CRUD is simple** — 5 methods with straightforward field renames

### Medium risk
- **Data migration script correctness** — the slug-based join between `vendors` and `brand_index` must match every row. Any `vendors` row without a `brand_index` match needs a new brand_index insert. Validate with counts before and after.
- **API backward compatibility** — if external bots call `POST /api/v1/merchant-accounts` with `vendorId`, they'll break unless we accept both `vendorId` and `brandId` during a transition period
- **Orders with orphaned vendorId** — old orders may reference a `vendors.id` that maps to a different `brand_index.id`. The migration script must handle this mapping correctly.

### Mitigations
- Run migration in a transaction with rollback capability
- Add backward-compatible `vendorId` alias in merchant-accounts API for one release cycle
- Validate all FK mappings with SQL queries before dropping the vendors table
- Keep a backup of the vendors table data (export to JSON) before dropping

---

## Files touched (summary)

| Operation | File | Description |
|---|---|---|
| Edit | `shared/schema.ts` | Add columns to brandIndex, rename vendorId→brandId on merchant_accounts and orders, remove vendors table |
| Create | Migration script | Data migration: merge vendors into brand_index, remap FKs |
| Rewrite | `server/storage/vendors.ts` → `server/storage/merchant-accounts.ts` | Keep merchant account methods, remove vendor lookups |
| Edit | `server/storage/types.ts` | Update IStorage interface |
| Edit | `server/storage/index.ts` | Swap vendorMethods for merchantAccountMethods |
| Edit | `app/api/v1/vendors/route.ts` | Rewrite to use brand_index or deprecate |
| Edit | `app/api/v1/merchant-accounts/route.ts` | vendorId → brandId |
| Edit | `app/api/v1/merchant-accounts/[id]/route.ts` | Minor if any |
| Edit | `lib/orders/create.ts` | vendorId → brandId |
| Edit | `lib/orders/types.ts` | Update OrderInput type |
| Edit | `app/api/v1/bot/merchant/checkout/route.ts` | Update vendor references |
| Edit | `lib/approvals/rail*-fulfillment.ts` (4 files) | Update recordOrder calls if they pass vendorId |
| Edit | `scripts/seed-brand-index.ts` | Optionally seed merchant_config/vendor_type |
| Delete | `vendors` table (via migration) | After all references are migrated |

---

## Open questions for discussion

1. **Should `merchant_accounts` be renamed to `brand_accounts`?** — Conceptually it's "my account at this brand." The name `merchant_accounts` still makes sense (merchant = the entity you buy from), but `brand_accounts` would be more consistent with the unified naming. This is cosmetic and can be done now or later.

2. **Should `orders.vendor` (the free-text string field) be renamed?** — It stores the merchant name as a display string. Renaming to `merchantName` or `brandName` is cosmetic. Could be done now for consistency or left as-is to avoid touching historical data display code.

3. **Backward compatibility period for `/api/v1/vendors` and `vendorId` in POST bodies** — How long should we accept the old field names? One suggestion: accept both for one release, then drop the old names.

4. **Should the `vendors/` directory in `lib/procurement-skills/` be renamed to `brands/` as part of this phase?** — It was discussed previously. Since we're already doing a naming cleanup, this could be bundled in. Only the seed script imports from it.
