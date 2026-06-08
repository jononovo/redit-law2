---
name: Recurring /assets 500 on VM deploy
description: Why raw public/ assets return HTTP 500 in production on Replit vm deploys while _next/static works, and the durable fix direction.
---

# Recurring `/assets/*` HTTP 500 on the deployed site

**Symptom:** On `creditclaw.com` (and the other tenants), every raw `public/` asset
(`/assets/logos/*.svg`, `/assets/images/*.png|jpg`) returns **HTTP 500** in production.
Recurs on essentially every deploy; prior code patches appear to fix it, then it breaks again.

**Root cause (platform, not our code):** On Replit **`vm`** deployments, files under `public/`
are served by the platform **edge static-file layer, NOT by `next start`**. That edge layer's
copy of `public/` is unreliable and returns a uniform error: **HTTP 500, `content-length: 21`
("Internal Server Error"), one shared `etag` (e.g. `66fci67lppl`) for every asset, content-type
guessed from the URL extension.** Every `/assets/*` path resolves to the same error object.

**How to confirm (all read-only):**
- `curl -D - https://creditclaw.com/assets/logos/visa.svg` → 500, 21 bytes, no `x-powered-by: Next.js`,
  has `etag`/`last-modified`/`accept-ranges` (static-server hallmarks), and `cache-control: private, no-cache`
  (i.e. the `next.config` `headers()` rule for `/assets/:path*` is **not applied** — request never reaches Next).
- `/favicon.ico` and `/` DO carry `x-powered-by: Next.js` → they reach `next start`.
- `/_next/static/media/*.woff2` (bundled, content-hashed) → **200, immutable**. Same CDN, different pipeline, works fine.
- Asset 500s never appear in `fetchDeploymentLogs` (they're edge-generated). Build is `hasSuccessfulBuild: true`.
- Files are all committed (`git ls-files public/assets`) and present on disk. Not a missing-file / not-tracked issue.

**Key mechanism (decisive for the fix):** the edge only 500s on files that **physically exist in `public/`** and are of certain types. A **non-existent** `/assets/...` path returns **404 via Next** (`x-powered-by: Next.js`) — i.e. it falls through to `next start`. So it's NOT a path-pattern intercept. By type: `/assets/*` images (svg/png/jpg) and `public/*.md` (e.g. `/SKILL.md`) → 500; `.json`/`.txt`/Next-generated routes (robots) and `_next/static/*` → 200. So removing a file from `public/` makes its URL reach `next start` instead of the broken edge.

**Why patches never stick:** nothing in the repo controls the edge's `public/` sync. Cache-header tweaks
(e.g. commit "Improve asset loading reliability by configuring cache headers" adding
`Cache-Control: public, max-age=3600, stale-if-error=86400` on `/assets/:path*`) don't even reach these
responses, so they can't fix it. Each redeploy re-runs the flaky edge ingest → recurrence.

**Durable fix direction (ranked — simplest first):**
1. **Route handler (recommended, lowest churn):** move `public/assets/` out of `public/` (e.g. to `static-assets/`) and serve the same `/assets/*` URLs via one catch-all `app/assets/[...path]/route.ts` that `fs`-reads from the new dir (reuse the `config.ts` `process.cwd()` pattern) with a path-traversal guard, content-type map, and long `Cache-Control`. Works because missing public files fall through to `next start` (proven). **Zero changes to the ~21 component refs, Tailwind `bg-[url]`, or tenant `config.json` strings** — all keep working. Tradeoff: assets flow through Node not the CDN edge (mitigate with cache headers; files aren't content-hashed so avoid `immutable`).
2. **Bundle imports** — import assets as modules → `_next/static/media/` (content-hashed, immutable, CDN). Best perf but rewrites every `/assets/...` ref + needs a code map for JSON-config assets (logo/og/mascot) + Tailwind transforms. More churn/risk; touches tenant-theming surface.
3. Switch deploy target `vm` → `autoscale` *if* no always-on worker requires VM (scan-queue/bots likely do). Not guaranteed.
4. Report as a Replit platform bug.

**Scope note:** `public/*.md` (`/SKILL.md`, CHECKOUT-GUIDE.md, …) share the same root cause and stay broken unless also moved/served via a route. Out of scope when the ask is "images."

**Why (the principle):** the raw `public/` edge path is unreliable on `vm` deploys for image/`.md` types; route everything that must be reliable through `next start` (or `_next/static`). The `headers()` rule on `/assets/:path*` is dead weight in prod and can be removed when fixing.
