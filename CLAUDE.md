# CreditClaw (redit-law2)

## Project Overview

Legal/credit SaaS app built with Next.js, hosted and deployed on Replit. Database and secrets live in Replit environment — never commit secrets.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Neon PostgreSQL (serverless) via Drizzle ORM
- **Auth**: Firebase Auth + Privy
- **Payments**: Stripe
- **Email**: SendGrid
- **AI**: Anthropic Claude SDK
- **UI**: Radix UI + Tailwind CSS 4 + shadcn components
- **Hosting**: Replit (deployment target: VM)

## Development

```bash
npm install
npm run dev          # starts on port 5000
```

## Database

```bash
npx drizzle-kit push    # push schema to Neon
npx drizzle-kit studio  # visual DB browser
```

Schema lives in `shared/` and `server/` directories.

## Git Workflow

Two developers: **RC** (Claude Code, local) and **Jono** (Replit).

### Branches
- `main` — production releases only, protected
- `dev` — integration branch, all feature work merges here first
- `rc/*` — RC's feature branches (e.g., `rc/add-stripe-webhooks`)
- `jono/*` — Jono's feature branches (e.g., `jono/fix-login`)

### Flow
1. Create feature branch from `dev`: `git checkout -b rc/my-feature dev`
2. Make changes, commit with conventional commits
3. Push branch, open PR into `dev`
4. Other person reviews (or self-merge for small changes)
5. When `dev` is stable → PR from `dev` into `main` for release

### Rules
- Never commit directly to `main` or `dev`
- Never commit `.env` files or secrets
- Pull `dev` before creating feature branches
- Replit auto-deploys from `main` — treat it as production

## Secrets (DO NOT COMMIT)

All secrets are in Replit environment variables. Required env vars:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `SENDGRID_API_KEY`
- `ANTHROPIC_API_KEY`
- `FIREBASE_*` — Firebase config (public keys in `.replit`, private keys in env)
- `PRIVY_APP_SECRET`
- `CRON_SECRET`

## Project Structure

```
app/              # Next.js App Router pages and API routes
components/       # React components (shadcn + custom)
lib/              # Utilities, configs, client-side logic
server/           # Server-side logic, DB queries, auth
shared/           # Shared types, schemas (Drizzle + Zod)
hooks/            # React hooks
public/           # Static assets
drizzle/          # DB migrations
tests/            # Vitest tests
skill-variants/   # Skill variant modules
```

## Local Development (without Replit)

To work locally you need a `.env.local` file with the required secrets. Get these from Replit's Secrets tab. The app connects to the same Neon DB regardless of where it runs.

```bash
cp .env.example .env.local  # fill in values from Replit
npm install
npm run dev
```
