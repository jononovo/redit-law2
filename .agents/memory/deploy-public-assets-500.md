---
name: Recurring public/ static-file 500 on VM deploy (FIXED)
description: Why raw public/ files (images + .md, intermittently even .json) return HTTP 500 in production on Replit vm deploys, and the implemented fix — serve everything off public/ ourselves.
---

# Recurring `public/` static-file HTTP 500 on the deployed site

**Symptom:** On `creditclaw.com` (and the other tenants), raw `public/` files —
images (`/assets/**.svg|png|jpg`) and skill docs (`/SKILL.md`, `/amazon/AMAZON.md`, …) —
return **HTTP 500** in production. Recurs across deploys; patches appear to fix it, then it breaks again.

**Root cause (platform, not our code):** On Replit **`vm`** deployments, files under `public/`
are served by the platform **edge/CDN static layer, NOT by `next start`**. Each deploy re-syncs
`public/` to that edge bucket and **the sync is flaky/inconsistent** — so it's **intermittent and
per-file, NOT cleanly by type**: the same file can 200 on one deploy and 500 on the next, and we even
observed one folder's `_meta.json` return 500 while a sibling `.json` returned 200. The failure is a
uniform canned error: **HTTP 500, `content-length: 21`, one shared `etag` (e.g. `66fci67lppl`), no
`x-powered-by: Next.js`** (request never reaches Next). `_next/static/*` (content-hashed, different
pipeline) always works.

**Decisive mechanism:** the edge only errors on files that **physically exist in `public/`**. A
**non-existent** public path returns **404 via Next** (`x-powered-by: Next.js`) — it falls through to
`next start`. So removing a file from `public/` makes its URL reach `next start` instead of the broken
edge. That's the entire basis of the fix.

**Why header/config patches never stick:** nothing in the repo controls the edge's `public/` sync;
`next.config` `headers()` rules don't even reach these responses. Each redeploy re-runs the flaky
ingest → recurrence.

## Implemented fix (move EVERYTHING off `public/`, serve it ourselves)
Because the breakage is intermittent and per-file, cherry-picking "only the broken files" is unreliable —
the durable answer is to stop depending on the edge `public/` layer entirely:
- Moved the **whole** `public/` tree into a top-level **`static/`** folder, structure preserved.
  `public/` kept empty (a `.gitkeep`) by user preference; nothing reads from it anymore.
- One route handler `app/static-files/[...path]/route.ts` `fs`-reads from `process.cwd()/static`
  (traversal guard, ext→content-type map, explicit 404 on missing, `Cache-Control: public, max-age=3600`,
  both `GET` and `HEAD`).
- `next.config.ts` `rewrites().fallback` (one rule per extension `md|json|png|jpg|jpeg|svg|gif|webp|ico|ts`)
  maps `/:path*.<ext>` → `/static-files/:path*.<ext>`. **`fallback` fires only when no page/route/`_next`
  matched**, so it cannot shadow app routes or generated routes (robots/sitemap/llms). All original URLs
  (including `/SKILL.md` at domain root) are unchanged.
- Tenant config disk-read switched `public` → `static` — this was the **only** code reference to the
  `public` dir on disk (server-side `fs.readFileSync`, never web-served).

**Why runtime `fs` serving from `static/` is safe in prod:** no `output: 'standalone'` is set, so the
**full repo ships** to the VM. Proven by analogy — the app already `fs`-reads `content/` and `data/` at
runtime in production and they work. A new top-level `static/` behaves identically.

**Decision — don't reintroduce:** do NOT serve these via `public/` again, and do NOT try to "keep the
working ones in public" (per-file flakiness makes that unreliable). Serve anything that must be reliable
through `next start` (the route handler) or `_next/static`.

