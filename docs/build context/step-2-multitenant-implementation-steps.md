# Step 2: Multitenant System — Implementation Steps

**Source plan:** `Shopy/1-multitenant-system-nextjs-implementation-plan.md` (727 lines, covers concepts + rationale)
**This doc:** Ordered build steps for execution. Each step produces a testable, working state.

**Goal:** One codebase serves both creditclaw.com and shopy.sh (and future tenants). Tenant is resolved from the requesting domain. Branding, metadata, theme, navigation, landing page, and feature flags are all tenant-driven. No data isolation — shared database, attribution only.

---

## Current State

- No `middleware.ts` (existing middleware is API route protection only, at `lib/agent-management/agent-api/middleware.ts`)
- No tenant infrastructure: no `lib/tenants/`, no `public/tenants/`, no `TenantProvider`
- All branding hardcoded: `app/layout.tsx` (metadata, GA), `components/nav.tsx` (logo, name), `components/footer.tsx` (logo, name, copyright), `app/globals.css` (`:root` color vars)
- `app/layout.tsx` exports a static `metadata` object (not `generateMetadata()`)
- `app/page.tsx` is a simple component render (Nav + Hero + Features + Footer), no auth redirect
- Theme colors in `globals.css`: `--primary: 10 85% 55%`, `--secondary: 200 95% 60%`, `--accent: 260 90% 65%`
- `signupTenant` column does not exist on `owners` table yet

---

## Step 2A: TenantConfig Type + CreditClaw Default Config

**What:** Create the tenant infrastructure scaffolding and extract all hardcoded CreditClaw values into a config file.

**Files to create:**
- `lib/tenants/types.ts` — `TenantConfig` interface
- `lib/tenants/config.ts` — `getTenantConfig(tenantId)` with `fs.readFileSync` + in-memory cache
- `public/tenants/creditclaw/config.json` — all current hardcoded values extracted

**TenantConfig interface:**
```typescript
interface TenantConfig {
  id: string;
  domains: string[];
  branding: {
    name: string;
    tagline: string;
    logo: string;
    logoEmoji: string;
    favicon: string;
    supportEmail: string;
    mascot: string;
  };
  meta: {
    title: string;
    description: string;
    ogImage: string;
    twitterImage: string;
    url: string;
  };
  theme: {
    primaryColor: string;       // HSL without wrapper, e.g. "10 85% 55%"
    primaryForeground: string;
    accentColor: string;
    secondaryColor: string;
  };
  routes: {
    guestLanding: string;       // component key for landing page
    authLanding: string;        // redirect path after login
  };
  features: Record<string, boolean>;
  tracking?: { gaId: string };
  pricing?: { ... };            // full pricing schema from source plan
}
```

**CreditClaw config values to extract:**

| Source file | Value | Config path |
|---|---|---|
| `components/nav.tsx:17` | `/assets/images/logo-claw-chip.png` | `branding.logo` |
| `components/nav.tsx:19` | `"CreditClaw"` | `branding.name` |
| `app/layout.tsx:21` | `"CreditClaw - Give your bot a card"` | `meta.title` |
| `app/layout.tsx:22` | `"The fun, safe way to..."` | `meta.description` |
| `app/layout.tsx:29` | `/assets/og/og-image.png` | `meta.ogImage` |
| `app/layout.tsx:50` | `/assets/og/og-twitter.png` | `meta.twitterImage` |
| `app/layout.tsx:81` | `G-EGT42NKHLB` | `tracking.gaId` |
| `app/globals.css:61` | `10 85% 55%` | `theme.primaryColor` |
| `app/globals.css:64` | `200 95% 60%` | `theme.secondaryColor` |
| `app/globals.css:70` | `260 90% 65%` | `theme.accentColor` |
| `components/footer.tsx:61` | `© 2026 CreditClaw Inc.` | derived from `branding.name` |

**`getTenantConfig` behavior:**
- Reads `public/tenants/{tenantId}/config.json` via `fs.readFileSync`
- Caches in a `Map<string, TenantConfig>` per process lifetime
- Falls back to `creditclaw` if file not found

**Acceptance:** `getTenantConfig('creditclaw')` returns the full config. App still works identically — nothing reads from it yet.

**Blocked by:** Nothing

---

## Step 2B: Middleware — Tenant Resolution from Host Header

