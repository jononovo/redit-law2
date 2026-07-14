# CLAUDE.md

Guidance for AI agents working in this repo. Read this first, then `replit.md`.

## What this project is

Next.js 16 / React 19 / TypeScript app (App Router), multi-tenant (CreditClaw · shopy.sh · brands.sh). Built on Replit and **still hosted on Replit** — Replit is staging and production. Development happens locally in VS Code with Claude Code.

**Canonical docs:**
- `replit.md` — single source of truth for architecture and conventions. Do not delete or rewrite it.
- `project_knowledge/_README.md` — navigation guide for deeper per-module docs. Start there for feature work.
- `claude_working_with_replit.md` — the peculiarities of developing this Replit-hosted project locally (npm package firewall, local Postgres + pgvector, port 5000/AirPlay, DB access). Read it before your first local build.

## Where things run

| | Local (this machine) | Replit (staging + prod) |
|---|---|---|
| Code | source of truth, edited here | pulled from GitHub, never edited |
| Database | local Postgres | Replit Postgres (separate dev + prod) |
| File storage | local dir | Replit App Storage bucket |
| Env vars | `.env.local` | Replit Secrets |

**Deploy flow:** edit locally → commit → push to GitHub → pull into the Repl → click Deploy in the Repl.

**Verifying changes in a browser — don't guess, look:**
- **Local:** `npm run dev` → `localhost:5000`. When the Claude Chrome extension is connected, the agent can drive the browser directly (navigate, click, screenshot); otherwise use `curl` for route/API smoke tests.
- **Staging (the Repl's dev deployment):** https://89296d20-74da-43ec-8204-367df2a223d5-00-13onhnckmod4a.kirk.replit.dev — reflects whatever is pulled+running in the Repl. Check here to confirm a push actually landed.
- **Production:** https://creditclaw.com — only updates when Deploy is clicked in the Repl. Staging and prod can run different builds; when behavior differs, compare the same route on both before debugging code.

**Two-way sync — always pull first.** Changes are sometimes made directly in the Repl (Node version bumps, config, occasional code) and pushed to GitHub from that side. Before starting any local work, run `git fetch` / `git pull` so you're building on top of the Repl's changes and don't create conflicts. `.replit` in particular is owned by the Repl — expect it to change there, not here.

## Hard rules

1. **Never edit or delete `.replit`.** It configures how the app runs on Replit.
2. **Never edit `.env.local` or `.env`.** If a value needs to change, tell the user what and why.
3. **Don't change the `dev`, `start`, or `build` scripts.** They bind `-p 5000 -H 0.0.0.0` because Replit expects that. It works locally too — open `localhost:5000`.
4. **Don't propose migrating off Replit** or restructuring the project for local dev. Edit locally, deploy on Replit, keep the diff small.
5. **Don't add services, containers, or infrastructure** without asking. If a problem seems to need one, say so and stop.
6. **Smallest change that works.** This codebase was written fast by an AI agent — it needs features, not a rewrite.
7. This is a **public repository.** Never commit secrets.

## Node version

Replit runs **Node 24** (`.replit` → `modules = [..., "nodejs-24"]`) — local dev must match. On this machine Node 24 is the global `node`, installed via Homebrew (`node@24`); `.nvmrc` also pins `24` for anyone using nvm. Confirm `node --version` shows 24.x before working. When Replit bumps Node, it edits `.replit` on that side and pushes — pull, then match locally.

## Environment variables

Replit Secrets are injected as env vars inside the Repl only. They don't exist locally and there is **no sync**.

- `.env.local` — local values, gitignored, never committed
- `.env.example` — variable **names** only, committed

When you add a new env var: add its name to `.env.example` and tell the user, so they can set it in Replit Secrets **before** the next deploy. A missing Secret fails at runtime, not at build.

## Database

**Replit is on current infrastructure, not legacy Neon.** The dev DB URL uses an internal host (`helium`) that is only resolvable inside the Repl — it **cannot be reached from this machine** by any tool, connection string, or workaround. Don't try, and don't suggest workarounds.

- **Local dev** runs against a **local Postgres** with the same schema. The `DATABASE_URL` in `.env.local` points at localhost.
- **Replit dev and prod** are separate databases. A schema change must be applied to both.

### How to query the database

You cannot connect to Replit's database from here. So:

- **For local data** (local Postgres): query it directly via `psql` or a script — it's on this machine and safe to touch.
- **For real Replit data (dev or prod):** you cannot connect. **Write the SQL, hand it to the user, and wait.** The user runs it in Replit's SQL runner and pastes the results back. Do not attempt to connect, tunnel, or work around this. When you need to see real data to proceed, stop and ask rather than guessing at the shape.

### Schema changes

Drizzle ORM, schema in `shared/schema.ts`, config in `drizzle.config.ts`. This project syncs schema with **`drizzle-kit push`** (not generated migration files — the `drizzle/` folder is empty by design). See `replit.md` for the canonical description. Scripts:

- `npm run db:push` — sync `shared/schema.ts` to the DB (prompts on destructive changes)
- `npm run db:push:force` — same, but **no prompts**

⚠️ **`push --force` drops columns/tables without asking.** It's fine against the **local** throwaway DB. Against Replit's **dev or prod** data, be extremely careful — a bad push destroys data. Prefer plain `db:push` (which prompts), review every proposed change, and let the user apply schema changes to Replit dev and prod (they run separate databases — both must be updated).

## Testing

Vitest is configured (`vitest.config.ts`, `@/` path alias). Run:

- `npm test` — run the suite once
- `npm run test:watch` — watch mode

Tests live in `tests/` — see `tests/_README.md` for coverage and guidelines. Write tests for critical business logic (scoring, payment calculations, validation).

## File storage

Uses Replit App Storage (GCS-backed) via Replit's client library, which authenticates using the Repl's own identity — that identity does not exist on this machine. If storage calls fail locally, that's expected; don't rewire them without asking.
