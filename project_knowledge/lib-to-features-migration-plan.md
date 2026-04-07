---
name: lib/ → features/ Migration Plan
description: Move 6 domain modules from lib/ to features/, leaving only generic utilities in lib/. One atomic operation.
---

# lib/ → features/ Migration Plan

## Goal

Rename `lib/` domain modules to `features/` to match Next.js community convention. After this, `lib/` contains only generic cross-cutting utilities, and `features/` contains all domain-specific business logic.

## Before & After

```
BEFORE:                              AFTER:
lib/                                 features/
  brand-engine/                        brand-engine/
  payment-rails/                       payment-rails/
  agent-interaction/                   agent-interaction/
  platform-management/                 platform-management/
  agent-shops/                         agent-shops/
  product-index/                       product-index/
  utils.ts              ←stays→      lib/
  wizard-typography.ts   ←stays→        utils.ts
                                        wizard-typography.ts

server/storage/          ←no change→  server/storage/
```

## What Does NOT Change

- **`server/storage/`** — stays as-is. Already behind a barrel file, clearly server-only.
- **`tsconfig.json`** — no path alias changes needed. The `@/` alias maps to the project root, so `@/features/X` resolves automatically.
- **ESLint / import sorters** — no rules reference `lib/` paths.
- **`app/` routes** — files don't move, only their import paths change.
- **`components/`** — files don't move, only their import paths change.
- **`shared/`** — files don't move, only their import paths change.
- **`lib/utils.ts`** and **`lib/wizard-typography.ts`** — stay in `lib/`.

## Scope

| Module | Files importing from it | Import statements |
|--------|------------------------|-------------------|
| `platform-management/` | ~140 files | ~183 statements |
| `payment-rails/` | ~45 files | ~50 statements |
| `agent-interaction/` | ~44 files | ~50 statements |
| `brand-engine/` | ~30 files | ~65 statements |
| `agent-shops/` | ~12 files | ~15 statements |
| `product-index/` | ~1 file | ~1 statement |
| **Total** | **~220 unique files** | **~364 statements** |

## Execution Steps

### Step 1: Create features/ and move modules

```bash
mkdir -p features
mv lib/brand-engine features/brand-engine
mv lib/payment-rails features/payment-rails
mv lib/agent-interaction features/agent-interaction
mv lib/platform-management features/platform-management
mv lib/agent-shops features/agent-shops
mv lib/product-index features/product-index
```

After this, `lib/` contains only `utils.ts` and `wizard-typography.ts`.

### Step 2: Rewrite all import paths

Single sed pass across all affected files:

```
@/lib/brand-engine       → @/features/brand-engine
@/lib/payment-rails      → @/features/payment-rails
@/lib/agent-interaction   → @/features/agent-interaction
@/lib/platform-management → @/features/platform-management
@/lib/agent-shops         → @/features/agent-shops
@/lib/product-index       → @/features/product-index
```

These are exact prefix replacements — no ambiguity risk since `lib/utils` and `lib/wizard-typography` don't match any of the 6 module prefixes.

### Step 3: Update server/storage barrel (if needed)

Check `server/storage/` files for any direct `@/lib/` imports (not going through the barrel). The brand-index storage file had one — now at `server/storage/brand-engine/brand-index.ts`. Verify and update.

### Step 4: Update internal cross-module imports

Files within `features/` that import from other `features/` modules using `@/lib/` paths. These were already identified during the initial modularization:

- `features/brand-engine/agentic-score/` → imports from `features/brand-engine/procurement-skills/`
- `features/agent-interaction/approvals/` → imports from `features/agent-interaction/orders/`, `features/agent-interaction/webhooks/`
- `features/payment-rails/crypto-onramp/` → imports from `features/payment-rails/stripe.ts`
- `features/agent-shops/payments/` → imports from `features/platform-management/auth/`
- etc.

All covered by the same sed pattern since they all use `@/lib/module-name` paths.

### Step 5: Verify

1. **Stale import check:**
   ```bash
   grep -r "@/lib/brand-engine\|@/lib/payment-rails\|@/lib/agent-interaction\|@/lib/platform-management\|@/lib/agent-shops\|@/lib/product-index" --include="*.ts" --include="*.tsx"
   ```
   Expect: 0 matches.

2. **Build check:**
   ```bash
   npx tsc --noEmit
   ```
   Expect: exits 0 (ignoring pre-existing Plugins/OpenClaw errors).

3. **Dev server check:**
   ```bash
   rm -rf .next && npx next dev
   ```
   Expect: compiles cleanly, pages load.

4. **Remaining lib/ check:**
   ```bash
   ls lib/
   ```
   Expect: only `utils.ts` and `wizard-typography.ts`.

### Step 6: Update documentation

- Update `replit.md` references from `lib/` to `features/` for domain modules.
- Update `project_knowledge/lib-modularization-plan.md` to reflect completed state.
- Update `project_knowledge/architecture.md` if it references `lib/` module paths.

## Risk Assessment

**Risk: LOW**
- This is a pure rename — same folders, same files, same structure, just a different parent directory.
- The find-and-replace patterns are unambiguous (6 distinct module name prefixes).
- No logic changes, no file content changes beyond import paths.
- TypeScript catches any missed import at compile time.
- Checkpoint exists at the current working state for rollback if needed.

## Estimated Effort

- Move folders: 1 minute
- Rewrite imports: 2 minutes
- Verify + fix any edge cases: 5 minutes
- Update docs: 5 minutes
- **Total: ~15 minutes**
