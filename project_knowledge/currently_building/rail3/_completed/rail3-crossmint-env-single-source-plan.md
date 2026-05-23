# Crossmint env config — single-source-of-truth plan

**Goal:** all Crossmint env-dependent values (server key, client key, base URL) live in **one** file. Switching between staging and prod is done by editing that one file — not by setting a runtime toggle env var, not by find-and-replace across the codebase.

**Why:** today the values are scattered across 6 spots. Switching envs means re-entering keys or editing in multiple places. We want: edit one file, done.

**Doc source for URLs:** [docs.crossmint.com/introduction/platform/staging-vs-production](https://docs.crossmint.com/introduction/platform/staging-vs-production) confirms staging = `https://staging.crossmint.com`, production = `https://www.crossmint.com`. Different URLs, different projects, different keys.

---

## Current state — what's scattered today

```
features/agent-interaction/procurement/crossmint-worldstore/client.ts:4   — CROSSMINT_SERVER_API_KEY
features/payment-rails/rail2/client.ts:10                                  — CROSSMINT_ENV (URL switch)
features/payment-rails/rail2/client.ts:16                                  — CROSSMINT_SERVER_API_KEY
features/payment-rails/rail3/client.ts:4                                   — CROSSMINT_ENV (URL switch)
features/payment-rails/rail3/client.ts:10                                  — CROSSMINT_SERVER_API_KEY
components/rail3/crossmint-provider.tsx:48                                 — NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY
app/(dashboard)/card-wallet/page.tsx:462-463                               — NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY
```

Plus the runtime toggle `CROSSMINT_ENV` env var (which we're going to retire — the URL choice is now part of the source-of-truth file).

Out of scope: `app/api/v1/card-wallet/webhooks/crossmint/route.ts` reads `CROSSMINT_WEBHOOK_SECRET`. That's per-endpoint, doesn't change with env-switching in the same way, leave it alone.

---

## Target state — new file

**Path:** `features/payment-rails/crossmint-env.ts`

**Default (staging):**

```ts
// Crossmint environment config — single source of truth.
//
// To switch between Crossmint projects (e.g. staging ↔ production), edit the
// THREE values below. Nothing else in the codebase needs to change.
//
// Staging:    URL = "https://staging.crossmint.com",  keys = …_STAGING
// Production: URL = "https://www.crossmint.com",      keys = …  (no suffix)
//
// Docs: https://docs.crossmint.com/introduction/platform/staging-vs-production

export const CROSSMINT_HOST = "https://staging.crossmint.com";
export const CROSSMINT_SERVER_API_KEY = process.env.CROSSMINT_SERVER_API_KEY_STAGING;
export const CROSSMINT_CLIENT_API_KEY = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY_STAGING;
```

**To flip to prod:** edit the three lines:

```ts
export const CROSSMINT_HOST = "https://www.crossmint.com";
export const CROSSMINT_SERVER_API_KEY = process.env.CROSSMINT_SERVER_API_KEY;
export const CROSSMINT_CLIENT_API_KEY = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY;
```

That's it. No runtime toggle, no conditional, no second file.

**Why `process.env.NEXT_PUBLIC_*` not a hardcoded string for the client key:** Next.js inlines `process.env.NEXT_PUBLIC_*` at build time as long as the literal expression appears in source. Putting it in a shared module is fine — Next's bundler still inlines it.

**Why no `import "server-only"` pragma on this file:** the client key needs to be importable from client components (the provider). The server key is only ever read by code paths that already have `import "server-only"` upstream, so leaking the *name* via the shared file is harmless — the actual value is still server-only because the env var isn't `NEXT_PUBLIC_`-prefixed.

---

## Consumer rewrites

Each of the 6 spots collapses to one import.

### `features/payment-rails/rail2/client.ts`

```ts
// before
function getBaseUrl(version) {
  const v = API_VERSIONS[version];
  return process.env.CROSSMINT_ENV === "staging"
    ? `https://staging.crossmint.com/api/${v}`
    : `https://www.crossmint.com/api/${v}`;
}
export function getServerApiKey() {
  const key = process.env.CROSSMINT_SERVER_API_KEY;
  if (!key) throw new Error("CROSSMINT_SERVER_API_KEY is required for Rail 2");
  return key;
}

// after
import { CROSSMINT_HOST, CROSSMINT_SERVER_API_KEY } from "@/features/payment-rails/crossmint-env";

function getBaseUrl(version) {
  return `${CROSSMINT_HOST}/api/${API_VERSIONS[version]}`;
}
export function getServerApiKey() {
  if (!CROSSMINT_SERVER_API_KEY) throw new Error("Crossmint server API key is missing — set the env var referenced in features/payment-rails/crossmint-env.ts");
  return CROSSMINT_SERVER_API_KEY;
}
```

### `features/payment-rails/rail3/client.ts`

Same pattern. Replace `getRail3BaseUrl()` body with `` `${CROSSMINT_HOST}/api/unstable` `` and `getRail3ServerApiKey()` body with the shared constant.

### `features/agent-interaction/procurement/crossmint-worldstore/client.ts`

Replace the local `process.env.CROSSMINT_SERVER_API_KEY` read with the shared constant.

### `components/rail3/crossmint-provider.tsx`

```ts
// before
const apiKey = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY;

// after
import { CROSSMINT_CLIENT_API_KEY } from "@/features/payment-rails/crossmint-env";
const apiKey = CROSSMINT_CLIENT_API_KEY;
```

Keep the existing "key not configured" fallback UI, just update the error text to point at `features/payment-rails/crossmint-env.ts`.

### `app/(dashboard)/card-wallet/page.tsx`

Same as the provider — replace the two inline reads with the shared constant.

### `CROSSMINT_ENV` env var

Retire it. No code reads it anymore. The user can delete it from Replit Secrets (it was unset anyway).

---

## Env vars (Replit Secrets)

After this change, exactly four Crossmint secrets exist:

| Var | Holds | Who reads it |
|---|---|---|
| `CROSSMINT_SERVER_API_KEY` | **Prod** server key (`sk_production_…`) | Source file when in prod mode |
| `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY` | **Prod** client key (`ck_production_…`) | Source file when in prod mode |
| `CROSSMINT_SERVER_API_KEY_STAGING` | **Staging** server key (`sk_staging_…`) | Source file when in staging mode |
| `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY_STAGING` | **Staging** client key (`ck_staging_…`) | Source file when in staging mode |

Plus the unrelated `CROSSMINT_WEBHOOK_SECRET` (Rail 2 webhook signing, untouched).

Both prod-named secrets exist today but currently hold *staging* values (overwritten earlier in this session). User will need to re-enter the real prod values from the Crossmint console next time they want to flip back to prod. Until then, the staging-suffixed slots are empty and need filling.

---

## Step-by-step rollout

1. **No code change yet** — confirm this plan is what the user wants.
2. Create `features/payment-rails/crossmint-env.ts` with the 3 exports defaulting to staging (URL + `_STAGING` env vars).
3. Rewire the 6 consumer spots to import from it. Use `replace_all` only when safe; otherwise targeted edits.
4. Add staging env vars in Replit Secrets:
   - `CROSSMINT_SERVER_API_KEY_STAGING` ← staging server key
   - `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY_STAGING` ← staging client key
5. (Optional) Restore prod env vars in Replit Secrets when next needed:
   - `CROSSMINT_SERVER_API_KEY` ← prod server key
   - `NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY` ← prod client key
6. Restart `Start application` workflow.
7. Delete `CROSSMINT_ENV` from Replit Secrets (now unused). Skippable — it was never set.
8. Smoke test: visit `/setup/rail3` → confirm the Crossmint iframe loads with no scope errors (other than the still-pending `cardPaymentMethod` addon, which staging should already include).

---

## To switch back to prod later

1. Open `features/payment-rails/crossmint-env.ts`.
2. Change the 3 lines:
   - `CROSSMINT_HOST` → `"https://www.crossmint.com"`
   - `CROSSMINT_SERVER_API_KEY` → reference the non-suffixed env var
   - `CROSSMINT_CLIENT_API_KEY` → reference the non-suffixed env var
3. Ensure the non-suffixed env vars in Replit Secrets hold real prod values (re-enter if needed).
4. Restart workflow.

Done. No other file touched.
