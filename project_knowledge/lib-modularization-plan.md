---
name: lib/ and server/ Modularization Plan
description: Restructure lib/ and server/storage/ into domain modules that mirror internal_docs/ folder structure. Execute one module at a time, verify build after each.
---

# lib/ and server/ Modularization Plan

## Goal

Restructure the flat `lib/` and `server/storage/` layouts into domain-aligned module folders that mirror `project_knowledge/internal_docs/`.

## Module Map

### 1. `brand-engine/` — Modules 1 & 3

**lib/brand-engine/**
| Current Location | New Location |
|---|---|
| `lib/agentic-score/` | `lib/brand-engine/agentic-score/` |
| `lib/scan-queue/` | `lib/brand-engine/scan-queue/` |
| `lib/procurement-skills/` | `lib/brand-engine/procurement-skills/` |
| `lib/brand-claims/` | `lib/brand-engine/brand-claims/` |
| `lib/catalog/` | `lib/brand-engine/catalog/` |
| `lib/feedback/` | `lib/brand-engine/feedback/` |

**server/storage/brand-engine/**
| Current Location | New Location |
|---|---|
| `server/storage/brand-index.ts` | `server/storage/brand-engine/brand-index.ts` |
| `server/storage/brand-categories.ts` | `server/storage/brand-engine/brand-categories.ts` |
| `server/storage/brand-claims.ts` | `server/storage/brand-engine/brand-claims.ts` |
| `server/storage/brand-feedback.ts` | `server/storage/brand-engine/brand-feedback.ts` |
| `server/storage/brand-login-accounts.ts` | `server/storage/brand-engine/brand-login-accounts.ts` |

---

### 2. `product-index/` — Module 2

**lib/product-index/**
| Current Location | New Location |
|---|---|
| `lib/embeddings/` | `lib/product-index/embeddings/` |

**server/storage/product-index/**
Product listing storage methods (currently inline in other files or scripts) would move here.

---

### 3. `payment-rails/` — Module 4

**lib/payment-rails/**
| Current Location | New Location |
|---|---|
| `lib/rail1/` | `lib/payment-rails/rail1/` |
| `lib/rail2/` | `lib/payment-rails/rail2/` |
| `lib/rail5/` | `lib/payment-rails/rail5/` |
| `lib/x402/` | `lib/payment-rails/x402/` |
| `lib/crypto-onramp/` | `lib/payment-rails/crypto-onramp/` |
| `lib/card/` | `lib/payment-rails/card/` |
| `lib/stripe.ts` | `lib/payment-rails/stripe.ts` |
| `lib/card-brand.ts` | `lib/payment-rails/card-brand.ts` |

**server/storage/payment-rails/**
| Current Location | New Location |
|---|---|
| `server/storage/rail1.ts` | `server/storage/payment-rails/rail1.ts` |
| `server/storage/rail2.ts` | `server/storage/payment-rails/rail2.ts` |
| `server/storage/rail5.ts` | `server/storage/payment-rails/rail5.ts` |
| `server/storage/rail5-guardrails.ts` | `server/storage/payment-rails/rail5-guardrails.ts` |
| `server/storage/payment-links.ts` | `server/storage/payment-rails/payment-links.ts` |

**Note:** `lib/x402/` has both outbound (sign/pay) and inbound (receive/checkout) sides. Keeping it together here since outbound is the primary use; inbound is imported by agent-shops code.

---

### 4. `agent-interaction/` — Module 5

**lib/agent-interaction/**
| Current Location | New Location |
|---|---|
| `lib/approvals/` | `lib/agent-interaction/approvals/` |
| `lib/webhooks/` | `lib/agent-interaction/webhooks/` |
| `lib/webhook-tunnel/` | `lib/agent-interaction/webhook-tunnel/` |
| `lib/orders/` | `lib/agent-interaction/orders/` |
| `lib/guardrails/` | `lib/agent-interaction/guardrails/` |
| `lib/procurement-controls/` | `lib/agent-interaction/procurement-controls/` |
| `lib/procurement/` | `lib/agent-interaction/procurement/` |
| `lib/shipping/` | `lib/agent-interaction/shipping/` |

**server/storage/agent-interaction/**
| Current Location | New Location |
|---|---|
| `server/storage/approvals.ts` | `server/storage/agent-interaction/approvals.ts` |
| `server/storage/orders.ts` | `server/storage/agent-interaction/orders.ts` |
| `server/storage/webhooks.ts` | `server/storage/agent-interaction/webhooks.ts` |
| `server/storage/procurement-controls.ts` | `server/storage/agent-interaction/procurement-controls.ts` |
| `server/storage/master-guardrails.ts` | `server/storage/agent-interaction/master-guardrails.ts` |
| `server/storage/shipping-addresses.ts` | `server/storage/agent-interaction/shipping-addresses.ts` |

---

### 5. `platform-management/` — Module 7

**lib/platform-management/**
| Current Location | New Location |
|---|---|
| `lib/agent-management/` | `lib/platform-management/agent-management/` |
| `lib/auth/` | `lib/platform-management/auth/` |
| `lib/firebase/` | `lib/platform-management/firebase/` |
| `lib/feature-flags/` | `lib/platform-management/feature-flags/` |
| `lib/tenants/` | `lib/platform-management/tenants/` |
| `lib/auth-fetch.ts` | `lib/platform-management/auth-fetch.ts` |
| `lib/email.ts` | `lib/platform-management/email.ts` |
| `lib/notifications.ts` | `lib/platform-management/notifications.ts` |

**server/storage/platform-management/**
| Current Location | New Location |
|---|---|
| `server/storage/owners.ts` | `server/storage/platform-management/owners.ts` |
| `server/storage/bot-messages.ts` | `server/storage/platform-management/bot-messages.ts` |
| `server/storage/notifications.ts` | `server/storage/platform-management/notifications.ts` |

---

### 6. `agent-shops/` — Module 9

**lib/agent-shops/**
| Current Location | New Location |
|---|---|
| `lib/base-pay/` | `lib/agent-shops/base-pay/` |
| `lib/qr-pay/` | `lib/agent-shops/qr-pay/` |
| `lib/payments/` | `lib/agent-shops/payments/` |
| `lib/invoice-email.ts` | `lib/agent-shops/invoice-email.ts` |
| `lib/invoice-pdf.ts` | `lib/agent-shops/invoice-pdf.ts` |

**server/storage/agent-shops/**
| Current Location | New Location |
|---|---|
| `server/storage/sales.ts` | `server/storage/agent-shops/sales.ts` |
| `server/storage/seller-profiles.ts` | `server/storage/agent-shops/seller-profiles.ts` |
| `server/storage/invoices.ts` | `server/storage/agent-shops/invoices.ts` |
| `server/storage/base-pay.ts` | `server/storage/agent-shops/base-pay.ts` |
| `server/storage/qr-pay.ts` | `server/storage/agent-shops/qr-pay.ts` |

---

## Files That Stay at lib/ Root

| File | Reason |
|---|---|
| `lib/utils.ts` | Shared utility, no single module owns it |
| `lib/wizard-typography.ts` | UI utility, cross-cutting |

---

## Files Not Covered (no module 6 or 8 lib code)

- **Module 6 (Agent Plugins)** — lives under `app/` (plugin pages/routes), no `lib/` code
- **Module 8 (Multi-tenant)** — `lib/tenants/` moved into platform-management

---

## Execution Order

Each step = move files → update all imports → verify build passes.

| Step | Module | Est. Files Moved | Est. Import Rewrites |
|------|--------|-----------------|---------------------|
| 1 | `brand-engine/` | ~30 lib + 5 storage | ~80 imports |
| 2 | `product-index/` | ~1 lib | ~5 imports |
| 3 | `payment-rails/` | ~35 lib + 5 storage | ~70 imports |
| 4 | `agent-interaction/` | ~25 lib + 6 storage | ~60 imports |
| 5 | `platform-management/` | ~20 lib + 3 storage | ~50 imports |
| 6 | `agent-shops/` | ~15 lib + 5 storage | ~40 imports |
| 7 | Clean up `server/storage/index.ts` barrel | 1 file | all storage imports |

**Total:** ~130 files moved, ~300-400 import rewrites.

---

## server/storage/index.ts Barrel Update

The current `server/storage/index.ts` re-exports everything from flat files. After modularization, it would import from subdirectories:

```typescript
// server/storage/index.ts
export * from "./brand-engine/brand-index";
export * from "./brand-engine/brand-claims";
// ... etc
```

This barrel file means most app/ code won't need import path changes — only files that import directly from `server/storage/specific-file.ts` need updating.

---

## internal_docs/ Alignment

After completion, rename docs folders to match:

| Current | New |
|---|---|
| `01-brands-skills-system/` | `01-brand-engine/` |
| `04-payment-tools/` | `04-payment-rails/` |
| (keep rest as-is) | |
