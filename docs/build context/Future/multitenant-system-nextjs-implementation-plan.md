# Multitenant System — Next.js Implementation Plan

## Background

### Source System
The multitenant system being ported was built for a React SPA (Vite) + Express backend. It serves multiple product brands (tenants) from a single deployment, where each tenant gets its own landing page, post-login experience, branding, theme, favicon, meta/OG tags, feature flags, and pricing — all determined at runtime by the requesting domain. The system uses dual resolution (server-side via Express middleware and client-side via async config fetching in a React context provider), which creates complexity around synchronization, loading states, and SEO correctness.

### Target System
CreditClaw runs on:
- **Next.js 16** with App Router
- **React 19**
- **Tailwind CSS v4** with shadcn/ui components
- **Drizzle ORM** with PostgreSQL
- **Firebase Auth** (client-side SDK + server session cookies)
- **Plus Jakarta Sans** (headings/body) + **JetBrains Mono** (code/data)

The App Router's server-first architecture eliminates most of the source system's complexity. Middleware handles tenant resolution once, Server Components read config from disk synchronously, and `generateMetadata()` replaces all client-side DOM manipulation for SEO tags.

---

## Section 1: What Stays the Same

### 1.1 TenantConfig Schema

The TypeScript interface carries over from the original system with CreditClaw-specific additions (`secondaryColor` for the three-color palette, and flexible feature flags via `Record<string, boolean>` instead of hardcoded boolean fields).

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
    primaryColor: string;
    primaryForeground: string;
    accentColor: string;
    secondaryColor: string;
  };

  routes: {
    guestLanding: string;
    authLanding: string;
  };

  features: Record<string, boolean>;

  tracking?: {
    gaId: string;
  };

  pricing?: {
    headline: string;
    subheadline: string;
    creditsLabel: string;
    creditsExplanation?: {
      title: string;
      subtitle: string;
      items: { value: string; label: string }[];
    };
    ctaSection?: {
      title: string;
      subtitle: string;
      buttonText: string;
      buttonLink: string;
    };
    plans: {
      id: string;
      name: string;
      credits: number;
      bonus: number;
      price: number;
      description: string;
      features: string[];
      highlight: boolean;
      cta: string;
      comingSoon?: boolean;
    }[];
  };
}
```

### 1.2 Static Asset Layout

Unchanged from the source system. Each tenant has a directory under `public/tenants/`:

```
public/tenants/
├── creditclaw/
│   ├── config.json
│   └── images/
│       ├── logo.png
│       ├── og-image.png
│       └── mascot.png
└── {future-tenant}/
    ├── config.json
    └── images/
        └── ...
```

### 1.3 Domain Matching Algorithm

The hostname → tenant ID matching algorithm is identical:

1. Normalize hostname: lowercase + strip `www.` prefix
2. For each tenant, check each entry in `domains[]`:
   - **Exact match**: `normalizedHost === normalizedDomain`
   - **Subdomain suffix**: `normalizedHost.endsWith('.' + normalizedDomain)`
3. If no match, fall back to the default tenant (`creditclaw`)

```typescript
function resolveTenantId(hostname: string, configs: TenantConfig[]): string {
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, '');
  for (const tenant of configs) {
    for (const domain of tenant.domains) {
      const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
      if (
        normalizedHost === normalizedDomain ||
        normalizedHost.endsWith('.' + normalizedDomain)
      ) {
        return tenant.id;
      }
    }
  }
  return 'creditclaw';
}
```

### 1.4 HSL Color Format

Theme colors continue to use raw HSL values without the `hsl()` wrapper (e.g., `"10 85% 55%"`). This is required for compatibility with the existing `globals.css` pattern where shadcn/Tailwind consumes them as `hsl(var(--primary))`. The `:root` block in `globals.css` currently defines:

```css
:root {
  --primary: 10 85% 55%;
  --secondary: 200 95% 60%;
  --accent: 260 90% 65%;
  /* ... other variables ... */
}
```

Tenant-specific values override these at the `<html>` element level via inline styles in the root layout.

---

## Section 2: What Changes for Next.js

### 2.1 Tenant Resolution via `middleware.ts`

**Replaces:** Dual server-side (`server/tenants/index.ts`) and client-side (`client/src/lib/tenants/index.ts`) resolution.

A single `middleware.ts` at the project root runs on every request before any page renders. It reads the `Host` header, resolves the tenant ID, and forwards it downstream via both a request header and a cookie.

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_TENANT = 'creditclaw';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const tenantId = resolveTenantId(hostname);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenantId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.cookies.set('tenant-id', tenantId, {
    path: '/',
    sameSite: 'lax',
  });

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets/).*)'],
};
```

