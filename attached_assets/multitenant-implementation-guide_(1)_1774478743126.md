# Multitenant System: Implementation Guide for External Platforms

## Overview

This document provides a complete technical specification of the domain-driven multitenant system used in this codebase. A single deployment serves multiple distinct product brands (tenants), where each tenant gets its own landing page, post-login experience, logo, favicon, meta/OG tags, theme colors, feature flags, and pricing — all determined at runtime by the requesting domain.

The most complex element is the **tenant resolution and hydration pipeline** — the chain that starts with a raw HTTP hostname and ends with a fully themed, branded, SEO-correct page rendered in the browser. This document focuses on that pipeline in detail.

---

## Architecture Summary

```
                    ┌─────────────────────┐
                    │   Incoming Request   │
                    │  Host: sendclaw.com  │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼────────┐  ┌───▼────┐  ┌────────▼────────┐
     │  Server-Side     │  │  SPA   │  │  Static Assets  │
     │  Tenant Resolve  │  │ Boot   │  │  /tenants/{id}/ │
     │  (Express)       │  │        │  │  config.json    │
     └────────┬────────┘  └───┬────┘  │  images/*       │
              │               │        └─────────────────┘
              │               │
     ┌────────▼────────┐  ┌───▼──────────────────┐
     │  SEO-SSR        │  │  Client-Side Tenant   │
     │  Meta Injection │  │  Resolution + Hydrate │
     │  (crawlers)     │  │  (React Context)      │
     └─────────────────┘  └──────────────────────┘
```

---

## 1. Tenant Configuration: The Single Source of Truth

Each tenant is defined by a JSON file at:

```
client/public/tenants/{tenantId}/config.json
```

### Full Schema (TypeScript Interface)

```typescript
interface TenantConfig {
  id: string;              // Unique tenant identifier, e.g. "5ducks", "sendclaw"
  domains: string[];       // All hostnames this tenant responds to

  branding: {
    name: string;          // Display name, e.g. "5Ducks"
    tagline: string;       // Tagline for marketing
    logo: string;          // Path to logo image, e.g. "/tenants/5ducks/images/logo.png"
    logoEmoji: string;     // Single emoji used as dynamic favicon, e.g. "🐥"
    favicon: string;       // Path to static favicon (not currently used; emoji is preferred)
    supportEmail: string;  // e.g. "support@fiveducks.ai"
    mascot: string;        // Path to mascot image
  };

  meta: {
    title: string;         // <title> tag and og:title
    description: string;   // <meta description> and og:description
    ogImage: string;       // Absolute URL to OG image (must be full https:// URL)
    twitterImage: string;  // Absolute URL to Twitter card image
    url: string;           // Canonical base URL, e.g. "https://fiveducks.ai"
  };

  theme: {
    primaryColor: string;        // HSL values (no hsl() wrapper), e.g. "45 93% 47%"
    primaryForeground: string;   // HSL values for text on primary
    accentColor: string;         // HSL values for accent
  };

  routes: {
    guestLanding: string;  // Path key for unauthenticated users at "/", e.g. "/landing-simple3"
    authLanding: string;   // Redirect target after login, e.g. "/app" or "/dashboard"
  };

  features: {
    showSendClaw: boolean;
    showProspecting: boolean;
    showCredits: boolean;
  };

  pricing?: {              // Optional — if omitted, falls back to default tenant's pricing
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

### Example: Two Tenants

| Property | 5Ducks | SendClaw |
|---|---|---|
| `id` | `"5ducks"` | `"sendclaw"` |
| `domains` | `["fiveducks.ai", "www.fiveducks.ai", "app.fiveducks.ai"]` | `["sendclaw.com", "www.sendclaw.com"]` |
| `branding.logoEmoji` | `"🐥"` | `"🦞"` |
| `routes.guestLanding` | `"/landing-simple3"` | `"/lobster"` |
| `routes.authLanding` | `"/app"` | `"/dashboard"` |
| `features.showProspecting` | `true` | `false` |

### Asset Directory Structure

```
client/public/tenants/
├── 5ducks/
│   ├── config.json
│   ├── skill.md
│   └── images/
│       ├── logo.png
│       ├── favicon.ico
│       ├── og-image.webp
│       └── duckling-mascot.png
└── sendclaw/
    ├── config.json
    ├── skill.md
    ├── skill.json
    ├── heartbeat.md
    └── images/
        ├── og-image.png
        ├── twitter-image.png
        ├── favicon.png
        ├── sendclaw-mascot.png
        ├── linkedin-image.png
        ├── facebook-image.png
        └── whatsapp-image.png
