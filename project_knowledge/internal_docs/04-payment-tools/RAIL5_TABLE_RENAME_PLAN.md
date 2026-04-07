# Technical Plan: Rename Legacy `wallets` + `transactions` Tables to Rail 5

## Summary

The `wallets` and `transactions` tables predate the rail naming system. They are exclusively used by Rail 5 (self-hosted encrypted cards) but their generic names make the codebase confusing — every other rail's tables are clearly namespaced (`privy_wallets`, `privy_transactions`, `crossmint_wallets`, `crossmint_transactions`, `rail5_cards`, `rail5_checkouts`).

This plan renames:
- DB table `wallets` → `rail5_wallets`
- DB table `transactions` → `rail5_transactions`
- Drizzle export `wallets` → `rail5Wallets`
- Drizzle export `transactions` → `rail5Transactions`
- Types `Wallet` / `InsertWallet` → `Rail5Wallet` / `InsertRail5Wallet`
- Types `Transaction` / `InsertTransaction` → `Rail5Transaction` / `InsertRail5Transaction`
- All storage methods renamed to `rail5XxxWallet` / `rail5XxxTransaction` pattern
- Wallet/transaction methods relocated from `server/storage/core.ts` → `server/storage/payment-rails/rail5.ts`

**No behavior changes. Purely a rename + file relocation.**

---

## Confirmed Scope (Research Findings)

### Who uses the legacy `wallets` table?

| Consumer | File | Method(s) Called |
|---|---|---|
| Bot claiming | `server/storage/core.ts` line 69 (inside `claimBot`) | `createWallet` |
| Bot status API | `app/api/v1/bot/status/route.ts` | `getWalletByBotId` |
| Bot wallet check | `app/api/v1/bot/wallet/check/route.ts` | `getWalletByBotId`, `getMonthlySpend` |
| Bot wallet txns | `app/api/v1/bot/wallet/transactions/route.ts` | `getWalletByBotId`, `getTransactionsByWalletId` |
| Bot rails list | `app/api/v1/bots/rails/route.ts` | `getWalletsWithBotsByOwnerUid` |
| Rail 5 checkout | `app/api/v1/bot/rail5/checkout/route.ts` | `getWalletByBotId` |
| Rail 5 confirm | `app/api/v1/bot/rail5/confirm/route.ts` | `getWalletByBotId`, `debitWallet`, `createTransaction` |
| Owner wallet balance | `app/api/v1/wallet/balance/route.ts` | `getWalletByOwnerUid` |
| Owner wallet txns | `app/api/v1/wallet/transactions/route.ts` | `getWalletByOwnerUid`, `getTransactionsByWalletId` |
| Owner wallets list | `app/api/v1/wallets/route.ts` | `getWalletsWithBotsByOwnerUid` |
| Owner wallet freeze | `app/api/v1/wallets/[id]/freeze/route.ts` | `freezeWallet`, `unfreezeWallet` |
| Admin txn UNION query | `app/api/v1/admin/transactions/route.ts` | Raw SQL referencing `transactions` and `wallets` by DB name |
| Overview page (FE) | `app/(dashboard)/overview/page.tsx` | Calls `/api/v1/wallet/balance` |
| Transactions page (FE) | `app/(dashboard)/transactions/page.tsx` | Calls `/api/v1/wallet/transactions` |
| Cards page (FE) | `app/(dashboard)/cards/page.tsx` | Calls `/api/v1/wallets` and `/api/v1/wallets/{id}/freeze` |

### Who uses the legacy `transactions` table?

Same consumers as above, plus:
- `getMonthlySpend()` — used for Rail 5 guardrail enforcement (sums `type='purchase'` rows this month)
- Admin UNION query — references `FROM transactions t` joined to `wallets w`

### What does NOT reference these tables?

