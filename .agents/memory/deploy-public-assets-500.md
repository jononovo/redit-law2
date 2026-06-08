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