```

---

## 2. Server-Side Tenant Resolution

**File:** `server/tenants/index.ts`

The server resolves hostname → tenant ID using this logic:

```typescript
const TENANT_IDS = ['5ducks', 'sendclaw'] as const;
const DEFAULT_TENANT = '5ducks';

function getTenantFromHost(hostname: string): string {
  // 1. Load all config.json files (cached after first load)
  const configs = loadTenantConfigs();

  // 2. Normalize: lowercase + strip "www."
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, '');

  // 3. Match against each tenant's domains array
  for (const tenant of configs) {
    for (const domain of tenant.domains) {
      const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
      // Exact match OR subdomain match (e.g. "app.fiveducks.ai" matches "fiveducks.ai")
      if (normalizedHost === normalizedDomain ||
          normalizedHost.endsWith('.' + normalizedDomain)) {
        return tenant.id;
      }
    }
  }

  // 4. Default fallback
  return DEFAULT_TENANT;
}
```

### Key design decisions:
- **Subdomain support**: `app.fiveducks.ai` matches tenant `5ducks` because of the `.endsWith()` check
- **www normalization**: Both `www.sendclaw.com` and `sendclaw.com` resolve identically
- **Lazy-loaded, cached**: Configs are read from disk once and cached in memory for the process lifetime
- **Safe default**: Unknown domains fall back to the default tenant rather than erroring

### Where server-side resolution is used:
1. **Tenant-specific document routes** (`server/tenants/routes.ts`): Routes like `/skill.md`, `/heartbeat.md`, `/skill.json` resolve the tenant from the host and serve the corresponding file from that tenant's directory. This means `GET https://sendclaw.com/skill.md` serves a different file than `GET https://fiveducks.ai/skill.md`.
2. **Pricing API**: `getTenantPricingFromHost(hostname)` returns tenant-specific pricing plans, with fallback to the default tenant's pricing if the matched tenant has none.
3. **SEO-SSR middleware** (see Section 5).

---

## 3. Client-Side Tenant Resolution and Hydration (The Complex Part)

This is the most intricate piece. The client must independently resolve the tenant, then apply branding, theming, metadata, favicon, and routing — all before the user sees anything.

### 3.1 Resolution Flow

**File:** `client/src/lib/tenants/index.ts`

```typescript
async function detectCurrentTenant(): Promise<TenantConfig> {
  // 1. Fetch ALL tenant config.json files via HTTP (cached after first call)
  const tenants = await loadAllTenants();

  // 2. Match window.location.hostname against domains arrays
  return getTenantByDomain(window.location.hostname, tenants);
}
```

The client fetches configs from `/tenants/{id}/config.json` (served as static files from the public directory). This is an async operation that happens on app boot.

**Critical detail:** The client fetches ALL tenant configs, not just the current one. This allows for potential tenant switching without a page reload and ensures the domain matching logic has the complete picture.

### 3.2 Hydration via React Context

**File:** `client/src/lib/tenant-context.tsx`

The `TenantProvider` wraps the entire application and is the orchestrator for all tenant-dependent side effects:

```
App Boot
  └─ TenantProvider mounts
       └─ detectCurrentTenant() called (async)
            ├─ Fetch /tenants/5ducks/config.json
            ├─ Fetch /tenants/sendclaw/config.json
            └─ Match hostname → TenantConfig
                 │
                 ├─ applyTenantTheme()    → sets CSS custom properties on :root
                 ├─ updateFavicon()       → generates SVG favicon from emoji
                 ├─ updateMetaTags()      → injects/updates <meta> tags in <head>
                 ├─ document.title = ...  → sets page title
                 │
                 └─ Renders children with tenant context available
```

