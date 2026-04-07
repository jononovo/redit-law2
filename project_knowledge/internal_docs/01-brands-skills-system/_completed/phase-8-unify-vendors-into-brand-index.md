# Phase 8: Unify Vendors Table into Brand Index

## Objective

Eliminate the standalone `vendors` table by absorbing its role into `brand_index`. After this phase, `brand_index` is the single canonical record for every brand/merchant in the system. The `merchant_accounts` table is renamed to `brand_login_accounts` and points to `brand_index` instead of `vendors`. The "vendor" naming convention is retired in favor of "brand" across all affected code paths.

Additionally: clean up the tier taxonomy by removing `marketplace` and `wholesale` (these are brand types, not price tiers), and add a proper `brand_type` field.

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
5. **Tier taxonomy is polluted** — `marketplace` and `wholesale` are in the tier list but they describe business model types, not affordability/price positioning. Tier should be a pure affordability scale.

## What the `vendors` table has that `brand_index` doesn't

| `vendors` column | `brand_index` equivalent | Action |
|---|---|---|
| `id` (serial PK) | `id` (serial PK) | Use `brand_index.id` as the new FK target |
| `slug` | `slug` | Already exists, identical |
| `name` | `name` | Already exists, identical |
| `websiteUrl` | `url` | Already exists (different column name) |
| `logoUrl` | `logoUrl` | Already exists, identical |
| `vendorType` | No direct equivalent | Add as `brand_type` column — see Step 1 |
| `orderingSystem` | `ordering` column exists | Map `orderingSystem` values into `ordering` |
| `config` (JSONB) | `brandData` (JSONB) could hold this | Absorb into `brandData` — see Step 1 |
| `supportedCountries` | `supportedCountries` | Already exists, identical |

