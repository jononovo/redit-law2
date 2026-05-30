---
name: Agent Plugins
description: Module 6 — Per-platform integrations for agent ecosystems. Each agent platform gets its own plugin with platform-specific APIs, auth, and packaging.
---

# Agent Plugins

Docs for Module 6. Each agent platform (OpenClaw, future Claude/GPT integrations, browser extensions) gets its own plugin directory and documentation.

## Current plugins

| Plugin | Location | Purpose |
|--------|----------|---------|
| OpenClaw | `public/Plugins/OpenClaw/` | Plugin for OpenClaw bots — card fill, API integration, field detection |
| CreditClaw Wallet v4 (Claude/Cowork) | `plugins/creditclaw-wallet-v4/` | Skills + hooks for Claude. Drives an external secure-fill extension via postMessage. **Does not work end-to-end** — the extension it depends on was never delivered. See the plan doc below. |

## Plans

- [`secure-fill-extension-plan.md`](secure-fill-extension-plan.md) — full build brief for the missing Chrome extension (the context-safe data injector that closes the v4 gap). Self-contained onboarding for a fresh agent: what CreditClaw is, how the rails work, why credential isolation matters, how OpenClaw solves it, why v4 doesn't, and the design + Chrome-review constraints.

## Key code (OpenClaw)

- `public/Plugins/OpenClaw/src/api.ts` — API integration
- `public/Plugins/OpenClaw/src/index.ts` — plugin entry point
- `public/Plugins/OpenClaw/src/fill-card.ts` — card field filling
- `public/Plugins/OpenClaw/src/decrypt.ts` — decryption utilities
- `public/Plugins/OpenClaw/openclaw.plugin.json` — plugin manifest

## What belongs here

- Per-plugin architecture docs
- Plugin API specifications
- Platform-specific auth patterns
- Browser extension documentation
- Research on new agent platforms to support

## Related modules

- **Module 5 (Agent Interaction)** provides the webhook/polling layer plugins connect through
- **Module 4 (Payment Tools)** provides the financial rails plugins expose to agents
