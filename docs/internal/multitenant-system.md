# Multitenant System — Internal Developer Guide

> Last updated: 2026-04-02 · Covers: Step 2 implementation

## Overview

One Next.js codebase serves multiple brands (CreditClaw, shopy.sh, future tenants) from a single deployment. Tenant identity is resolved from the incoming hostname at the edge, then threaded through the entire request lifecycle — server metadata, client context, theming, and attribution.

There is **no data isolation**. All tenants share the same database. Tenant is attribution-only (the `signup_tenant` column on `owners`).

---

## Architecture

```
Request → middleware.ts (Edge)
            ↓ resolves hostname → tenantId
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
| `lib/tenants/types.ts` | Any | `TenantConfig` interface |
| `lib/tenants/config.ts` | Node (server only) | `getTenantConfig()` — reads + caches `config.json` from disk |
| `lib/tenants/tenant-context.tsx` | Client | `TenantProvider` + `useTenant()` hook |
| `lib/tenants/get-request-tenant.ts` | Server (RSC/API) | `getRequestTenant()` — reads `x-tenant-id` from request headers |
| `public/tenants/{id}/config.json` | Static | Per-tenant branding, meta, theme, routes, features, tracking |
| `app/layout.tsx` | Server | Reads tenant, generates metadata, injects theme vars |
| `app/page.tsx` | Server | Dynamically loads the correct landing component per tenant |
| `components/landings/creditclaw-landing.tsx` | Client | Extracted CreditClaw landing page |

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

### 2. Register the domain in middleware

**This is the part people forget.** The middleware runs in Edge runtime, which cannot read the filesystem. So domain → tenant mapping is hardcoded in `middleware.ts`:

```typescript
const TENANT_DOMAINS: [string, string[]][] = [
  ["creditclaw", ["creditclaw.com"]],
  ["shopy", ["shopy.sh"]],
  ["new-tenant", ["newtenant.com"]],  // ← add here
];
```

If you skip this, the new tenant will silently resolve as `creditclaw` (the default).

### 3. Create the landing component

Add a file in `components/landings/{tenant-id}-landing.tsx`, then register it in `app/page.tsx`:

```typescript
const landingComponents: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  "/creditclaw": () => import("@/components/landings/creditclaw-landing"),
  "/new-tenant": () => import("@/components/landings/new-tenant-landing"),
};
```

The key must match `routes.guestLanding` in the tenant's `config.json`.

### 4. Add images

Place logos, OG images, and any tenant-specific assets in:

```
public/tenants/{tenant-id}/images/
```

Reference them in `config.json` as `/tenants/{tenant-id}/images/filename.png`.

### 5. Local testing

Set the `TENANT_OVERRIDE` environment variable:

```
TENANT_OVERRIDE=new-tenant
```

This bypasses hostname resolution entirely and forces that tenant ID for all requests.

---

## Fragile Areas & Gotchas

### Middleware domain map is a separate source of truth

The biggest fragility in the system. `config.json` has a `domains` array and `middleware.ts` has `TENANT_DOMAINS` — these must stay in sync manually. The middleware can't read config files because Edge runtime has no `fs` access.

**If they drift:** The middleware resolves the wrong tenant, but config.ts loads the "right" config. The result is a mismatch between what the middleware thinks the tenant is and what the server components load. Usually this means the new tenant silently falls back to CreditClaw.

**Possible future fix:** A build-time script that reads all `config.json` files and generates the `TENANT_DOMAINS` constant, imported by middleware.

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

### Nav and footer links are partially hardcoded

The nav and footer use `useTenant()` for branding (logo, name, tagline, auth routes), but the actual page links (Score Scanner, Shopping Skills, AXS, footer product/dashboard/resource links) are still CreditClaw-specific. If a tenant shouldn't show certain links, you'd currently need to conditionally render based on `tenant.id` or add a `nav` section to `TenantConfig`.

---

## Expansion Plans

### Near-term

- **Shopy landing page** — `components/landings/shopy-landing.tsx` needs to be built (currently falls back to CreditClaw landing)
- **Tenant-aware nav links** — add a `navigation` section to `TenantConfig` with arrays of nav items per tenant, so different tenants show different menus
- **Build-time domain map generation** — eliminate the middleware/config drift risk

### Medium-term

- **Tenant-scoped feature flags** — replace the bare `Record<string, boolean>` with a proper feature flag system that validates keys and supports runtime overrides
- **Tenant-specific pricing configs** — `TenantConfig` already has an optional `pricing` section in the type definition; wire it into the pricing page
- **Tenant-aware email templates** — signup/notification emails should use tenant branding

### Longer-term

- **Tenant admin panel** — UI for managing config without editing JSON files
- **Per-tenant analytics** — segment GA/Mixpanel by tenant ID
- **Subdomain tenants** — support `tenant.creditclaw.com` pattern in addition to custom domains