**What:** Create `middleware.ts` at project root. Resolves hostname → tenant ID, forwards via `x-tenant-id` request header + `tenant-id` cookie.

**Files to create:**
- `middleware.ts`

**Resolution logic:**
1. Read `hostname` from `x-forwarded-host` header (for proxies) or `host` header
2. Normalize: lowercase, strip `www.` prefix
3. Check `TENANT_OVERRIDE` env var (dev convenience)
4. Match against known tenant domain lists (loaded from config files or hardcoded minimal map)
5. Fall back to `creditclaw` for localhost, Replit preview URLs, unknown domains

**Matcher config:**
```typescript
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets/).*)'],
};
```

**Important:** The middleware must set the header on the *request* (not response) using `NextResponse.next({ request: { headers } })` so downstream Server Components can read it via `headers()`.

**Cookie:** Set `tenant-id` cookie with `path: '/'`, `sameSite: 'lax'` — used as client-side fallback.

**Edge case — existing API middleware:** The bot API middleware at `lib/agent-management/agent-api/middleware.ts` is a HOF for route handlers, not a Next.js middleware. No conflict. Both coexist.

**Acceptance:** Every request has `x-tenant-id` header available to Server Components. Visiting from any domain defaults to `creditclaw`. Can test with `TENANT_OVERRIDE=shopy` env var.

**Blocked by:** 2A (needs tenant domain lists from configs)

---

## Step 2C: Root Layout — Tenant-Aware Metadata + Theming

**What:** Convert `app/layout.tsx` from static `metadata` export to dynamic `generateMetadata()`. Inject tenant theme colors as inline styles on `<html>`. Conditionally inject GA script.

**Files to modify:**
- `app/layout.tsx`

**Changes:**

1. **Replace `export const metadata`** with `export async function generateMetadata()`:
   - Read `x-tenant-id` from `headers()`
   - Call `getTenantConfig(tenantId)`
   - Return tenant-specific title, description, OG/Twitter tags, favicon
   - CreditClaw's existing PNG favicon chain stays as-is for the default tenant; other tenants use the emoji SVG data URI approach from the plan

2. **Make `RootLayout` async:**
   - Read `x-tenant-id` from `headers()`
   - Load tenant config
   - Add `style` attribute to `<html>` with `--primary`, `--primary-foreground`, `--accent`, `--secondary` CSS vars from tenant theme
   - The existing `:root` block in `globals.css` remains as fallback defaults (inline styles on `<html>` override via specificity)

3. **GA script conditional:**
   - Only render GA `<Script>` tags if `tenant.tracking?.gaId` exists
   - Use `tenant.tracking.gaId` instead of hardcoded `G-EGT42NKHLB`

4. **Wrap children with `TenantProvider`:**
   - Pass serialized tenant config as a prop
   - Client components can access via `useTenant()` hook

**What stays the same:**
- Font loading (Plus Jakarta Sans, JetBrains Mono) — shared across all tenants
- `<Providers>` wrapper — auth, query client, etc. remain unchanged
- `globals.css` `:root` variables — untouched, serve as fallback

**Acceptance:** Page source shows tenant-specific `<title>`, OG tags, and inline CSS variables on `<html>`. No visual change for CreditClaw tenant. `globals.css` `:root` values match CreditClaw config (by design), so no flash.

**Blocked by:** 2A, 2B

---

## Step 2D: TenantProvider for Client Components

**What:** Create the client-side context so client components can access tenant config without prop drilling.

**Files to create:**
- `lib/tenants/tenant-context.tsx` — `'use client'` context provider + `useTenant()` hook

**Files to modify:**
- `app/layout.tsx` — wrap children with `<TenantProvider tenant={config}>`

**Provider design:**
- Synchronous — initialized from server-provided props, no async fetch
- Throws if used outside provider (developer safety)
- Cookie fallback: `getTenantIdFromCookie()` helper for edge cases where context isn't available (e.g., standalone client scripts)

**Acceptance:** `useTenant()` returns the full `TenantConfig` in any client component under the root layout.

**Blocked by:** 2A, 2C

---

## Step 2E: De-hardcode Nav + Footer

**What:** Replace hardcoded branding in navigation and footer with tenant-driven values.

**Files to modify:**
- `components/nav.tsx` — logo path, site name from `useTenant()`
- `components/footer.tsx` — logo path, site name, copyright from `useTenant()`