**Build-time gotcha from the move:** the plugin source `Plugins/OpenClaw/src/*.ts` was hidden
from the type-checker via a `tsconfig.json` `exclude` entry `public/Plugins/**/*` (those files
import the uninstalled `openclaw/plugin-sdk`). Moving the tree to `static/` broke that match, so
`next build` (which has `typescript.ignoreBuildErrors: false`) type-checked them and failed with
`Cannot find module 'openclaw/plugin-sdk/plugin-entry'`. Fix: update the exclude to
`static/Plugins/**/*`. **Lesson:** when relocating a folder, grep `tsconfig.json` `exclude`
(and any other path-glob config) for the old prefix — `next dev` won't catch it, only a full build will.
(Note: `next build` stops at the FIRST type error, and reproduces fine in a throwaway dir via a
`distDir: process.env.NEXT_BUILD_DISTDIR || ".next"` shim so it won't fight the dev server's `.next/lock`.)

**Loose end (pre-existing, unrelated):** `app/docs/layout.tsx` points the brands logo at
`/tenants/brands/images/logo.png`, but no `images/` dir exists under any tenant (tenant folders only hold
`config.json`) — a dangling ref that 404s, not caused by this move.

## Follow-up: `static/` is ALSO a Next.js reserved dir — renamed to `static-assets/`
The first fix used a top-level **`static/`** folder. That name collides with Next.js's deprecated
built-in static dir, so prod served it unreliably: every `/static-files/*` and `/assets/*` path 404'd
(the route handler ran but `fs` couldn't read the files), `next start` logged
`⚠ The static directory has been deprecated in favor of the public directory`, and the legacy
`/static/*` path returned **500** (Next's deprecated static handler intercepting). Locally it worked,
so it only showed up on deploy — intermittent across redeploys.
**Fix:** rename the on-disk folder `static/` → **`static-assets/`** (non-reserved name), point
`STATIC_ROOT` in `app/static-files/[...path]/route.ts` at it, and add `outputFileTracingIncludes`
in `next.config.ts` (`"/static-files/[...path]": ["./static-assets/**/*"]`) so the VM build bundles
the tree. Public `/assets/*` URLs and the `/static-files/*` route are unchanged → zero ref churn.
**Why:** `static` (like `public`) is special-cased by Next; serving a custom asset tree must use a
NON-reserved directory name.
**How to apply:** never name a runtime-`fs`-served asset dir `static` or `public`. When renaming it,
also update the `tsconfig.json` `exclude` glob (was `static/Plugins/**/*` → `static-assets/Plugins/**/*`)
or `next build` type-checks the OpenClaw plugin source and fails on `openclaw/plugin-sdk`.

## CRITICAL platform fact — Replit `vm` deploy IGNORES `outputFileTracingIncludes`
After the `static-assets/` rename finally built+deployed, prod STILL 404'd every image/`.md`/`.svg`
(but NOT tenant `config.json`). Root cause is NOT our route handler (it works in prod: a file that IS
on disk serves 200) and NOT the rename — it's how Replit bundles a `vm` Next deploy:
**Replit ships ONLY the files Next traces as genuine build dependencies** (real `import`s, or files
`fs`-read during build-time prerender — e.g. tenant `config.json` is read by `getTenantConfig` during
page prerender, so it lands in many `app/**/page.js.nft.json` and DOES ship). Files referenced **only**
via `next.config.ts` `outputFileTracingIncludes` land **only** in that route's `route.js.nft.json` and
are **silently dropped** — Replit's `vm` bundling does not honor the include. Net: ~84 of 89
`static-assets/*` files (all images/`.md`/`.svg`/most `.json`) never reach the runtime VM, so the
`/static-files` route `fs`-reads a path that doesn't exist → 404. **This means the entire
"serve a runtime-`fs` asset tree from a top-level dir" strategy can never work on `vm` as long as it
depends on `outputFileTracingIncludes`.** It's NOT a full-repo ship (config.json ships, sibling
favicon.png in the same repo does not — proves pruning to traced deps).
**Diagnosis recipe (read-only):** curl `/static-files/<file>` for a build-read file (tenant config → 200)
vs an image (→ 404 body "Not Found"); then `grep static-assets .next/server/**/*.nft.json` — the missing
files appear ONLY in `route.js.nft.json`, the shipping ones appear in `page.js.nft.json` too.
**Fix that actually honors the include:** `output: "standalone"` (standalone build PHYSICALLY COPIES
`outputFileTracingIncludes` files into `.next/standalone/`) + run `node .next/standalone/server.js`
(change `.replit` run cmd) + copy `.next/static` and `public` next to it. Standalone ships the include;
plain `next build` + Replit `vm` does not.
**Why dev never shows it:** `next dev` reads straight from the repo tree, so every asset 200s locally;
only a real deploy (or inspecting `.nft.json`) exposes the missing files.

### RESOLUTION (applied) — `output: "standalone"` + run from inside the bundle
The fix has 3 coupled parts; all are required:
1. `next.config.ts`: `output: "standalone"` — makes `next build` PHYSICALLY COPY every nft-traced file
   AND every `outputFileTracingIncludes` glob into `.next/standalone/<mirrored repo path>/`. Verified: a
   clean standalone build placed all 89 `static-assets/*` (incl. the previously-404ing favicon.png /
   visa.svg / SKILL.md / _meta.json) into `.next/standalone/static-assets/`.
2. `.replit` build: `next build && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/`
   — standalone does NOT auto-copy `public/` or `.next/static`; without the `.next/static` copy the app's
   JS/CSS 404 and the site is broken.
3. `.replit` run: `cd .next/standalone && PORT=5000 HOSTNAME=0.0.0.0 node server.js` — MUST `cd` into the
   bundle so `process.cwd()` = `.next/standalone`, because every runtime asset read is
   `path.join(process.cwd(), <dir>)`. The standalone `server.js` reads PORT/HOSTNAME from env (no `-p` flag).
**Parity is preserved, nothing regresses:** the OTHER runtime `process.cwd()` reads — `content/`,
`data/bin-lookup.json`, `app/docs/content/*.md`, `static-assets/tenants/*/config.json` — use literal/dir
paths that nft traces as real deps (the same mechanism that already shipped tenant config to prod), so
standalone copies them into the bundle too; `cd .next/standalone` finds them all.
**Why standalone works where plain `next build` didn't:** with standalone the FILES ARE IN THE SHIPPED
BUNDLE regardless of whether Replit honors `outputFileTracingIncludes` — `next build` itself does the copy.
**Local verification is hostile** (don't waste time): `next dev` holds the `.next` lock (`lockDistDir:true`)
so a parallel `next build` blocks/half-completes; cold-cache builds exceed the 120s tool cap; `/tmp` logs
get wiped on workflow restart. Verify the COPY mechanism (inspect `.next/standalone/`), not a live server,
locally — trust the real deploy for runtime.

**Second gotcha from the same rename — the tenant config disk-read:** `getTenantConfig` in
`features/platform-management/tenants/config.ts` `fs`-reads `process.cwd()/<assetdir>/tenants/{id}/config.json`.
This is a SEPARATE hardcoded path from `STATIC_ROOT` in the route handler; renaming the asset dir must
update BOTH. Missing it made `next build` fail in page-data collection with
`Failed to load tenant config for "creditclaw"` (every page calls `getTenantConfig`). **`next dev` did
NOT catch it** — the loader caches configs in a module-level `Map`, so a dev server started before the
rename keeps serving the stale path; only a fresh build process hits the missing dir. **Lesson:** when
renaming the asset dir, grep ALL of source for the OLD literal (note: it may be a standalone string on its
own line inside a multi-line `path.join`, so `rg '"<olddir>"'` not just `join(...,"<olddir>"`), not just
config files — at minimum `tsconfig` exclude + the tenant-config loader. Verify with a full `next build`,
never just `next dev`.
