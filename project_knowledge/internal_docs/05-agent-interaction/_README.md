---
name: Agent Interaction
description: Module 5 — Webhooks, polling, approvals, guardrails, orders. How external agents communicate with CreditClaw and how humans control agent behavior.
---

# Agent Interaction

Docs for Module 5. Covers the communication layer between CreditClaw and external agents, plus the human↔agent control loop.

## Key code

- `lib/webhooks/delivery.ts`, `lib/webhooks/index.ts` — outbound event notifications
- `lib/webhook-tunnel/cloudflare.ts`, `provisioning.ts` — Cloudflare tunnel provisioning
- `lib/guardrails/` — per-transaction limits, category blocking, approval modes
- `lib/approvals/` — human-in-the-loop approval for agent purchases
- `lib/orders/` — order lifecycle and tracking
- `lib/feedback/aggregate.ts` — agent feedback aggregation
- `app/api/v1/webhooks/` — webhook API routes
- `app/api/v1/approvals/` — approval API routes
- `app/api/v1/orders/` — order API routes
- `app/api/v1/master-guardrails/` — guardrail configuration API
- `app/api/v1/invoices/` — invoice API routes
- `app/api/v1/feedback/` — feedback API routes

## What belongs here

- Webhook delivery patterns and retry logic
- Polling structure documentation
- Approval flow documentation
- Guardrail configuration and evaluation
- Order lifecycle states
- Research on agent communication patterns and best practices

## Related modules

- **Module 4 (Payment Tools)** provides the rails that orders settle against
- **Module 6 (Agent Plugins)** uses webhooks/polling to communicate with specific agent platforms
- **Module 7 (Platform Management)** manages the bot entities that interact through this layer