- `checkout_pages.walletId` → references Privy wallet IDs (confirmed: creation calls `privyGetWalletById`)
- `orders.walletId` → nullable, and Rail 5 does NOT pass it when recording orders
- `orders.transactionId` → nullable, Rail 5 does NOT pass it
- All front-end `Wallet` imports → Lucide icon, not schema type
- `features/payment-rails/rail5/index.ts` → does NOT import `wallets` or `transactions` tables
- No `createWallet` calls exist outside `server/storage/core.ts` `claimBot` method

### Column note: `stripePaymentIntentId`

The `transactions` table has a `stripePaymentIntentId` column from when Stripe top-ups were the funding mechanism. This column is no longer written to by any active code path. It should be kept during the rename (no column changes) and can be removed in a future cleanup.

### Column note: `status`

The admin UNION query selects `t.status` from the `transactions` table, but the Drizzle schema does NOT define a `status` column. This means the raw SQL query reads a column that either doesn't exist (returns NULL) or was added via migration but not the schema. The rename plan does not address this — it will continue to work (or not work) exactly as before.

---

## Changes By File

### 1. Database Migration (run manually)

```sql
ALTER TABLE wallets RENAME TO rail5_wallets;
ALTER TABLE transactions RENAME TO rail5_transactions;
```

No index renames needed — Postgres indexes follow the table automatically. No FK constraints to update (the `wallet_id` column in `rail5_transactions` has no formal FK constraint in the Drizzle schema, it's an application-level reference).

### 2. `shared/schema.ts`

**Before:**
```ts
export const wallets = pgTable("wallets", { ... });
export const transactions = pgTable("transactions", { ... });
export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = typeof wallets.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
```

**After:**
```ts
export const rail5Wallets = pgTable("rail5_wallets", { ... });
export const rail5Transactions = pgTable("rail5_transactions", { ... });
export type Rail5Wallet = typeof rail5Wallets.$inferSelect;
export type InsertRail5Wallet = typeof rail5Wallets.$inferInsert;
export type Rail5Transaction = typeof rail5Transactions.$inferSelect;
export type InsertRail5Transaction = typeof rail5Transactions.$inferInsert;
```

Move these table definitions to sit next to the existing `rail5Cards` and `rail5Checkouts` definitions in the Rail 5 section of the schema file (currently they're at lines 32-52, above the Rail 1 section).

### 3. `server/storage/types.ts`

Update type imports and interface method signatures:

| Old Import | New Import |
|---|---|
| `type Wallet, type InsertWallet` | `type Rail5Wallet, type InsertRail5Wallet` |
| `type Transaction, type InsertTransaction` | `type Rail5Transaction, type InsertRail5Transaction` |

| Old Method | New Method |
|---|---|
| `createWallet(data: InsertWallet): Promise<Wallet>` | `rail5CreateWallet(data: InsertRail5Wallet): Promise<Rail5Wallet>` |
| `getWalletByBotId(botId: string): Promise<Wallet \| null>` | `rail5GetWalletByBotId(botId: string): Promise<Rail5Wallet \| null>` |
| `getWalletByOwnerUid(ownerUid: string): Promise<Wallet \| null>` | `rail5GetWalletByOwnerUid(ownerUid: string): Promise<Rail5Wallet \| null>` |
| `createTransaction(data: InsertTransaction): Promise<Transaction>` | `rail5CreateTransaction(data: InsertRail5Transaction): Promise<Rail5Transaction>` |
| `getTransactionsByWalletId(walletId: number, limit?: number): Promise<Transaction[]>` | `rail5GetTransactionsByWalletId(walletId: number, limit?: number): Promise<Rail5Transaction[]>` |
| `debitWallet(walletId: number, amountCents: number): Promise<Wallet \| null>` | `rail5DebitWallet(walletId: number, amountCents: number): Promise<Rail5Wallet \| null>` |
| `getMonthlySpend(walletId: number): Promise<number>` | `rail5GetMonthlySpend(walletId: number): Promise<number>` |
| `freezeWallet(walletId: number, ownerUid: string): Promise<Wallet \| null>` | `rail5FreezeWallet(walletId: number, ownerUid: string): Promise<Rail5Wallet \| null>` |
| `unfreezeWallet(walletId: number, ownerUid: string): Promise<Wallet \| null>` | `rail5UnfreezeWallet(walletId: number, ownerUid: string): Promise<Rail5Wallet \| null>` |
| `getWalletsWithBotsByOwnerUid(ownerUid: string): Promise<(Wallet & { botName: string; botId: string })[]>` | `rail5GetWalletsWithBotsByOwnerUid(ownerUid: string): Promise<(Rail5Wallet & { botName: string; botId: string })[]>` |

### 4. `server/storage/core.ts` → move wallet/transaction methods out

**Remove** from `core.ts`:
- `createWallet`, `getWalletByBotId`, `getWalletByOwnerUid`
- `createTransaction`, `getTransactionsByWalletId`
- `debitWallet`, `getMonthlySpend`
- `freezeWallet`, `unfreezeWallet`, `getWalletsWithBotsByOwnerUid`

**Remove** all imports of `wallets`, `transactions`, `Wallet`, `InsertWallet`, `Transaction`, `InsertTransaction` from core.ts.

**Keep in core.ts**: `claimBot` — but update its internal call from `this.createWallet(...)` to `this.rail5CreateWallet(...)`. The `CoreMethods` Pick type must be updated accordingly (remove old method names, add `rail5CreateWallet`).

### 5. `server/storage/payment-rails/rail5.ts` — add wallet/transaction methods

Move all the removed methods here, renamed. This file already has `rail5Methods` for cards and checkouts. Add the wallet and transaction methods to the same `Rail5Methods` Pick type and `rail5Methods` export.

Update imports at the top:
```ts
import {
  rail5Cards, rail5Checkouts, rail5Wallets, rail5Transactions, bots,
  type Rail5Card, type InsertRail5Card,
  type Rail5Checkout, type InsertRail5Checkout,
  type Rail5Wallet, type InsertRail5Wallet,
  type Rail5Transaction, type InsertRail5Transaction,
} from "@/shared/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
```

### 6. `server/storage/index.ts`

No changes needed — `coreMethods` and `rail5Methods` are both already spread in. The methods just move from one object to the other.

### 7. API Route Files (10 files)

Purely mechanical `storage.xxx` → `storage.rail5Xxx` renames:

| File | Old Call | New Call |
|---|---|---|
| `app/api/v1/bot/status/route.ts` | `storage.getWalletByBotId(bot.botId)` | `storage.rail5GetWalletByBotId(bot.botId)` |
| `app/api/v1/bot/wallet/check/route.ts` | `storage.getWalletByBotId(bot.botId)`, `storage.getMonthlySpend(wallet.id)` | `storage.rail5GetWalletByBotId(bot.botId)`, `storage.rail5GetMonthlySpend(wallet.id)` |
| `app/api/v1/bot/wallet/transactions/route.ts` | `storage.getWalletByBotId`, `storage.getTransactionsByWalletId` | `storage.rail5GetWalletByBotId`, `storage.rail5GetTransactionsByWalletId` |
| `app/api/v1/bot/rail5/checkout/route.ts` | `storage.getWalletByBotId` | `storage.rail5GetWalletByBotId` |
| `app/api/v1/bot/rail5/confirm/route.ts` | `storage.getWalletByBotId`, `storage.debitWallet`, `storage.createTransaction` | `storage.rail5GetWalletByBotId`, `storage.rail5DebitWallet`, `storage.rail5CreateTransaction` |
| `app/api/v1/wallet/balance/route.ts` | `storage.getWalletByOwnerUid` | `storage.rail5GetWalletByOwnerUid` |
| `app/api/v1/wallet/transactions/route.ts` | `storage.getWalletByOwnerUid`, `storage.getTransactionsByWalletId` | `storage.rail5GetWalletByOwnerUid`, `storage.rail5GetTransactionsByWalletId` |
| `app/api/v1/wallets/route.ts` | `storage.getWalletsWithBotsByOwnerUid` | `storage.rail5GetWalletsWithBotsByOwnerUid` |
| `app/api/v1/wallets/[id]/freeze/route.ts` | `storage.freezeWallet`, `storage.unfreezeWallet` | `storage.rail5FreezeWallet`, `storage.rail5UnfreezeWallet` |
| `app/api/v1/bots/rails/route.ts` | `storage.getWalletsWithBotsByOwnerUid` | `storage.rail5GetWalletsWithBotsByOwnerUid` |

### 8. `app/api/v1/admin/transactions/route.ts` — Raw SQL

Update the raw SQL string literals:
- `FROM transactions t` → `FROM rail5_transactions t`
- `LEFT JOIN wallets w` → `LEFT JOIN rail5_wallets w`
- `(SELECT count(*) FROM transactions)` → `(SELECT count(*) FROM rail5_transactions)`
- Change `'core' AS rail` → `'rail5' AS rail` (this was always Rail 5 data, now labeled correctly)

### 9. Drizzle Migration Snapshot

After the schema change, run `npx drizzle-kit generate` to create a new migration file. The generated migration should produce `ALTER TABLE ... RENAME TO ...` statements. **Do NOT run `npx drizzle-kit push`** — the DB rename should be done manually first via the SQL in step 1, then generate the migration to keep the snapshot in sync.

### 10. Front-end pages

**No front-end changes.** The front-end calls API routes by URL (`/api/v1/wallet/balance`, `/api/v1/wallets`, etc.). The API URLs stay the same — only the internal storage method names change. The front-end is decoupled from the table names.

### 11. Documentation / `replit.md`

Update any references to the old table names. In `replit.md`, the Rail 5 section should document:
- `rail5_wallets` — Rail 5 USD balance per bot (created on bot claim)
- `rail5_transactions` — Rail 5 spending ledger (debits, deposits)

---

## Execution Order

1. **Run the two `ALTER TABLE RENAME` SQL statements** on the live database
2. **Update `shared/schema.ts`** — rename table definitions and types
3. **Update `server/storage/types.ts`** — rename interface methods and type references
4. **Update `server/storage/core.ts`** — remove wallet/transaction methods, update `claimBot` to call `rail5CreateWallet`, update `CoreMethods` Pick type
5. **Update `server/storage/payment-rails/rail5.ts`** — add the relocated methods with new names
6. **Update all 10 API route files** — mechanical `storage.xxx` → `storage.rail5Xxx`
7. **Update `app/api/v1/admin/transactions/route.ts`** — raw SQL table name references
8. **Run `npx drizzle-kit generate`** to create the migration snapshot
9. **Update `replit.md`** — document the new table names
10. **Restart and verify** — the app should behave identically

---

## Risk Assessment

- **Risk: Typo in one of the ~60 method renames** — Mitigated by TypeScript compiler. If any call site references a method that no longer exists on `IStorage`, the build will fail immediately.
- **Risk: DB rename on live data** — `ALTER TABLE RENAME` is instant, no data copy, no downtime. Postgres just updates the catalog entry.
- **Risk: Raw SQL in admin endpoint** — This is the only place that uses raw SQL against these tables. Easy to miss, but explicitly called out in this plan.
- **Risk: Drizzle snapshot drift** — Running `drizzle-kit generate` after the schema change keeps the snapshot in sync. If forgotten, future migrations may try to recreate the old tables.

---

## Out of Scope

- Renaming API URL paths (e.g., `/api/v1/wallets` → `/api/v1/rail5-wallets`) — not needed, the URLs are user-facing and should remain stable
- Removing the `stripePaymentIntentId` column — separate cleanup task
- Adding a `status` column to the Drizzle schema for `rail5_transactions` — separate fix
- Consolidating the `/transactions` page to use UNION ALL — Phase 2 (separate plan)
- Removing the `/orders` page — Phase 3 (separate plan)