**While loading:** A centered spinner is shown. No content is rendered until tenant resolution completes. This prevents any flash of wrong-tenant content.

### 3.3 Theme Injection

```typescript
function applyTenantTheme(tenant: TenantConfig) {
  const root = document.documentElement;
  root.style.setProperty('--primary', tenant.theme.primaryColor);
  root.style.setProperty('--primary-foreground', tenant.theme.primaryForeground);
  root.style.setProperty('--accent', tenant.theme.accentColor);
}
```

Theme values are HSL strings without the `hsl()` wrapper (e.g. `"45 93% 47%"`). They're injected as CSS custom properties on `<html>`, which the shadcn/Tailwind design system consumes via `hsl(var(--primary))` throughout all components.

### 3.4 Dynamic Favicon from Emoji

```typescript
function updateFavicon(tenant: TenantConfig) {
  const emoji = tenant.branding.logoEmoji;
  const faviconUrl = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${emoji}</text></svg>`;

  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = faviconUrl;
}
```

Instead of serving a static `.ico` or `.png`, the favicon is generated as an inline SVG data URI containing the tenant's emoji. This is zero-cost (no network request) and infinitely flexible.

### 3.5 Meta Tag Injection

The `updateMetaTags()` function creates or updates these tags in `<head>`:

| Tag | Source |
|---|---|
| `<meta name="description">` | `tenant.meta.description` |
| `<meta property="og:title">` | `tenant.meta.title` |
| `<meta property="og:description">` | `tenant.meta.description` |
| `<meta property="og:image">` | `tenant.meta.ogImage` |
| `<meta property="og:url">` | `tenant.meta.url` |
| `<meta property="og:site_name">` | `tenant.branding.name` |
| `<meta name="twitter:title">` | `tenant.meta.title` |
| `<meta name="twitter:description">` | `tenant.meta.description` |
| `<meta name="twitter:image">` | `tenant.meta.twitterImage` |

For each tag, the function follows a find-or-create pattern: query the DOM for an existing tag, create it if missing, then set the content.

---

## 4. Tenant-Driven Routing (Guest Landing & Auth Landing)

**File:** `client/src/App.tsx`

### The Root Route Decision Tree

When a user visits `/`:

```
GET /
  └─ RootRoute component
       ├─ Is user authenticated?
       │    YES → redirect to tenant.routes.authLanding (e.g. "/app" or "/dashboard")
       │    NO  → render TenantGuestLanding
       │
       └─ TenantGuestLanding
            └─ Look up tenant.routes.guestLanding in component map:
                 "/lobster"         → SendclawLanding (lazy)
                 "/landing-simple3" → LandingSimple3 (lazy)
                 "/landing-simple2" → LandingSimple2 (lazy)
                 "/landing-simple"  → LandingSimple (lazy)
                 "/landing2"        → Landing2 (lazy)
                 "/react-landing"   → Landing (lazy)
```

### Implementation

```typescript
function RootRoute() {
  const { user, isLoading } = useAuth();
  const { tenant } = useTenant();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation(tenant.routes.authLanding);  // e.g. "/app" or "/dashboard"
    }
  }, [user, isLoading, setLocation, tenant.routes.authLanding]);

  if (isLoading) return null;
  if (user) return null;

  return <TenantGuestLanding />;
}

