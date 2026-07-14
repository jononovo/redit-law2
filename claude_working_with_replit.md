# Working with this Replit-hosted project locally

Context for AI agents (and humans) developing this repo on a local machine. The app runs on **Replit** (staging + production) but is **developed locally in VS Code**. This doc captures the peculiarities of that split so you can get up to speed fast. For product architecture, read `replit.md`; for the short rules, read `CLAUDE.md`. This file is the detailed reference for the local ↔ Replit mechanics.

## The model in one line

Edit locally → commit → push to GitHub → pull into the Repl → click Deploy. The Repl is authoritative for *running*; your machine is authoritative for *source*. Changes are sometimes also made **inside the Repl** and pushed to GitHub — so **always `git pull` before starting local work.**

## Node

- Local `node` is Homebrew **`node@24`**, matching Replit's `.replit` `modules = [..., "nodejs-24"]`.
- `.nvmrc` pins `24` for nvm users, but note **`.nvmrc` is inert on Replit** — Replit pins Node via `.replit`, not `.nvmrc`. It only affects local nvm users.
- When Replit bumps Node (it has done so repeatedly), it edits `.replit` and `@types/node` in the Repl and pushes. Pull, then match locally (`brew upgrade node` or install the matching `node@NN`).

## Local database

- Local dev runs against **`postgresql@17` + `pgvector`** (Homebrew), database **`heliumdb`**, role **`postgres`** / password `password`, on `localhost:5432`. `DATABASE_URL` in `.env.local` points here.
- Replit itself runs `postgresql-16`. The local/remote major-version difference (17 vs 16) is harmless for this schema.
- `pgvector` is required — the schema uses a `vector(384)` column for product embeddings. Installed via `brew install pgvector` (ships for pg17/18) + `CREATE EXTENSION vector;`.
- The schema was applied once with `drizzle-kit push` against the empty local DB. That's safe **only** because it's a throwaway local DB.

### Reaching Replit's database — you can't

Replit's dev DB URL uses an internal host (`helium`) that is **only resolvable inside the Repl**. It cannot be reached from this machine by any tool, connection string, tunnel, or workaround. Don't try.

**When you need real Replit data:** write the SQL, hand it to the user, and wait. They run it in Replit's SQL runner and paste the results back. When you need to see real data to proceed, stop and ask rather than guessing at the shape.

Note: `.env.local` previously pointed `DATABASE_URL` at an old **Neon** cloud DB (pre-`helium`). That URL is kept commented in `.env.local` for reference but is not used for local dev.

## npm install & the Replit package firewall

A minor but blocking snag. **Most** of `package-lock.json` (~2,131 of ~2,137 resolved URLs) is canonical `registry.npmjs.org` and fully portable — only ~6 entries point at **`package-firewall.replit.local`**, Replit's package firewall (a deliberate security proxy that scans packages). But `npm install` still fails the whole install on those few unreachable URLs: `ENOTFOUND package-firewall.replit.local`.

Don't try to permanently "fix" this — the firewall is intentional, and Replit re-writes those URLs on its next in-Repl `npm install` anyway, so any local rewrite just churns. Just use the workaround when you hit it.

**Workaround** — install from the public registry with the committed lockfile moved aside, then restore it so the repo stays clean:

```bash
mv package-lock.json /tmp/ && npm install && git checkout package-lock.json
```

Your `~/.npmrc` already targets the public `registry.npmjs.org` with a valid token, so the fresh resolve works. Do **not** commit the regenerated lockfile — Replit's committed one must stay (Replit re-writes it to its firewall URLs anyway).

**npm 11 blocks native postinstall scripts** by default. After install, run:

```bash
npm rebuild esbuild
```

so `drizzle-kit` and `vitest` (which need esbuild's native binary) work.

## File storage

Uses Replit App Storage (GCS-backed) via Replit's client library, which authenticates using the **Repl's own identity** — that identity does not exist on this machine. Storage calls may fail locally; that's expected. Don't rewire storage without asking.

## Environment variables & Secrets

Replit **Secrets** are injected as env vars inside the Repl only. They don't exist locally and there is **no sync**.

- `.env.local` — local values, gitignored, never committed.
- `.env.example` — variable **names** only, committed.
- When you add a new env var: add its name to `.env.example` and tell the user, so they set the Secret in Replit **before** the next deploy. A missing Secret fails at runtime, not at build.

## First-run checklist on a fresh clone

1. Match Node to Replit's version (currently 24).
2. `mv package-lock.json /tmp/ && npm install && git checkout package-lock.json`
3. `npm rebuild esbuild`
4. Ensure local Postgres 17 + pgvector is running with `heliumdb`; `DATABASE_URL` in `.env.local` points at it.
5. `npm run dev` → `localhost:5000`.