**Important Next.js detail:** To make the `x-tenant-id` header available to downstream Server Components and API routes via `headers()`, the middleware must clone the incoming request headers, add the custom header, and pass them via `NextResponse.next({ request: { headers } })`. Simply calling `response.headers.set()` only sets a _response_ header visible to the browser, not to server-side code.

**Behavior:**
- Known domains resolve to their tenant
- `localhost` and unknown domains (including Replit preview URLs) fall back to `creditclaw`
- Eliminates the dual-resolution synchronization problem entirely

### 2.2 Config Loading via `fs.readFileSync`

**Replaces:** Client-side HTTP fetch of all `config.json` files with async loading spinner.

```typescript
// lib/tenants/config.ts
import fs from 'fs';
import path from 'path';
import type { TenantConfig } from './types';

const cache = new Map<string, TenantConfig>();

export function getTenantConfig(tenantId: string): TenantConfig {
  if (cache.has(tenantId)) return cache.get(tenantId)!;

  const configPath = path.join(
    process.cwd(),
    'public',
    'tenants',
    tenantId,
    'config.json'
  );
  const config: TenantConfig = JSON.parse(
    fs.readFileSync(configPath, 'utf-8')
  );
  cache.set(tenantId, config);
  return config;
}
```

**Key differences from source:**
- Synchronous — no loading state, no spinner
- Server-only — config never ships to the client bundle unless explicitly serialized as props
- Cached in-memory per process lifetime (same as the source Express server)

### 2.3 Metadata via `generateMetadata()`

**Replaces:** Client-side `updateMetaTags()` DOM manipulation and `updateFavicon()`.

```typescript
// app/layout.tsx
import { headers } from 'next/headers';
import { getTenantConfig } from '@/lib/tenants/config';

export async function generateMetadata() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || 'creditclaw';
  const tenant = getTenantConfig(tenantId);

  return {
    title: tenant.meta.title,
    description: tenant.meta.description,
    icons: {
      icon: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${tenant.branding.logoEmoji}</text></svg>`,
    },
    openGraph: {
      title: tenant.meta.title,
      description: tenant.meta.description,
      images: [tenant.meta.ogImage],
      url: tenant.meta.url,
      siteName: tenant.branding.name,
    },
    twitter: {
      title: tenant.meta.title,
      description: tenant.meta.description,
      images: [tenant.meta.twitterImage],
    },
  };
}
```

**Advantages:**
- SSR-correct: crawlers and social media link previews see tenant-specific tags on first response with zero JavaScript execution
- Emoji favicon via `metadata.icons` — same SVG data URI approach as the source, but baked into the server response
- Eliminates the find-or-create DOM manipulation pattern entirely

### 2.4 Theming via Inline `style` on `<html>`

**Replaces:** Client-side `applyTenantTheme()` that sets CSS custom properties via `document.documentElement.style.setProperty()`.

```typescript
// app/layout.tsx
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || 'creditclaw';
  const tenant = getTenantConfig(tenantId);

  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${mono.variable}`}
      style={{
        '--primary': tenant.theme.primaryColor,
        '--primary-foreground': tenant.theme.primaryForeground,
        '--accent': tenant.theme.accentColor,
        '--secondary': tenant.theme.secondaryColor,
      } as React.CSSProperties}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**How it works with `globals.css`:**
- The existing `:root` block in `globals.css` remains as-is and provides fallback default values
- The inline `style` on `<html>` overrides the specific color variables per-tenant
- CSS specificity: inline styles on `<html>` beat `:root` pseudo-class declarations
- No flash of un-themed content — the HTML arrives pre-themed from the server

### 2.5 Routing via Server-Side Resolution in `app/page.tsx`

**Replaces:** Client-side `RootRoute` component with `useEffect` redirect and `TenantGuestLanding` with lazy-loaded components.

```typescript
// app/page.tsx
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTenantConfig } from '@/lib/tenants/config';
import { getSession } from '@/lib/auth';