function TenantGuestLanding() {
  const { tenant } = useTenant();

  const landingComponents: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
    '/lobster': SendclawLanding,
    '/landing-simple3': LandingSimple3,
    // ... other landing pages
  };

  const LandingComponent = landingComponents[tenant.routes.guestLanding] || SendclawLanding;

  return (
    <Suspense fallback={null}>
      <LandingComponent />
    </Suspense>
  );
}
```

### Key pattern:
- Landing pages are **lazy-loaded** (`React.lazy`) and wrapped in `<Suspense>` — only the current tenant's landing page code is downloaded
- The `guestLanding` config value acts as a **key into a component registry**, not a literal URL route
- The `authLanding` value IS a literal route path used for `setLocation()` redirects
- Multiple places in the app reference `tenant.routes.authLanding` for post-login redirects: the auth page, pricing page, subscription success page, etc.

---

## 5. SEO-SSR: Server-Side Meta Injection for Crawlers

**File:** `server/features/seo-ssr/index.ts`

For entity pages (`/company/:slug/:id` and `/p/:slug/:id`), the server intercepts the request before the SPA loads and injects SEO-optimized HTML directly into the template.

### How it works:

1. Express middleware catches requests matching `/company/:slug/:id` or `/p/:slug/:id`
2. Fetches the entity (company or contact) from the database
3. Reads the base `client/index.html` template
4. Uses regex to strip existing meta tags from the template
5. Injects entity-specific `<title>`, `<meta>`, OpenGraph tags, JSON-LD structured data, and a hidden HTML block for crawler indexing
6. Serves the modified HTML with a 30-day in-memory cache

```typescript
function injectSEO(html: string, seo: SEOData): string {
  // Strip existing tags via regex
  html = html.replace(/<title>[^<]*<\/title>/, "");
  html = html.replace(/<meta\s+name="description"[^>]*>/i, "");
  // ... (strips all og:*, twitter:*, canonical tags)

  // Inject new tags before </head>
  html = html.replace("</head>", `  ${headTags}\n  </head>`);

  // Inject hidden content after <div id="root"> for crawler indexing
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"></div>\n${seo.serverHtml}`
  );

  return html;
}
```

**Note:** The SEO-SSR system currently hardcodes `5ducks` as the brand in meta tags and canonical URLs. This is a known limitation — it does not yet resolve the tenant from the request host for entity pages.

---

## 6. Database: Tenant Tracking

The `users` table includes a `signup_tenant` column:

```sql
signup_tenant TEXT  -- e.g. 'sendclaw', '5ducks'
```

This records which tenant/domain the user originally signed up through. It is set at registration time and never changes, even if the user later accesses the app from a different domain.

---

## 7. Component-Level Tenant Consumption

Any component can access the current tenant via the `useTenant()` hook:

```typescript
const { tenant } = useTenant();

// Conditional rendering based on feature flags
{tenant.features.showProspecting && <ProspectingPanel />}

// Display tenant branding
<img src={tenant.branding.mascot} alt={tenant.branding.name} />
<span>{tenant.branding.name}</span>