**Changes:**
- Import `useTenant` from `lib/tenants/tenant-context`
- Replace `/assets/images/logo-claw-chip.png` with `tenant.branding.logo`
- Replace `"CreditClaw"` with `tenant.branding.name`
- Replace `© 2026 CreditClaw Inc.` with `© ${year} ${tenant.branding.name}`
- Nav links may need tenant-awareness later (Step 3 — shopy.sh has different nav items), but for now keep the same links. Add a `// TODO: tenant-specific nav links` comment.

**Risk:** Nav and Footer are client components (they use `useAuth`, `useState`, etc.). They can access `useTenant()` since they're under `TenantProvider` in the layout.

**Acceptance:** Nav and footer render CreditClaw branding from config, not from hardcoded strings. Visual output identical.

**Blocked by:** 2D

---

## Step 2F: Tenant-Aware Root Page (Landing + Auth Redirect)

**What:** Make `app/page.tsx` tenant-aware. Resolve which landing page to render based on tenant config. Add server-side auth redirect.

**Files to modify:**
- `app/page.tsx`

**Changes:**

1. **Make it an async Server Component** (it currently renders directly)
2. **Read tenant** from `x-tenant-id` header
3. **Auth check:** If user is authenticated, `redirect(tenant.routes.authLanding)` (HTTP 307 — user never downloads landing page JS)
4. **Landing page selection:** Use `tenant.routes.guestLanding` as a key into a component map:
   ```typescript
   const landingComponents: Record<string, () => Promise<{ default: React.ComponentType }>> = {
     '/creditclaw': () => import('@/components/landings/CreditclawLanding'),
     // '/shopy': () => import('@/components/landings/ShopyLanding'),  // Step 3
   };
   ```
5. **Extract current landing content** into `components/landings/CreditclawLanding.tsx` if it's currently inline in `page.tsx`

**Current page.tsx structure:**
```
Nav → AnnouncementBar → Hero → BotSignup → LiveMetrics → Features → WaitlistForm → Footer
```
This full composition moves into `CreditclawLanding.tsx`. The root `page.tsx` becomes a thin routing layer.

**Auth redirect note:** The current app handles auth redirect in the Nav component (shows different links). Server-side redirect is an improvement — authenticated users get a 307 to `/overview` immediately, never downloading the landing page bundle.

**Acceptance:** Unauthenticated users see the CreditClaw landing (unchanged). Authenticated users get a server redirect to `/overview`. Landing page component is now modular and replaceable per tenant.

**Blocked by:** 2C, 2D

---

## Step 2G: API Routes — Read Tenant from Header

**What:** Establish the pattern for tenant-aware API routes. Not all routes need tenant awareness (most are tenant-agnostic), but set up the helper so routes that need it can opt in.

**Files to create/modify:**
- `lib/tenants/get-request-tenant.ts` — helper that reads `x-tenant-id` from `headers()` and returns the config

**Helper:**
```typescript
import { headers } from 'next/headers';
import { getTenantConfig } from './config';

export async function getRequestTenant() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || 'creditclaw';
  return getTenantConfig(tenantId);
}
```

**No existing routes need modification yet.** The brand search API, scan API, bot API, etc. are all tenant-agnostic. This step just establishes the pattern.

**Acceptance:** Helper exists and can be called from any API route. No route changes needed yet.

**Blocked by:** 2B

---

## Step 2H: Database — `signupTenant` Column on `owners`

**What:** Add a write-once attribution field to track which tenant domain a user signed up from.

**Files to modify:**
- `shared/schema.ts` — add `signupTenant` column to `owners` table
- New migration file

**Column spec:**
```typescript
signupTenant: text("signup_tenant"),
```

**Behavior:**
- Set once during user registration with the tenant ID from the request
- Nullable — existing users will have `null`
- Never updated after initial write
- Used for analytics only — no data isolation, no row-level filtering

**Where it gets set:** In the auth registration flow. Find where new `owners` rows are inserted and add `signupTenant: tenantId` from the request context.

**Acceptance:** Column exists. New user registrations record the tenant ID. Existing users unaffected (null value).

**Blocked by:** 2B (needs tenant ID in request context)

---

## Step 2I: shopy.sh Tenant Config (Skeleton)

**What:** Create the shopy.sh tenant config so the multitenant system can be end-to-end tested with a second tenant.