**Only `vendorType` needs a new column.** `orderingSystem` maps to existing `ordering`. `config` can be absorbed into `brandData` (it's operational metadata that lives alongside the skill data).

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

### Step 1: Add `brand_type` column to `brand_index` + taxonomy

Add a `brand_type` column to `brand_index`:

```sql
ALTER TABLE brand_index ADD COLUMN brand_type text;
```

**Defined values for `brand_type`:**

| Value | Label | Description | Examples | Agent relevance |
|---|---|---|---|---|
| `brand` | Brand (D2C) | Makes and sells their own products directly to consumers | Nike.com, Apple Store, Warby Parker | Real stock, single source of truth on availability, fast fulfillment |
| `retailer` | Retailer | Buys inventory from brands and resells | Target, Foot Locker, Best Buy, Sephora | Owns stock, reliable delivery, prices may vary |
| `marketplace` | Marketplace | Platform connecting third-party sellers | Amazon, eBay, Etsy, Alibaba | Mixed reliability — depends on seller, variable shipping, potential duplication |
| `chain` | Chain Store | Multi-location standardized retail with centralized purchasing | Walmart, Kroger, Costco, Home Depot | Centralized stock, consistent pricing, bulk buying |
| `independent` | Independent / Small Business | Single-owner, single or few locations | Local hardware store, indie boutique, artisan shop | Unique products, limited stock, worth highlighting for specialty/craft |

Create taxonomy file: `lib/procurement-skills/taxonomy/brand-types.ts`

```typescript
export type BrandType =
  | "brand"
  | "retailer"
  | "marketplace"
  | "chain"
  | "independent";

export const BRAND_TYPE_LABELS: Record<BrandType, string> = {
  brand: "Brand (D2C)",
  retailer: "Retailer",
  marketplace: "Marketplace",
  chain: "Chain Store",
  independent: "Independent",
};
```

Update `shared/schema.ts` to add `brandType` to the `brandIndex` table definition.

**Note on `config` JSONB from vendors table**: Any existing `config` data (merchant integration settings) will be merged into the `brandData` JSONB field during data migration. No new column needed — `brandData` already holds the full operational profile.

### Step 1A-addendum: Add `getBrandById` storage method

**Gap identified during review:** The current brand-index storage only has `getBrandBySlug(slug)`. There is no `getBrandById(id)` method. This is needed because:
- The merchant-accounts POST handler currently validates `storage.getVendorById(vendorId)` before creating an account
- After migration, it needs `storage.getBrandById(brandId)` to validate the brand exists

**Add to** `server/storage/brand-index.ts`:
```typescript
async getBrandById(id: number): Promise<BrandIndex | null> {
  const [brand] = await db.select().from(brandIndex).where(eq(brandIndex.id, id)).limit(1);
  return brand || null;
}
```

Add to `IStorage` interface in `server/storage/types.ts` and compose in `server/storage/index.ts`.

### Step 1B: Clean up tier taxonomy

**Remove `marketplace` and `wholesale` from tier.** These are business model types, not price positioning tiers. Tier should be a pure affordability scale.

**Edit:** `lib/procurement-skills/taxonomy/tiers.ts`

Before:
```typescript
export type VendorTier =
  | "top_luxury" | "luxury" | "premium" | "mid_range"
  | "value" | "fast_fashion" | "utility"
  | "wholesale" | "marketplace";
```

After:
```typescript
export type BrandTier =
  | "ultra_luxury" | "luxury" | "premium" | "mid_range"
  | "value" | "budget" | "commodity";
```

Full replacement of `TIER_LABELS`:
```typescript
export const BRAND_TIER_LABELS: Record<BrandTier, string> = {
  ultra_luxury: "Ultra Luxury",
  luxury: "Luxury",
  premium: "Premium",
  mid_range: "Mid-Range",
  value: "Value",
  budget: "Budget",
  commodity: "Commodity / Essentials",
};
```

**Removed values:** `top_luxury` (renamed → `ultra_luxury`), `fast_fashion` (business model, not a tier), `utility` (replaced by `commodity`), `wholesale` (business model), `marketplace` (business model)

**Note:** The type name itself changes from `VendorTier` to `BrandTier` to match the unified naming convention. All files importing `VendorTier` must be updated.

**Data migration for existing rows (4 brands affected):**

| Brand | Current tier | New `brand_type` | New `tier` | Rationale |
|---|---|---|---|---|
| Amazon (`amazon.ts`) | `marketplace` | `marketplace` | `value` | Amazon is a marketplace; value-priced for most categories |
| Shopify (`shopify.ts`) | `marketplace` | `marketplace` | `mid_range` | Shopify stores are marketplace-like platforms; pricing varies but generally mid-range |
| Amazon Business (`amazon-business.ts`) | `wholesale` | `marketplace` | `value` | It's still Amazon's marketplace, just the B2B version |
| Walmart Business (`walmart-business.ts`) | `wholesale` | `chain` | `value` | Walmart is a chain store; wholesale-like pricing but retail chain model |

These changes must be applied in:
1. The TypeScript vendor files in `lib/procurement-skills/vendors/` (source data for seed script)
2. The `brand_index` database rows (via migration script)
3. The `brandData` JSONB blobs (which contain the full VendorSkill including `tier` in `taxonomy.tier`)

**Affected files to check**: The `/skills` catalog page dynamically populates tier filters from `getAllBrandFacets()` — after removing these values from the taxonomy type, the facets method will naturally stop returning them once no DB rows use them. The UI uses `TIER_LABELS` to display labels — removing the entries from the labels map means any stale DB rows with old values would display raw slugs. The migration must update all rows BEFORE the code change.

**Obfuscation catalog is NOT affected**: `lib/obfuscation-merchants/catalog.ts` uses `category: "marketplace"` on dummy merchant entries — this is a completely separate `category` field on a different data structure, not the tier taxonomy.

**`VendorDetailsFields` interface is NOT affected**: This interface (in `shared/schema.ts`) is used by the orders JSONB column and contains fields like `url`, `category`, `vendorSlug`. Despite having "vendor" in its name, it describes order-level merchant details and is used across 10+ files. Renaming it is cosmetic and out of scope for this phase.

### Step 2: Rename `merchant_accounts` → `brand_login_accounts`

Schema migration:

```sql
ALTER TABLE merchant_accounts RENAME TO brand_login_accounts;
ALTER TABLE brand_login_accounts RENAME COLUMN vendor_id TO brand_id;
```

The `brand_id` column will now reference `brand_index.id` instead of `vendors.id`.

Update in `shared/schema.ts`:
- Rename table definition from `merchantAccounts` to `brandLoginAccounts`
- Rename `vendorId` → `brandId`
- Update `insertMerchantAccountSchema` → `insertBrandLoginAccountSchema` to use `brandId`
- Update exported types: `MerchantAccount` → `BrandLoginAccount`, `InsertMerchantAccount` → `InsertBrandLoginAccount`
- Update index names

### Step 3: Update `orders` table references

The `orders` table has two vendor-related fields:
- `vendorId` (integer, optional) — currently points to `vendors.id`
- `vendor` (text, optional) — stores the merchant name as a free-text string

**Approach**: Rename `vendorId` → `brandId`. Keep `vendor` as-is for now (it's a display string, not a FK).

```sql
ALTER TABLE orders RENAME COLUMN vendor_id TO brand_id;
```

Update `shared/schema.ts`, `insertOrderSchema`, and `lib/orders/create.ts`.

### Step 4: Data migration — merge `vendors` rows into `brand_index`

Write a migration script that:

1. For each row in `vendors`:
   a. Find the matching `brand_index` row by slug
   b. If found: set `brand_type` based on `vendorType`, merge `config` into `brandData`, reconcile `orderingSystem` with `ordering`
   c. If NOT found: insert a minimal `brand_index` row with the vendor's basic info (slug, name, url, logo) and set `maturity = 'draft'`, `submittedBy = 'system'`, `brandData = {}`, `description = name`
2. Update `brand_login_accounts`: set `brand_id` = the matching `brand_index.id` for each row (join on old `vendors.id` → `vendors.slug` → `brand_index.slug`)
3. Update `orders`: set `brand_id` = the matching `brand_index.id` for each row where the old `vendor_id` was set
4. Migrate tier values: any row with `tier = 'marketplace'` or `tier = 'wholesale'` gets its `brand_type` set accordingly and `tier` corrected to a proper affordability tier

This must be a single transaction to maintain referential integrity.

**Validation queries after migration:**
```sql
-- Every brand_login_account should have a valid brand_id
SELECT bla.id, bla.brand_id 
FROM brand_login_accounts bla 
LEFT JOIN brand_index bi ON bi.id = bla.brand_id 
WHERE bi.id IS NULL;
-- Should return 0 rows

-- No brands should have marketplace or wholesale as tier
SELECT slug, tier FROM brand_index WHERE tier IN ('marketplace', 'wholesale');
-- Should return 0 rows

-- All former vendor rows should exist in brand_index
-- (compare count before and after)
```

### Step 5: Rewrite storage layer

**Rename** `server/storage/vendors.ts` → `server/storage/brand-login-accounts.ts`

Old methods → New methods:
| Old | New | Change |
|---|---|---|
| `getVendorBySlug(slug)` | Remove (use existing `getBrandBySlug`) | Already exists in brand-index storage |
| `getVendorById(id)` | Remove (use existing `getBrandById` or add if missing) | Brand index lookup by ID |
| `getAllVendors()` | Remove (use existing `searchBrands({})`) | Already exists |
| `createMerchantAccount(data)` | `createBrandLoginAccount(data)` | Rename + `vendorId` → `brandId` |
| `getMerchantAccountsByOwner(uid)` | `getBrandLoginAccountsByOwner(uid)` | Rename |
| `getMerchantAccountByVendor(uid, vendorId)` | `getBrandLoginAccountByBrand(uid, brandId)` | Rename method + parameter |
| `updateMerchantAccount(id, updates)` | `updateBrandLoginAccount(id, updates)` | Rename |
| `deleteMerchantAccount(id)` | `deleteBrandLoginAccount(id)` | Rename |

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

No changes needed — operates on record `id`, doesn't reference `vendorId` directly.

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
- Update Phase 5 plan (it references `getVendorBySlug` on the vendors storage as "unrelated" — it won't exist anymore)

---

## Naming conventions after this phase

| Before | After |
|---|---|
| `vendors` table | Deleted — `brand_index` is the single source |
| `Vendor` type | `BrandIndex` type |
| `merchant_accounts` table | `brand_login_accounts` |
| `MerchantAccount` type | `BrandLoginAccount` |
| `vendorId` (on brand_login_accounts) | `brandId` |
| `vendorId` (on orders) | `brandId` |
| `vendor` (text on orders) | Keep as-is (display string) |
| `getVendorBySlug` (vendors storage) | `getBrandBySlug` (brand-index storage, already exists) |
| `getAllVendors` | `searchBrands({})` (already exists) |
| `/api/v1/vendors` | Deprecated or rewritten to serve from `brand_index` |
| `vendorType` (on vendors) | `brand_type` (on brand_index) |
| `VendorTier` type | `BrandTier` type |
| `TIER_LABELS` | `BRAND_TIER_LABELS` |
| `top_luxury` tier | `ultra_luxury` (renamed to proper industry term) |
| `fast_fashion` tier | Removed (business model, not a tier) |
| `utility` tier | `commodity` (clearer label) |
| `marketplace`, `wholesale` tiers | Removed — moved to `brand_type` |
| Added tiers | `budget` (cheapest option) |

---

## Taxonomy changes summary

### `brand_type` (NEW — on `brand_index`)
Pure business model classification:
- `brand` — D2C, makes and sells own products
- `retailer` — buys and resells from brands
- `marketplace` — platform connecting third-party sellers
- `chain` — multi-location standardized retail
- `independent` — single-owner small business

### `tier` (FULLY REWORKED — renamed to `BrandTier`)
Pure affordability/price positioning scale (7 tiers, highest to lowest):

| Value | Label | Think of it as... | Examples |
|---|---|---|---|
| `ultra_luxury` | Ultra Luxury | The absolute top — exclusive, often appreciates in value | Hermès, Cartier, Richard Mille |
| `luxury` | Luxury | Prestigious, globally iconic | Gucci, Louis Vuitton, Prada |
| `premium` | Premium | Quality over price — willing to pay more | Apple, Dyson, Patagonia |
| `mid_range` | Mid-Range | Standard — most mainstream brands | Nike, Adidas, Gap |
| `value` | Value | Price-conscious — deals and savings | Walmart, Target, Amazon |
| `budget` | Budget | Cheapest option — volume over quality | Shein, Temu, AliExpress |
| `commodity` | Commodity / Essentials | Functional — you buy it because you need it, not because you want it | Grainger, Uline, Staples |

**Removed from tier:** `top_luxury` (renamed → `ultra_luxury`), `fast_fashion` (business model, not a price tier), `utility` (replaced by `commodity`), `marketplace` (→ `brand_type`), `wholesale` (→ `brand_type`)

---

## Build order (critical sequencing)

The implementation MUST follow this order to avoid breakage:

1. **Add `getBrandById` method** (Step 1A-addendum) — needed before merchant-accounts route can be updated
2. **Add `brand_type` column + taxonomy file** (Step 1) — schema-only, no runtime breakage
3. **Run data migration** (Step 4) — update tier values, set brand_type, merge vendor data, remap FKs. This must happen BEFORE the tier taxonomy code change
4. **Update tier taxonomy** (Step 1B) — remove `marketplace`/`wholesale` from type and labels. Safe only after all DB rows have been migrated
5. **Update vendor source files** (Step 1B data) — update the 4 vendor .ts files with new tier values
6. **Rename table + columns** (Steps 2, 3) — `merchant_accounts` → `brand_login_accounts`, `vendor_id` → `brand_id`
7. **Update storage layer** (Step 5) — rename file + methods
8. **Update API routes** (Step 6) — point to new storage methods
9. **Update order creation** (Step 7) — rename vendorId → brandId in types and callers
10. **Drop vendors table** (Step 8) — only after all references confirmed clean
11. **Update docs** (Step 9)

The key constraint: **data migration before code changes**. If we remove `marketplace` from the tier type before updating the DB rows, the facets endpoint and seed script will produce type errors. If we rename the table before updating the storage methods, queries will fail.

## Risk assessment

### Low risk
- **Column renames are safe** — `ALTER TABLE RENAME COLUMN` is metadata-only in PostgreSQL, instant, no data rewrite
- **Table rename is safe** — `ALTER TABLE RENAME TO` is also metadata-only
- **No data loss** — all vendor data is migrated into brand_index before the table is dropped
- **Login account CRUD is simple** — 5 methods with straightforward field renames
- **`orders.vendorId` is unused in practice** — no fulfillment handler or checkout route actually passes a vendorId when calling recordOrder. They only use `vendor` (string) and `vendorDetails` (JSONB). The column rename is safe.
- **`VendorDetailsFields` is not affected** — separate interface for order-level JSONB, different naming domain
- **Obfuscation catalog is not affected** — uses its own `category` field, not the tier taxonomy

### Medium risk
- **Data migration script correctness** — the slug-based join between `vendors` and `brand_index` must match every row. Any `vendors` row without a `brand_index` match needs a new brand_index insert. Validate with counts before and after.
- **API backward compatibility** — if external bots call `POST /api/v1/merchant-accounts` with `vendorId`, they'll break unless we accept both `vendorId` and `brandId` during a transition period
- **`brandData` JSONB contains stale tier values** — the `brandData` JSONB blob stores the full VendorSkill including `taxonomy.tier`. After migrating the top-level `tier` column, the nested JSONB value will still say "marketplace" or "wholesale". This is a display risk if any code reads tier from `brandData` instead of the column. The migration script should update the JSONB blob too.
- **Missing `getBrandById` method** — plan now includes it (Step 1A-addendum), but this must be built and tested before any route changes

### Mitigations
- Run migration in a transaction with rollback capability
- Add backward-compatible `vendorId` alias in merchant-accounts API for one release cycle
- Validate all FK mappings with SQL queries before dropping the vendors table
- Keep a backup of the vendors table data (export to JSON) before dropping
- Update both column-level tier AND JSONB-level tier in the migration script
- Test `getBrandById` method independently before wiring into routes

---

## Files touched (summary)

| Operation | File | Description |
|---|---|---|
| Edit | `shared/schema.ts` | Add `brand_type` to brandIndex, rename merchant_accounts→brand_login_accounts, rename vendorId→brandId on orders, remove vendors table |
| Create | `lib/procurement-skills/taxonomy/brand-types.ts` | New taxonomy file for brand_type values |
| Edit | `lib/procurement-skills/taxonomy/tiers.ts` | Remove `marketplace` and `wholesale` from tier |
| Edit | `lib/procurement-skills/taxonomy/index.ts` | Export new brand-types taxonomy |
| Create | Migration script | Data migration: merge vendors into brand_index, remap FKs, fix tier values |
| Rename | `server/storage/vendors.ts` → `server/storage/brand-login-accounts.ts` | Keep login account methods, remove vendor lookups |
| Edit | `server/storage/types.ts` | Update IStorage interface |
| Edit | `server/storage/index.ts` | Swap vendorMethods for brandLoginAccountMethods |
| Edit | `app/api/v1/vendors/route.ts` | Rewrite to use brand_index or deprecate |
| Edit | `app/api/v1/merchant-accounts/route.ts` | vendorId → brandId, use brand_index for validation |
| Edit | `app/api/v1/merchant-accounts/[id]/route.ts` | Minor if any |
| Edit | `lib/orders/create.ts` | vendorId → brandId |
| Edit | `lib/orders/types.ts` | Update OrderInput type |
| Edit | `app/api/v1/bot/merchant/checkout/route.ts` | Update vendor references |
| Edit | `lib/approvals/rail*-fulfillment.ts` (4 files) | Update recordOrder calls if they pass vendorId |
| Edit | `scripts/seed-brand-index.ts` | Seed brand_type for each brand |
| Delete | `vendors` table (via migration) | After all references are migrated |