// Use tenant-specific support email
<a href={`mailto:${tenant.branding.supportEmail}`}>Contact Support</a>
```

The `Logo` component specifically reads `tenant.branding.name` and `tenant.branding.logoEmoji` to render the site identity consistently across all pages.

---

## 8. How to Add a New Tenant

Step-by-step:

1. **Create the config directory:**
   ```
   client/public/tenants/{newTenantId}/
   ├── config.json
   └── images/
       ├── logo.png
       ├── og-image.png
       └── (other brand assets)
   ```

2. **Write `config.json`** following the schema in Section 1. The `domains` array must include all hostnames that should resolve to this tenant.

3. **Register the tenant ID** in both:
   - `server/tenants/index.ts`: Add to the `TENANT_IDS` array
   - `client/src/lib/tenants/index.ts`: Add to the `TENANT_IDS` array

4. **Create the guest landing page component** if using a new one, and register it in the `landingComponents` map in `App.tsx`.

5. **Configure DNS** to point the new domains to the same deployment.

6. **Optional:** Add tenant-specific routes in `server/tenants/routes.ts` if the tenant needs domain-aware document endpoints.

---

## 9. Complexity Notes and Edge Cases

### Why this is the hardest part to get right:

1. **Dual resolution**: Both server and client must independently resolve the same tenant from the same hostname. They use mirrored but separate implementations. If they disagree, the user sees a flash of wrong content or incorrect SEO tags.

2. **Async boot blocking**: The entire React app is blocked behind tenant resolution. The `TenantProvider` shows a spinner until config.json files are fetched and parsed. This is intentional — rendering anything before tenant resolution would cause a flash of default-tenant branding.

3. **Meta tag lifecycle**: Tags are injected client-side after the SPA boots. This means social media crawlers that don't execute JavaScript will NOT see tenant-specific OG tags from the client-side injection. The SEO-SSR middleware partially addresses this for entity pages, but generic pages (landing, pricing) rely on the client-side injection, which crawlers may miss.

4. **HSL color format**: Theme colors use raw HSL values (`"45 93% 47%"`), not CSS `hsl()` calls. This is because shadcn/Tailwind's design system expects the raw values inside its own `hsl()` wrappers in CSS. Getting the format wrong silently breaks all themed colors.

5. **Emoji favicon rendering**: The SVG-data-URI favicon approach works in all modern browsers but may render differently across operating systems (different emoji fonts). There is no image-based fallback currently active.

6. **`guestLanding` is a component key, not a URL**: The value in `routes.guestLanding` (e.g. `"/lobster"`) is used to look up a React component in a static map, NOT as an actual URL that the user navigates to. The user always sees `/` in their browser — the landing page component is swapped behind the scenes.

7. **Config caching**: Server-side configs are cached for the process lifetime (no invalidation). Client-side configs are cached per page load. Changes to `config.json` require a server restart (server) or hard refresh (client).

---

## 10. Recommendations for Next.js Implementation

If porting this multitenant system to a Next.js (App Router) application, the framework's built-in primitives eliminate most of the complexity documented in Section 9. Here's how each piece maps across.

### 10.1 Tenant Resolution: Use Middleware

Replace the dual server/client resolution with a single `middleware.ts` at the project root. This runs on the edge before any page renders.

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTenantByDomain } from '@/lib/tenants';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const tenantId = getTenantByDomain(hostname);

  // Forward tenant ID to Server Components via a request header
  const response = NextResponse.next();
  response.headers.set('x-tenant-id', tenantId);

  // Also set a cookie so client components can access it without a prop drill
  response.cookies.set('tenant-id', tenantId, { path: '/' });

  return response;
}
```

This eliminates the **dual resolution problem** entirely — one place resolves, everything downstream consumes.

### 10.2 Tenant Config Loading: Server-Side Only

Keep the same `config.json` files per tenant, but load them on the server using `fs.readFileSync` in a utility function. Since Server Components can read the filesystem directly, there's no need to fetch configs over HTTP.

```typescript
// lib/tenants/config.ts
import fs from 'fs';
import path from 'path';

const cache = new Map<string, TenantConfig>();

export function getTenantConfig(tenantId: string): TenantConfig {
  if (cache.has(tenantId)) return cache.get(tenantId)!;

  const configPath = path.join(process.cwd(), 'public', 'tenants', tenantId, 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  cache.set(tenantId, config);
  return config;
}
```

This eliminates the **async boot blocking** — no spinner, no client-side fetch. The config is available immediately during server rendering.

### 10.3 Metadata: Use `generateMetadata`

Replace the client-side `updateMetaTags()` DOM manipulation with Next.js's native metadata API. This runs on the server and bakes tags into the HTML response.

```typescript
// app/layout.tsx (or any page)
import { headers } from 'next/headers';
import { getTenantConfig } from '@/lib/tenants/config';

export async function generateMetadata() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '5ducks';
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

This eliminates the **meta tag lifecycle problem** — crawlers, social media link previews, and browsers all see correct tenant-specific tags on first response, with zero JavaScript execution required.

### 10.4 Theming: Apply in the Root Layout

Inject CSS custom properties in the root layout's Server Component, so the page arrives pre-themed.

```typescript
// app/layout.tsx
import { headers } from 'next/headers';
import { getTenantConfig } from '@/lib/tenants/config';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '5ducks';
  const tenant = getTenantConfig(tenantId);

  return (
    <html
      lang="en"
      style={{
        '--primary': tenant.theme.primaryColor,
        '--primary-foreground': tenant.theme.primaryForeground,
        '--accent': tenant.theme.accentColor,
      } as React.CSSProperties}
    >
      <body>{children}</body>
    </html>
  );
}
```

No flash of un-themed content. The CSS variables are in the HTML the server sends.

### 10.5 Guest vs Auth Landing: Use the Root Page Server Component

```typescript
// app/page.tsx
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTenantConfig } from '@/lib/tenants/config';
import { getSession } from '@/lib/auth';

