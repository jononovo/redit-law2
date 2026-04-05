# Multitenant System — Internal Developer Guide

> Last updated: 2026-04-04

## Overview

One Next.js codebase serves three tenants — CreditClaw (`creditclaw.com`), shopy (`shopy.sh`), and brands (`brands.sh`) — from a single deployment. Tenant identity is resolved from the incoming hostname at the edge, then threaded through the entire request lifecycle — server metadata, client context, theming, and attribution.

There is **no data isolation**. All tenants share the same database. Tenant is attribution-only (the `signup_tenant` column on `owners`).

---

## Architecture

```
Request → middleware.ts (Edge)
            ↓ resolves hostname → tenantId (also checks ?tenant= param and cookie)
            ↓ sets x-tenant-id header + tenant-id cookie
          app/layout.tsx (Server)
            ↓ reads x-tenant-id from headers
            ↓ loads config.json from public/tenants/{id}/
            ↓ injects theme CSS vars on <html>
            ↓ wraps children in <TenantProvider>
          Client components
            ↓ useTenant() → full TenantConfig object
```

### Key files

| File | Runtime | Purpose |
|------|---------|---------|
| `middleware.ts` | Edge | Hostname → tenant ID resolution, header/cookie injection |
| `lib/tenants/types.ts` | Any | `TenantConfig` interface (includes `navigation` for header/footer config) |
| `lib/tenants/config.ts` | Node (server only) | `getTenantConfig()` — reads + caches `config.json` from disk |
| `lib/tenants/tenant-configs.ts` | Any | Static tenant config map — **must stay in sync with config.json files** |
| `lib/tenants/tenant-context.tsx` | Client | `TenantProvider` + `useTenant()` hook |
| `lib/tenants/tenant-hydrator.tsx` | Client | Hydrates tenant config on the client from layout props |
| `lib/tenants/get-request-tenant.ts` | Server (RSC/API) | `getRequestTenant()` — reads `x-tenant-id` from request headers |
| `public/tenants/{id}/config.json` | Static | Per-tenant branding, meta, theme, routes, features, navigation, tracking |
| `app/layout.tsx` | Server | Reads tenant, generates metadata, injects theme vars |
| `app/page.tsx` | Server | Tenant router — dynamically loads landing component per tenant |
| `app/how-it-works/page.tsx` | Server | Tenant router — dynamically loads how-it-works component per tenant |
| `components/tenants/{id}/` | Client | Per-tenant components (landing, how-it-works, etc.) |
| `components/footer.tsx` | Client | Shared footer — reads columns/socials from `tenant.navigation.footer` in config.json |
| `components/nav.tsx` | Client | Shared nav — reads links from `tenant.navigation.header.links`, uses `useTenant()` for branding |

### Per-tenant component folders

```
components/tenants/
  creditclaw/
    landing.tsx          ← CreditClaw homepage
    how-it-works.tsx     ← CreditClaw "how it works" page
  shopy/
    landing.tsx          ← shopy.sh homepage
    how-it-works.tsx     ← shopy.sh "how it works" page
  brands/
    landing.tsx          ← brands.sh homepage (skill registry, dual-purpose input, sector filter bar)
    how-it-works.tsx     ← brands.sh "how it works" page
```

### Config-driven footer

The footer reads its link columns and social links from `tenant.navigation.footer` in `config.json`. Each tenant defines its own footer structure:

```json
{
  "navigation": {
    "footer": {
      "columns": [
        {
          "title": "Product",
          "links": [
            { "label": "Score Scanner", "href": "/agentic-shopping-score" },
            { "label": "Skill Catalog", "href": "/skills" }
          ]
        }
      ],
      "socials": [
        { "label": "Twitter", "href": "https://x.com/shopysh" }
      ]
    }
  }
}
```

If no `navigation` block exists, the footer falls back to a minimal default with Product links only.

---

## How to Add a New Tenant

### 1. Create the config file

```
public/tenants/{tenant-id}/config.json
```

Copy `public/tenants/creditclaw/config.json` as a starting point and update all fields. Required sections:

- `id` — must match the folder name
- `domains` — array of production hostnames (without `www.` — the resolver strips it)
- `branding` — name, tagline, logo path, emoji, favicon, support email
- `meta` — page title, description, OG/Twitter image paths, canonical URL
- `theme` — HSL color values (without the `hsl()` wrapper, e.g. `"10 85% 55%"`)
- `routes.guestLanding` — key used by `app/page.tsx` to load the right landing component
- `routes.authLanding` — where authenticated users redirect to (usually `/overview`)
- `features` — feature flag object (keys are checked by components)
- `navigation.header` — variant (`"light"` or `"dark"`), links array for nav menu items
- `navigation.footer` — columns and social links for the footer

### 2. Update `lib/tenants/tenant-configs.ts`

This static config map must stay in sync with the `config.json` files. It's used in contexts where reading from disk isn't appropriate. Add the new tenant's config object here.

### 3. Register the domain in middleware

**This is the part people forget.** The middleware runs in Edge runtime, which cannot read the filesystem. So domain → tenant mapping is hardcoded in `middleware.ts`:

```typescript
const TENANT_DOMAINS: [string, string[]][] = [
  ["creditclaw", ["creditclaw.com"]],
  ["shopy", ["shopy.sh"]],
  ["brands", ["brands.sh"]],
  ["new-tenant", ["newtenant.com"]],  // ← add here
];
```

If you skip this, the new tenant will silently resolve as `creditclaw` (the default).

### 4. Create tenant components

Add a folder in `components/tenants/{tenant-id}/` with at minimum a `landing.tsx`. Then register it in `app/page.tsx`:

```typescript
const landingComponents: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  "/creditclaw": () => import("@/components/tenants/creditclaw/landing"),
  "/shopy": () => import("@/components/tenants/shopy/landing"),
  "/brands": () => import("@/components/tenants/brands/landing"),
  "/new-tenant": () => import("@/components/tenants/new-tenant/landing"),
};
```

The key must match `routes.guestLanding` in the tenant's `config.json`.

For the how-it-works page, add `how-it-works.tsx` in the same folder and register it in `app/how-it-works/page.tsx`:

```typescript
const howItWorksComponents: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  creditclaw: () => import("@/components/tenants/creditclaw/how-it-works"),
  "new-tenant": () => import("@/components/tenants/new-tenant/how-it-works"),
};
```

### 5. Add images

Place logos, OG images, and any tenant-specific assets in:

```
public/tenants/{tenant-id}/images/
```

Reference them in `config.json` as `/tenants/{tenant-id}/images/filename.png`.

### 6. Local testing

Add `?tenant=new-tenant` to any URL in the browser. This sets a cookie so subsequent page loads stay on that tenant.

Or set the `TENANT_OVERRIDE` environment variable (takes precedence over hostname resolution):

```
TENANT_OVERRIDE=new-tenant
```

---

## Fragile Areas & Gotchas

### Three sources of truth for tenant config

Tenant configuration lives in three places that must stay in sync manually:

1. **`public/tenants/{id}/config.json`** — full config read from disk at runtime by `getTenantConfig()`
2. **`lib/tenants/tenant-configs.ts`** — static config map used where disk reads aren't appropriate
3. **`middleware.ts` `TENANT_DOMAINS`** — domain → tenant ID mapping (Edge runtime, no `fs` access)

If any of these drift, the tenant resolves incorrectly or loads stale config. The middleware is the most critical — if it maps a hostname to the wrong tenant ID, the server loads the wrong config entirely.

**Possible future fix:** A build-time script that reads all `config.json` files and generates both `TENANT_DOMAINS` and `tenant-configs.ts`.

### Theme CSS variables override the stylesheet

`app/layout.tsx` sets `--primary`, `--primary-foreground`, `--accent`, and `--secondary` as inline styles on the `<html>` element. These override the values in `globals.css`. If a tenant config has malformed HSL values, the entire color system breaks with no visible error — buttons, links, backgrounds all go transparent or fall back to browser defaults.

**What to check:** Every theme value must be a valid HSL triplet without the `hsl()` wrapper. Example: `"10 85% 55%"` not `"hsl(10, 85%, 55%)"`.

### signupTenant is write-once (owners and bots)

Both `owners.signup_tenant` and `bots.signup_tenant` record which tenant the entity was created through. For owners, it's only written on the first login (insert) — subsequent logins explicitly drop `signupTenant` from the update payload in `server/storage/owners.ts`. For bots, it's set at registration time in `app/api/v1/bots/register/route.ts` (both pairing code and standard registration paths).

**If you need to track "last used tenant":** Add a separate column. Do not change the `signupTenant` behavior.

### TenantProvider serialization boundary

`TenantProvider` receives the full `TenantConfig` object as a prop from the server component (`layout.tsx`). This means the entire config is serialized into the HTML payload. Keep configs lean — don't put large data blobs in `config.json`.

### Feature flags are unchecked strings

`features` in `config.json` is `Record<string, boolean>`. There's no validation that a feature key actually exists or is checked anywhere. Typos fail silently (the feature just stays off). There's no central registry of valid feature flag keys.

**Possible future fix:** A TypeScript enum or const map of valid feature keys, with the config loader validating against it.

### Tenant router pages must register every tenant

Both `app/page.tsx` and `app/how-it-works/page.tsx` have hardcoded component maps. When adding a new tenant, you must update both files. If you forget, the new tenant will fall back to the CreditClaw version.

---

## Expansion Plans

### Near-term

- **Build-time config generation** — eliminate the three-way sync risk between config.json, tenant-configs.ts, and middleware.ts

### Medium-term

- **Tenant-scoped feature flags** — replace the bare `Record<string, boolean>` with a proper feature flag system that validates keys and supports runtime overrides
- **Tenant-specific pricing configs** — `TenantConfig` already has an optional `pricing` section in the type definition; wire it into the pricing page
- **Tenant-aware email templates** — signup/notification emails should use tenant branding

### Longer-term

- **Tenant admin panel** — UI for managing config without editing JSON files
- **Per-tenant analytics** — segment GA/Mixpanel by tenant ID
- **Subdomain tenants** — support `tenant.creditclaw.com` pattern in addition to custom domains