export default async function RootPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || 'creditclaw';
  const tenant = getTenantConfig(tenantId);
  const session = await getSession();

  if (session?.user) {
    redirect(tenant.routes.authLanding);
  }

  const landingComponents: Record<
    string,
    () => Promise<{ default: React.ComponentType }>
  > = {
    '/creditclaw': () => import('@/components/landings/CreditclawLanding'),
  };

  const loader = landingComponents[tenant.routes.guestLanding];
  const LandingComponent = loader
    ? (await loader()).default
    : (await import('@/components/landings/CreditclawLanding')).default;

  return <LandingComponent />;
}
```

**Key differences:**
- Server-side redirect (HTTP 307) — authenticated users never download landing page code
- Dynamic `import()` in Server Components replaces `React.lazy` + `Suspense`
- No loading flash — the correct landing page is in the initial HTML response

### 2.6 Client Components via Synchronous `TenantProvider`

Client Components that need tenant data receive it through a `TenantProvider` context that is initialized synchronously from server-resolved data (no async fetching).

```typescript
// lib/tenants/tenant-context.tsx
'use client';

import { createContext, useContext } from 'react';
import type { TenantConfig } from './types';

const TenantContext = createContext<TenantConfig | null>(null);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantConfig;
  children: React.ReactNode;
}) {
  return (
    <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantConfig {
  const context = useContext(TenantContext);
  if (!context)
    throw new Error('useTenant must be used within TenantProvider');
  return context;
}
```

The root layout passes the serialized tenant config as a prop to `TenantProvider`. As a fallback, client components can also read the `tenant-id` cookie directly:

```typescript
function getTenantIdFromCookie(): string {
  if (typeof document === 'undefined') return 'creditclaw';
  const match = document.cookie.match(/tenant-id=([^;]+)/);
  return match?.[1] || 'creditclaw';
}
```

### 2.7 API Routes Read Tenant from `x-tenant-id` Header

API route handlers access the tenant ID from the header set by middleware:

```typescript
// app/api/example/route.ts
import { headers } from 'next/headers';
import { getTenantConfig } from '@/lib/tenants/config';

export async function GET() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || 'creditclaw';
  const tenant = getTenantConfig(tenantId);
  // ... use tenant for tenant-specific logic
}
```

---

## Section 3: Database Changes

### 3.1 Add `signupTenant` to `owners` Table

Add a write-once attribution field to the `owners` table in `shared/schema.ts`:

```typescript
export const owners = pgTable("owners", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  stripeCustomerId: text("stripe_customer_id"),
  flags: text("flags").array().notNull().default([]),
  signupTenant: text("signup_tenant"),
  onboardedAt: timestamp("onboarded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("owners_uid_idx").on(table.uid),
]);
```

**Behavior:**
- Set once during user registration with the tenant ID resolved from the requesting domain
- Never updated afterward, even if the user accesses from a different domain
- Nullable — existing users will have `null` until backfilled (if needed)
- Used for analytics and attribution, not data isolation

### 3.2 No Data Isolation

Tenants share the same database. All owners, wallets, cards, and transactions exist in one shared pool. The `signupTenant` field is for attribution only. There is no row-level filtering by tenant — any authenticated user can access the same data regardless of which domain they use.

---

## Section 4: File-by-File Impact Assessment

### New Files

| File | Purpose |
|---|---|
| `middleware.ts` | Tenant resolution from Host header; sets `x-tenant-id` header + `tenant-id` cookie |
| `lib/tenants/config.ts` | Server-side config loading via `fs.readFileSync` with in-memory cache |
| `lib/tenants/types.ts` | `TenantConfig` TypeScript interface |
| `lib/tenants/tenant-context.tsx` | Client-side `TenantProvider` context + `useTenant()` hook |
| `public/tenants/creditclaw/config.json` | CreditClaw default tenant configuration (extracted from hardcoded values) |

### Modified Files

| File | Changes |
|---|---|
| `app/layout.tsx` | Add `generateMetadata()` for tenant-aware meta tags; add inline `style` on `<html>` for tenant theme colors; wrap children with `TenantProvider`; conditionally inject tenant-specific GA script |
| `app/providers.tsx` | Accept and pass through `TenantProvider` if not handled in layout |
| `app/page.tsx` | Convert to async Server Component; add server-side auth check + redirect; dynamic import for tenant landing pages |
| `shared/schema.ts` | Add `signupTenant` column to `owners` table |
| `components/nav.tsx` | Read branding (logo, name) from `useTenant()` instead of hardcoded values |
| `lib/auth/auth-context.tsx` | Pass tenant ID when creating sessions so `signupTenant` is recorded on registration |

### Unchanged Files

| File | Why |
|---|---|
| `app/globals.css` | `:root` CSS variables remain as fallback defaults; tenant overrides are applied via inline styles on `<html>` |
| `drizzle.config.ts` | Database configuration is tenant-agnostic |

---

## Section 5: Mapping Table

| Original System Component | Next.js Equivalent | Complexity Change |
|---|---|---|
| Dual server/client tenant resolution | Single `middleware.ts` | **Simpler** — one resolution point instead of two |
| Client-side async config fetch + loading spinner | `fs.readFileSync` in server utility | **Simpler** — synchronous, no loading state |
| `TenantProvider` with async `detectCurrentTenant()` | Synchronous `TenantProvider` with server-provided props | **Simpler** — no async boot blocking |
| `updateMetaTags()` DOM manipulation | `generateMetadata()` in layout | **Simpler** — framework-native, SSR-correct |
| `updateFavicon()` DOM manipulation | `metadata.icons` in `generateMetadata()` | **Simpler** — declarative, no DOM access |
| `applyTenantTheme()` client-side CSS injection | Inline `style` on `<html>` in root layout | **Simpler** — no client-side JavaScript needed |
| `RootRoute` with `useEffect` redirect | Server-side `redirect()` in `app/page.tsx` | **Simpler** — HTTP 307, no flash |
| `React.lazy` + `Suspense` for landing pages | Dynamic `import()` in Server Components | **Simpler** — no Suspense boundaries needed |
| Custom SEO-SSR Express middleware with regex HTML injection | Normal Server Components with `generateMetadata()` | **Eliminated** — framework handles everything |
| Cookie-based `useTenantId()` client fallback | Same pattern, but only as a fallback | **Same** complexity |

---

## Section 6: CreditClaw as Default Tenant

### 6.1 Extract Hardcoded Values

The current codebase has CreditClaw branding hardcoded throughout `app/layout.tsx`, `app/globals.css`, `components/nav.tsx`, and `docs/brand.md`. These values get extracted into `public/tenants/creditclaw/config.json` as the default tenant configuration.

### 6.2 Full CreditClaw Config

```json
{
  "id": "creditclaw",
  "domains": ["creditclaw.com", "www.creditclaw.com"],

  "branding": {
    "name": "CreditClaw",
    "tagline": "Pocket money for your bots!",
    "logo": "/assets/images/logo-claw-chip.png",
    "logoEmoji": "🦞",
    "favicon": "/favicon.ico",
    "supportEmail": "support@creditclaw.com",
    "mascot": "/assets/images/hero-claw.png"
  },

  "meta": {
    "title": "CreditClaw - Give your bot a card",
    "description": "The fun, safe way to give your OpenClaw bot an allowance. Self-hosted cards, wallets, and spending guardrails for AI agents.",
    "ogImage": "/assets/og/og-image.png",
    "twitterImage": "/assets/og/og-twitter.png",
    "url": "https://creditclaw.com"
  },

  "theme": {
    "primaryColor": "10 85% 55%",
    "primaryForeground": "0 0% 100%",
    "accentColor": "260 90% 65%",
    "secondaryColor": "200 95% 60%"
  },

  "routes": {
    "guestLanding": "/creditclaw",
    "authLanding": "/overview"
  },

  "features": {},

  "tracking": {
    "gaId": "G-EGT42NKHLB"
  }
}
```

**Derivation notes:**
- `theme.primaryColor` `10 85% 55%` — from `globals.css:61` (`--primary`) and `brand.md` (Lobster Orange)
- `theme.accentColor` `260 90% 65%` — from `globals.css:70` (`--accent`) and `brand.md` (Fun Purple)
- `theme.secondaryColor` `200 95% 60%` — from `globals.css:64` (`--secondary`) and `brand.md` (Ocean Blue)
- `routes.guestLanding` `/creditclaw` — maps to the current `app/page.tsx` landing page components
- `routes.authLanding` `/overview` — from `components/nav.tsx:34` where authenticated users link to `/overview`
- `tracking.gaId` `G-EGT42NKHLB` — from `app/layout.tsx:81`
- `branding.logo` — from `components/nav.tsx:17` (`/assets/images/logo-claw-chip.png`)

---

## Section 7: How to Add a New Tenant

### Step-by-step

1. **Create the config directory:**
   ```
   public/tenants/{newTenantId}/
   ├── config.json
   └── images/
       ├── logo.png
       ├── og-image.png
       └── mascot.png
   ```

2. **Write `config.json`** following the `TenantConfig` schema in Section 1. The `domains` array must include all hostnames that should resolve to this tenant.

3. **Register the tenant ID** in `middleware.ts` — add the new ID to the `TENANT_IDS` array and ensure the `resolveTenantId` function can load its config. Also update `lib/tenants/config.ts` if it maintains a list of known tenant IDs.

4. **Create the guest landing page component** if using a new design. Register it in the `landingComponents` map in `app/page.tsx`. If reusing an existing landing page design, just set `routes.guestLanding` to the appropriate key.

5. **Configure DNS** to point the new tenant's domains to the same deployment. Add the domains to any reverse proxy or hosting platform configuration.

6. **Optional: Pricing** — Add a `pricing` section to the tenant's `config.json`. If omitted, the tenant inherits the default tenant's pricing. Add Stripe price ID mappings for any new plan IDs.

7. **Optional: Tracking** — Set `tracking.gaId` in the config to enable per-tenant Google Analytics.

---

## Section 8: Edge Cases and Considerations

### 8.1 Dev Environment

- **localhost** → resolves to the default tenant (`creditclaw`). No special handling needed.
- **`TENANT_OVERRIDE` env var** — support an optional environment variable that forces a specific tenant ID regardless of hostname, useful for local development and testing of non-default tenants:
  ```typescript
  // In middleware.ts
  const tenantId = process.env.TENANT_OVERRIDE || resolveTenantId(hostname);
  ```

### 8.2 Host Header Trust Behind Proxies

In production behind a reverse proxy (e.g., Cloudflare, Vercel, or a custom ingress), the `Host` header should reflect the original client request hostname. Verify that the hosting platform does not rewrite the `Host` header to an internal hostname. If it does, use `X-Forwarded-Host` as the primary source in middleware:

```typescript
const hostname =
  request.headers.get('x-forwarded-host') ||
  request.headers.get('host') ||
  '';
```

Most hosting platforms (Vercel, Replit Deployments) preserve the original `Host` header, so this is typically a non-issue but worth validating during deployment.

### 8.3 Replit Preview Domain

Replit preview URLs (e.g., `*.replit.dev`) will not match any tenant's domain list and will fall back to the default tenant (`creditclaw`). This is the correct behavior — the preview always shows CreditClaw branding.

### 8.4 Cookie Security

The `tenant-id` cookie:
- **`SameSite=Lax`** — prevents CSRF while allowing normal navigation
- **Not `HttpOnly`** — client-side JavaScript needs to read it for `useTenant()` fallback
- **Not `Secure`** — allows localhost development without HTTPS
- Contains no sensitive data (just a tenant ID string like `"creditclaw"`)

### 8.5 Static Generation Compatibility

Pages using `generateStaticParams()` cannot resolve tenants dynamically (no incoming request). For statically generated pages:
- Use the default tenant's config at build time
- Or skip static generation for tenant-aware pages and use dynamic rendering (`export const dynamic = 'force-dynamic'`)

### 8.6 Theme Color Coverage

Start minimal with four CSS variables per tenant:
- `--primary` (primary brand color)
- `--primary-foreground` (text on primary)
- `--accent` (accent/highlight color)
- `--secondary` (secondary brand color)

The remaining shadcn variables (`--background`, `--card`, `--muted`, `--border`, etc.) stay as global defaults in `globals.css`. Expand to per-tenant overrides only if a future tenant needs a fundamentally different light/dark scheme.

### 8.7 Google Analytics Per-Tenant

Each tenant can specify `tracking.gaId` in its config. The root layout conditionally injects the GA script based on the resolved tenant's tracking config:

```typescript
{tenant.tracking?.gaId && (
  <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${tenant.tracking.gaId}`} strategy="lazyOnload" />
    <Script id="google-analytics" strategy="lazyOnload">
      {`window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${tenant.tracking.gaId}');`}
    </Script>
  </>
)}
```

### 8.8 Stripe Integration

Two approaches, depending on business needs:

1. **Shared Stripe account** (simpler) — All tenants use CreditClaw's Stripe account. Different plan IDs map to different Stripe price IDs via server-side configuration. Revenue attribution is handled via metadata on Stripe sessions.

2. **Stripe Connect** (future) — Each tenant has their own Stripe Connected Account. The checkout session is created on behalf of the connected account. This is significantly more complex and should only be pursued if tenants need separate bank accounts / payout schedules.

Start with the shared account approach. Stripe Connect can be added later without changing the tenant resolution architecture.

---

## Section 9: Implementation Order

| Phase | Description | Dependencies |
|---|---|---|
| **1. Foundation** | Create `lib/tenants/types.ts`, `lib/tenants/config.ts`, and `public/tenants/creditclaw/config.json` | None |
| **2. Middleware** | Create `middleware.ts` with tenant resolution, `x-tenant-id` header, and `tenant-id` cookie | Phase 1 |
| **3. Layout Integration** | Update `app/layout.tsx` with `generateMetadata()`, inline theme styles, and conditional GA script | Phase 1, 2 |
| **4. Client Hook** | Create `lib/tenants/tenant-context.tsx` with `TenantProvider` and `useTenant()`. Wire into `app/providers.tsx` or layout | Phase 3 |
| **5. Database** | Add `signupTenant` column to `owners` table. Update registration flow to record tenant ID | Phase 2 |
| **6. Landing Page Routing** | Convert `app/page.tsx` to async Server Component with server-side auth redirect and dynamic landing page imports | Phase 2, 3 |
| **7. Component Updates** | Update `components/nav.tsx` and other components to use `useTenant()` for branding instead of hardcoded values | Phase 4 |
| **8. Second Tenant** | Create a new tenant config directory, landing page, and DNS configuration to validate the full system end-to-end | Phase 1–7 |

---

## Section 10: Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Middleware runs on every request, adding latency | **Low** | Config is cached in-memory after first read. Domain matching is O(tenants × domains) which is negligible for a small tenant count |
| `x-tenant-id` header could be spoofed by clients | **Low** | Middleware overwrites the header on every request. Client-sent values are ignored |
| Config cache never invalidates during process lifetime | **Medium** | Acceptable for production (deploys restart the process). For development, consider a cache-busting mechanism or disable caching in dev mode |
| Static generation incompatible with dynamic tenant resolution | **Medium** | Use `force-dynamic` for tenant-aware pages. Most CreditClaw pages are already dynamic (auth-gated) |
| Emoji favicon renders differently across operating systems | **Low** | Acceptable variation. Add a static PNG favicon fallback in the tenant config if exact rendering matters |
| CSS variable naming collision between tenant theme and globals.css | **Low** | Tenant themes only override a small, explicit set of variables. The inline `style` approach has clear specificity |
| Breaking existing CreditClaw functionality during migration | **High** | Phase 1 extracts current hardcoded values into config without changing behavior. Each subsequent phase can be tested independently. The existing `globals.css` `:root` block serves as a safety net |
| Cookie not available during SSR of first request | **Low** | Server Components use the `x-tenant-id` header (always available from middleware), not the cookie. Cookie is only a client-side fallback |

---

## Appendix: Key Files Reference

Current codebase files that inform this implementation plan:

| File | Relevance |
|---|---|
| `app/layout.tsx` | Current hardcoded metadata, font configuration, GA script (lines 1–95). Becomes the primary integration point for tenant-aware metadata and theming |
| `app/globals.css` (lines 51–93) | Current `:root` CSS custom properties including `--primary: 10 85% 55%`, `--secondary: 200 95% 60%`, `--accent: 260 90% 65%`. These become fallback defaults |
| `app/providers.tsx` | Current provider stack (QueryProvider → AuthProvider → TooltipProvider). TenantProvider will be added here or in the layout |
| `app/page.tsx` | Current static landing page with hardcoded components. Becomes async Server Component with tenant-driven routing |
| `shared/schema.ts` (lines 622–637) | Current `owners` table definition. `signupTenant` column to be added |
| `docs/brand.md` | CreditClaw brand identity — color palette, typography, design system. Source for default tenant config values |
| `components/nav.tsx` | Current navigation with hardcoded CreditClaw logo and branding. Will read from `useTenant()` |
| `lib/auth/auth-context.tsx` | Current Firebase auth flow. Registration paths need to pass tenant ID for `signupTenant` attribution |