**Files to create:**
- `public/tenants/shopy/config.json`
- `public/tenants/shopy/images/` (placeholder logo)

**Config values (from brand identity doc):**

```json
{
  "id": "shopy",
  "domains": ["shopy.sh", "www.shopy.sh"],
  "branding": {
    "name": "shopy.sh",
    "tagline": "Make your store shoppable by AI agents.",
    "logo": "/tenants/shopy/images/logo.png",
    "logoEmoji": "🛒",
    "favicon": "/tenants/shopy/images/favicon.ico",
    "supportEmail": "hello@shopy.sh",
    "mascot": ""
  },
  "meta": {
    "title": "shopy.sh — The open standard for agentic commerce",
    "description": "Make your store discoverable and shoppable by AI agents. Check your ASX Score, browse the catalog, install shopping skills.",
    "ogImage": "/tenants/shopy/images/og-image.png",
    "twitterImage": "/tenants/shopy/images/og-twitter.png",
    "url": "https://shopy.sh"
  },
  "theme": {
    "primaryColor": "0 0% 0%",
    "primaryForeground": "0 0% 100%",
    "accentColor": "0 0% 0%",
    "secondaryColor": "0 0% 40%"
  },
  "routes": {
    "guestLanding": "/shopy",
    "authLanding": "/overview"
  },
  "features": {
    "showScanner": false,
    "showCatalog": true,
    "showLeaderboard": true,
    "showStandard": true,
    "showGuide": true
  }
}
```

**Theme note:** shopy.sh brand identity calls for "minimal color palette — black/white/one accent color." The exact colors can be refined in Step 3. Placeholder black/white theme lets us verify theming works.

**No landing page component yet** — that's Step 3. For now, `guestLanding: '/shopy'` has no matching entry in the component map, so it falls back to the CreditClaw landing. This is expected — Step 2 only builds the infrastructure.

**Acceptance:** `getTenantConfig('shopy')` returns the config. Setting `TENANT_OVERRIDE=shopy` shows shopy.sh branding in nav/footer, shopy.sh metadata in page source, and black/white theme colors. Landing page still shows CreditClaw content (expected — Step 3 builds shopy.sh pages).

**Blocked by:** 2A

---

## Dependency Map

```
2A (Types + CreditClaw Config) ←── no deps, start here
  ↓
2B (Middleware) ←── depends on 2A
2I (shopy.sh Config Skeleton) ←── depends on 2A (independent of 2B)
  ↓
2C (Layout — Metadata + Theming) ←── depends on 2A, 2B
2G (API Route Helper) ←── depends on 2B
  ↓
2D (TenantProvider) ←── depends on 2A, 2C
2H (signupTenant Column) ←── depends on 2B
  ↓
2E (Nav + Footer De-hardcode) ←── depends on 2D
2F (Root Page — Landing + Redirect) ←── depends on 2C, 2D
```

**Parallelism:** After 2A is done, 2B and 2I can run in parallel. After 2B, 2C/2G/2H can run in parallel. After 2D, 2E and 2F can run in parallel.

**Total: 9 sub-steps.** Steps 2A-2F are the core multitenant system. Steps 2G-2I are supporting pieces.

---

## What This Step Does NOT Include

- **shopy.sh landing page or unique pages** → Step 3
- **Route-level tenant separation** (e.g., `/standard` only on shopy.sh) → Step 3
- **Tenant-specific nav link structures** → Step 3
- **shopy.sh visual design / branding assets** → Step 3
- **DNS / domain configuration** → deployment concern, not code
- **Pricing config per tenant** → future (pricing section exists in schema but no plans differ yet)

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| `generateMetadata()` is async — could impact TTFB | `getTenantConfig` reads from in-memory cache after first load. `fs.readFileSync` is <1ms for a small JSON file. No measurable impact. |
| Middleware runs on every request | Matcher excludes static assets. Resolution is a string comparison — microseconds. |
| Breaking existing metadata/SEO | CreditClaw config values are extracted 1:1 from hardcoded values. Diff will show the replacement. |
| `TenantProvider` adds a context layer | Zero runtime cost — synchronous, no re-renders, no data fetching. |
| Server-side auth redirect changes landing page behavior | Improvement — users get 307 instead of downloading landing page JS. But need to verify auth session check doesn't add latency. |
| CSS specificity: inline styles vs `:root` | Tested — inline styles on `<html>` override `:root` in all browsers. |
