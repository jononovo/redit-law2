---
name: Static asset serving + the public/ 500 history
description: How static assets are served in prod (native public/ + standalone), why that's the current design, and the platform facts learned from the earlier public/ 500 saga so we don't repeat the detours.
---

# Static asset serving (current) + the `public/` 500 history

## Current design — plain Next `public/`, served natively
All 89 static assets (images under `/assets/**`, tenant `config.json`s under
`/tenants/{id}/`, skill docs like `/SKILL.md`, `/amazon/AMAZON.md`, `_meta.json`, …)
live in the **root `public/`** folder and are served by **Next itself** — no custom
route handler, no `rewrites`, no `outputFileTracingIncludes`. URLs are the natural
public paths (`/assets/logos/visa.svg`, `/SKILL.md`, `/tenants/creditclaw/config.json`).

`getTenantConfig` (`features/platform-management/tenants/config.ts`) `fs`-reads
`process.cwd()/public/tenants/{id}/config.json` server-side.

**Why this shape:** the earlier setup (a top-level `static-assets/` dir + an
`app/static-files/[...path]` route handler + per-extension `rewrites().fallback` +
`outputFileTracingIncludes`) was over-engineered. It was deleted in favor of the
standard Next `public/` folder. Assets verified serving 200 locally via native
`public/`.

## Deploy model — KEEP `output: "standalone"`
`next.config.ts` has `output: "standalone"`. This is deliberate and load-bearing:
- `.replit` build: `next build && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/` — standalone does NOT auto-copy `public/` or `.next/static`; without the `.next/static` copy the app's JS/CSS 404.
- `.replit` run: `cd .next/standalone && … node server.js` — MUST `cd` in so `process.cwd()` = `.next/standalone`, because tenant config (and `content/`, `data/*.json`, `app/docs/content/*.md`) are read via `path.join(process.cwd(), …)`. The standalone `server.js` reads PORT/HOSTNAME from env (no `-p` flag).

With standalone + `node server.js`, the Node process serves `public/` in-process — the same process that already serves everything else. Don't switch to plain `next start` casually: that's the exact config the original 500s appeared under (see below), so it reopens that risk.

## The `public/` 500 history — durable platform facts (why we took detours)
The reason a custom asset pipeline ever existed: production intermittently returned
**HTTP 500** for raw `public/` files across deploys. Facts worth keeping:
- **Don't name a runtime-`fs`-served asset dir `static`.** `static/` is a Next reserved/deprecated dir; it gets intercepted (deprecation warning + legacy 500/404). `public` is also special-cased — but Next serves `public/` natively, which is fine; the trap is only custom `fs` serving from a reserved name.
- **Replit `vm` deploy prunes to nft-traced deps and IGNORES `outputFileTracingIncludes`.** Files referenced only via that config land only in `route.js.nft.json` and are silently dropped from the VM. Build-time-read files (e.g. tenant `config.json`, read during page prerender) DO ship. This is why the route-handler approach 404'd in prod and why **`output: "standalone"` is kept** — standalone physically copies files into the bundle, so shipping no longer depends on Replit honoring the include.
- **When relocating the asset dir, update `tsconfig.json` `exclude`.** The OpenClaw plugin source imports the uninstalled `openclaw/plugin-sdk`, so it's excluded from type-check via `public/Plugins/**/*`. A wrong prefix here makes `next build` (with `ignoreBuildErrors:false`) type-check the plugins and fail — and `next dev` won't catch it, only a full build will.

## Open risk (verify on next prod deploy)
Moving back to `public/` reopens the original question: does prod serve native
`public/` files reliably now? Local dev serves them 200, but the 500 saga was
prod/deploy-only. **If `public/` assets 500 in prod again, do NOT rebuild the custom
route handler** — that path was a dead end. The next move is Replit **Object Storage**
for the asset tree (the option deferred earlier), not more `fs`/rewrite machinery.

## Loose end (pre-existing, unrelated)
`build-variants.ts` reads lowercase `public/skill.md`, but the master file is
`SKILL.md` (uppercase) → the local skill-variants build crashes on Linux (case-sensitive
fs). Separate from asset serving; not fixed unless requested.