export default async function RootPage() {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '5ducks';
  const tenant = getTenantConfig(tenantId);
  const session = await getSession();

  if (session?.user) {
    redirect(tenant.routes.authLanding);
  }

  // Dynamically import the correct landing page
  const landingComponents: Record<string, () => Promise<{ default: React.ComponentType }>> = {
    '/lobster': () => import('@/components/landings/SendclawLanding'),
    '/landing-simple3': () => import('@/components/landings/LandingSimple3'),
  };

  const loader = landingComponents[tenant.routes.guestLanding];
  const LandingComponent = loader
    ? (await loader()).default
    : (await import('@/components/landings/SendclawLanding')).default;

  return <LandingComponent />;
}
```

The redirect happens server-side (HTTP 307) — authenticated users never download the landing page code. Unauthenticated users get the correct landing page in the initial response.

### 10.6 SEO-SSR for Entity Pages: Just Use Server Components

The custom Express middleware that reads HTML templates and does regex replacement becomes unnecessary. Entity pages are just normal Server Components:

```typescript
// app/company/[slug]/[id]/page.tsx
import { getTenantConfig } from '@/lib/tenants/config';
import { getCompany } from '@/lib/db';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const company = await getCompany(parseInt(params.id));
  if (!company) return {};

  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id') || '5ducks';
  const tenant = getTenantConfig(tenantId);

  return {
    title: `${company.name} - Company Profile | ${tenant.branding.name}`,
    description: `${company.name} company profile on ${tenant.branding.name}`,
    openGraph: {
      images: [tenant.meta.ogImage],
    },
  };
}

export default async function CompanyPage({ params }: { params: { id: string } }) {
  const company = await getCompany(parseInt(params.id));
  if (!company) notFound();

  return <CompanyProfile company={company} />;
}
```

No regex HTML manipulation. No in-memory cache. No hidden divs for crawlers. The framework handles everything.

### 10.7 Client Components: Access Tenant via Cookie or Context

For interactive client components that need tenant data, read the cookie set by middleware:

```typescript
// lib/tenants/use-tenant.ts (client hook)
'use client';
import { useMemo } from 'react';

export function useTenantId(): string {
  return useMemo(() => {
    if (typeof document === 'undefined') return '5ducks';
    const match = document.cookie.match(/tenant-id=([^;]+)/);
    return match?.[1] || '5ducks';
  }, []);
}
```

Or pass tenant config as a serializable prop from a Server Component parent to a Client Component child — avoiding the need for a context provider entirely.

### 10.8 What Stays the Same

- **`config.json` schema and file structure** — identical, works as-is
- **Asset directory layout** (`public/tenants/{id}/images/`) — identical
- **Domain matching logic** (hostname normalization, www stripping, subdomain support) — identical algorithm
- **HSL color format** for shadcn/Tailwind — identical
- **Database `signup_tenant` column** — identical
- **Feature flag pattern** (`tenant.features.showX`) — identical, just consumed differently

### 10.9 What Gets Eliminated

| React+Vite+Express Complexity | Next.js Equivalent |
|---|---|
| Dual server/client tenant resolution | Single middleware resolution |
| Client-side async config fetching + spinner | Server-side `fs.readFileSync`, zero loading state |
| `TenantProvider` React context | Props from Server Components or cookie |
| `updateMetaTags()` DOM manipulation | `generateMetadata()` — native, server-rendered |
| `updateFavicon()` DOM manipulation | `metadata.icons` in `generateMetadata()` |
| Custom SEO-SSR Express middleware with regex | Normal Server Components with `generateMetadata()` |
| `applyTenantTheme()` client-side CSS injection | Inline `style` on `<html>` in root layout |
| `React.lazy` + `Suspense` for landing pages | Dynamic `import()` in Server Components |
