---
name: Multi-Tenant System — Technical Reference
description: How the multi-tenant system works. Domain resolution, config loading, theme injection, routing, navigation, footers, sitemaps, and per-tenant structural differences.
---

# Multi-Tenant System

Three tenants — **CreditClaw** (`creditclaw`), **shopy.sh** (`shopy`), **brands.sh** (`brands`) — share one Next.js codebase, one database, one deployment. Middleware resolves the tenant from the request domain, and the entire app adapts: landing page, nav, footer, theme, routes, feature flags, meta tags.

## Tenant Resolution

**File:** `middleware.ts`

Resolution order (first match wins):
1. `?tenant=` query param (dev/testing)
2. `TENANT_OVERRIDE` env var
3. `tenant-id` cookie
4. Domain-based lookup via `TENANT_DOMAINS` map

Domain map:
- `creditclaw.com` → `creditclaw`
- `shopy.sh` → `shopy`
- `brands.sh` → `brands`

Hostname is normalized (lowercase, strip `www.`). Matches exact domain or any subdomain (`.endsWith`). Default fallback: `creditclaw`.

Once resolved, tenant ID is:
- Set as `x-tenant-id` request header (available to server components, though most currently read the cookie directly)
- Persisted to `tenant-id` cookie (`path=/`, `sameSite=lax`)

**Note:** two resolution implementations exist — `middleware.ts` uses a hardcoded `TENANT_DOMAINS` map, while `lib/tenants/config.ts` has a `resolveTenantId()` that reads domain lists from config JSON files. These must stay in sync.

**Matcher:** all routes except `/_next/static`, `/_next/image`, `/favicon.ico`, `/assets/`.

## Config System

Two sources of truth (must stay in sync):

| Source | File | Used by |
|--------|------|---------|
| Static TS | `lib/tenants/tenant-configs.ts` | `TENANT_THEMES` for layout theme script, `getStaticTenantConfig()` |
| Dynamic JSON | `public/tenants/{tenantId}/config.json` | `getTenantConfig()` in `lib/tenants/config.ts` (server-side, cached in memory) |

**Config shape** (`lib/tenants/types.ts` — `TenantConfig`):
- `id`, `domains[]`
- `branding` — name, tagline, logo, logoEmoji, favicon, supportEmail, mascot
- `meta` — title, description, ogImage, twitterImage, url
- `theme` — primaryColor, primaryForeground, accentColor, secondaryColor (HSL strings without `hsl()` wrapper)
- `routes` — `guestLanding` (key used to select which landing component to import on `/`), `authLanding` (post-login redirect target)
- `features` — `Record<string, boolean>` feature flags
- `navigation` — header config + footer config (see sections below)
- `tracking` — optional `gaId`
- `pricing` — optional pricing page config (headline, plans, credits)

**Client access:** `useTenant()` hook from `lib/tenants/tenant-context.tsx`. Requires `<TenantProvider>` in the tree (set in `app/layout.tsx`).

## Theme Injection

**File:** `app/layout.tsx`

A blocking `<script>` runs before first paint to prevent FOUC:
- Reads `tenant-id` from cookie
- Looks up the tenant's theme from `TENANT_THEMES` (inlined as JSON)
- Sets CSS custom properties on `document.documentElement`: `--primary`, `--primary-foreground`, `--accent`, `--secondary`

All shadcn/ui components reference these variables, so the entire UI rebrands instantly.

## Landing Page Routing

**File:** `app/page.tsx`

The root `/` page reads the tenant cookie and dynamically imports the tenant-specific landing component:

| Tenant | `guestLanding` | Component |
|--------|----------------|-----------|
| creditclaw | `/creditclaw` | `components/tenants/creditclaw/landing.tsx` |
| shopy | `/shopy` | `components/tenants/shopy/landing.tsx` |
| brands | `/brands` | `components/tenants/brands/landing.tsx` |

Fallback: CreditClaw landing if no match.

## Header Navigation

**File:** `components/nav.tsx`

Driven by `tenant.navigation.header`:

| Property | CreditClaw | shopy.sh | brands.sh |
|----------|-----------|----------|-----------|
| `variant` | `light` | `light` | `dark` |
| `showLogo` | `true` | `true` | `false` |
| Links | How It Works, Score Scanner, Shopping Skills | Standard, Guide, Score Scanner, Docs, AXS | Skills, Submit, Docs |

**Variant behavior:**
- `light` — `bg-white/80`, dark text, primary-colored CTA button with `rounded-full` + shadow
- `dark` — `bg-neutral-950/80`, light text, white square CTA button with `rounded-none`

Both variants use `backdrop-blur-md` and sticky `top-0 z-50`.

Auth state determines right side: logged in → avatar + "Dashboard" link (→ `authLanding`), logged out → "Log in" + "Sign Up" buttons (both open `AuthDrawer`, redirect to `authLanding`).

## Footer

**File:** `components/footer.tsx`

Driven by `tenant.navigation.footer`:

| Property | CreditClaw | shopy.sh | brands.sh |
|----------|-----------|----------|-----------|
| `showLogo` | `true` (default) | `true` (default) | `false` |
| Columns | Product (6 links), Dashboard (4 links), Resources (3 links) | Product (2 links), Resources (3 links), Developers (3 links) | Catalog (3 links), Developers (3 links) |
| Socials | Twitter, Instagram, TikTok | Twitter, GitHub | Twitter, GitHub |

All footers share: `bg-neutral-900` background, Privacy Policy + Terms links, copyright with tenant name.

**CreditClaw footer columns:**
- Product: How It Works, Allowance, Safety, Vendor Skills, Score Scanner, Get Started
- Dashboard: Overview, Cards, Transactions, Settings
- Resources: Documentation, Developer, Newsroom

**shopy.sh footer columns:**
- Product: Score Scanner, How It Works
- Resources: Merchant Guide, The Standard, AXS Scoring
- Developers: Documentation, CLI Reference, Skill Format

**brands.sh footer columns:**
- Catalog: Browse Skills, Sectors, How It Works
- Developers: API Reference, SKILL.md Standard, CLI

## Feature Flags

`tenant.features` — flags defined in config but **not yet consumed at runtime** (no code currently reads `tenant.features`). Intended for future conditional rendering of tenant-specific UI modules.

| Flag | creditclaw | shopy | brands |
|------|-----------|-------|--------|
| `showScanner` | — | `true` | — |
| `showCatalog` | — | — | `true` |
| `showStandard` | — | `true` | — |
| `showGuide` | — | `true` | — |
| `showLeaderboard` | — | — | `true` |

## Route-Level Separation

Some routes are tenant-exclusive, some are shared:

**Tenant-adaptive routes** (render different component per tenant):
- `/` — landing page (see Landing Page Routing above)
- `/how-it-works` — each tenant has its own component (`components/tenants/{id}/how-it-works.tsx`)

**Tenant-specific by nav visibility only** (no hard block — accessible by direct URL on any tenant):
- CreditClaw nav: `/allowance`, `/safety`, `/onboarding`, `/setup/rail5`
- shopy.sh nav: `/standard`, `/guide`, `/axs`
- brands.sh nav: `/skills/submit` (linked in nav but page does not exist yet)

**Shared across tenants:** `/skills`, `/skills/[vendor]`, `/c/[sector]`, `/agentic-shopping-score`, `/docs`, `/overview`, `/newsroom`

No hard middleware blocks enforce route exclusivity. Visibility is controlled by which links appear in each tenant's nav/footer config.

## Sitemaps

**File:** `app/sitemap.ts`

Currently generates a **single sitemap under one base URL** (`NEXT_PUBLIC_BASE_URL`, defaults to `https://creditclaw.com`). Not yet tenant-aware.

Includes:
- Static pages: `/`, `/how-it-works`, `/safety`, `/skills`, `/solutions/*`, `/allowance`, `/newsroom`, `/docs`, `/privacy`, `/terms`
- Doc pages: all sections × pages from `docs/content/sections.ts`
- Blog: all posts, categories, tags
- Dynamic: brand skill pages (`/skills/{slug}`), sector pages (`/c/{sector}`) — only sectors with published brands

**Gap:** no per-tenant sitemap. shopy.sh and brands.sh domains currently lack their own sitemaps. Future work: generate tenant-specific sitemaps filtered to relevant routes per domain.

## Metadata / OG Tags

**File:** `app/layout.tsx` → `generateMetadata()`

Reads tenant from cookie, returns tenant-specific:
- `metadataBase` — set from `tenant.meta.url`
- `title` — flat string from `tenant.meta.title` (no template)
- `description`
- `openGraph` — title, description, type (`website`), siteName (`tenant.branding.name`), images
- `twitter` — `summary_large_image` card, title, description, images. `site` set to `@creditclaw` for CreditClaw only
- `icons` — tenant favicon or emoji-based SVG fallback

Each tenant has its own OG images at `tenant.meta.ogImage` and `tenant.meta.twitterImage`.

## Key Files

| File | Role |
|------|------|
| `middleware.ts` | Tenant resolution from domain/cookie/param |
| `lib/tenants/types.ts` | `TenantConfig` interface |
| `lib/tenants/tenant-configs.ts` | Static configs + `TENANT_THEMES` |
| `lib/tenants/config.ts` | `getTenantConfig()` — reads `public/tenants/{id}/config.json` |
| `lib/tenants/tenant-context.tsx` | `TenantProvider` + `useTenant()` hook |
| `public/tenants/{id}/config.json` | Dynamic config per tenant |
| `app/layout.tsx` | Theme injection script, metadata, `TenantProvider` |
| `app/page.tsx` | Root landing page routing |
| `components/nav.tsx` | Header nav (tenant-driven links, variant, logo) |
| `components/footer.tsx` | Footer (tenant-driven columns, socials, logo) |
| `app/sitemap.ts` | Sitemap generation (not yet tenant-aware) |
| `components/tenants/{id}/landing.tsx` | Per-tenant landing pages |
