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
