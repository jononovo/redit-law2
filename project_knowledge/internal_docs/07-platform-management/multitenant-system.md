---
name: Multitenant System
description: How one Next.js codebase serves CreditClaw, shopy.sh, and brands.sh. Read this before adding a new tenant, changing tenant routing, or modifying shared layout components.
---

# Multitenant System

One Next.js codebase serves three tenants — CreditClaw (`creditclaw.com`), shopy (`shopy.sh`), and brands (`brands.sh`) — from a single deployment. Tenant identity is resolved from the incoming hostname at the edge, then threaded through the entire request lifecycle — server metadata, client context, theming, and attribution.

There is **no data isolation**. All tenants share the same database. Tenant is attribution-only (the `signup_tenant` column on `owners`).

---

## Architecture

```
Request → middleware.ts (Edge)
            ↓ resolves hostname → tenantId (also checks ?tenant= param and cookie)
            ↓ sets tenant-id cookie
          app/layout.tsx (Server)
            ↓ reads tenant-id from cookies()
            ↓ loads config via getTenantConfig(tenantId)
            ↓ injects theme CSS vars via inline <script> (reads cookie, applies theme before paint)
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
| `lib/tenants/tenant-configs.ts` | Any | Static tenant config map — **must stay in sync with config.json files** |
| `lib/tenants/tenant-context.tsx` | Client | `TenantProvider` + `useTenant()` hook |
| `public/tenants/{id}/config.json` | Static | Per-tenant branding, meta, theme, routes, features, navigation, tracking |
| `app/layout.tsx` | Server | Reads tenant, generates metadata, injects theme vars |
| `app/page.tsx` | Server | Tenant router — dynamically loads landing component per tenant |
| `components/tenants/{id}/` | Client | Per-tenant components (landing, how-it-works, etc.) |
| `components/footer.tsx` | Client | Shared footer — reads columns/socials from `tenant.navigation.footer` |
| `components/nav.tsx` | Client | Shared nav — reads links from `tenant.navigation.header.links` |

---

## How to Add a New Tenant

### 1. Create `public/tenants/{tenant-id}/config.json`

Copy an existing config. Required sections: `id`, `domains`, `branding`, `meta`, `theme` (HSL values without `hsl()` wrapper), `routes`, `features`, `navigation`.

### 2. Update `lib/tenants/tenant-configs.ts`

This static config map must stay in sync with the `config.json` files.

### 3. Register the domain in `middleware.ts`

**This is the part people forget.** Edge runtime cannot read the filesystem. Domain → tenant mapping is hardcoded:

```typescript
const TENANT_DOMAINS: [string, string[]][] = [
  ["creditclaw", ["creditclaw.com"]],
  ["shopy", ["shopy.sh"]],
  ["brands", ["brands.sh"]],
];
```

If you skip this, the new tenant will silently resolve as `creditclaw` (the default).

### 4. Create tenant components in `components/tenants/{tenant-id}/`

At minimum: `landing.tsx`. Register in `app/page.tsx`. The key must match `routes.guestLanding` in config.json.

### 5. Add images to `public/tenants/{tenant-id}/images/`

### 6. Test locally with `?tenant=new-tenant` URL param

---

## Gotchas

### Three sources of truth for tenant config

1. `public/tenants/{id}/config.json` — full config read from disk
2. `lib/tenants/tenant-configs.ts` — static map for non-disk contexts
3. `middleware.ts` `TENANT_DOMAINS` — domain → tenant ID (Edge, no `fs`)

If any drift, the tenant resolves incorrectly or loads stale config. A build-time script that generates both from config.json would fix this.

### Theme CSS variables override the stylesheet

`app/layout.tsx` sets `--primary`, `--primary-foreground`, etc. as inline styles on `<html>`. Malformed HSL values make the entire color system break silently — buttons, links, backgrounds all go transparent.

### signupTenant is write-once

`owners.signup_tenant` is only written on first login (insert). Subsequent logins explicitly drop it from the update payload. If you need "last used tenant," add a separate column.

### TenantProvider serializes the full config to HTML

Keep configs lean — large data blobs in `config.json` inflate the HTML payload.

### Tenant router pages must register every tenant

Both `app/page.tsx` and `app/how-it-works/page.tsx` have hardcoded component maps. Forget to register a new tenant → falls back to CreditClaw.

---

## Expansion Plans

### Near-term
- **Build-time config generation** — eliminate three-way sync risk

### Medium-term
- **Tenant-aware email templates** — signup/notification emails with tenant branding

### Longer-term
- **Tenant admin panel** — UI for config management
- **Subdomain tenants** — support `tenant.creditclaw.com` pattern
