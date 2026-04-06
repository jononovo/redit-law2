---
name: How to Use This Folder
description: Navigation guide for project_knowledge/. Start here if you're new.
---

# How to Use This Folder

## Start here

1. **`vision.md`** — what we're building and why
2. **`architecture.md`** — system overview, all components, current status
3. **`internal_docs/` subfolder for your task** — dive into the relevant feature area
4. **`how-to-write-docs-guide.md`** — only if you're writing or updating docs

## Structure

- Root-level files are entry points (vision, architecture, guide)
- `currently_building/` is the active working bench
- `internal_docs/` contains permanent feature documentation organized by area
- Every file has YAML frontmatter with `name` and `description` — scan frontmatter to find the right doc
- Subfolders inside `internal_docs/` can contain a `research/` folder with dated analysis docs

## Root files

| File | Purpose |
|------|---------|
| `vision.md` | Overall product vision — all three tenants (Tier 3 protected) |
| `architecture.md` | System components, data flow, status |
| `creditclaw-vision.md` | CreditClaw-specific goal and direction (Tier 3 protected) |
| `creditclaw-context.md` | Ecosystem, competition, technology (OpenClaw, skills, x402) |
| `shopy-vision.md` | shopy.sh + brands.sh combined goal and direction (Tier 3 protected) |
| `shopy-context.md` | Standards landscape (ACP, UCP, Google Taxonomy, MCP) |
| `how-to-write-docs-guide.md` | How to write and update docs in this folder |

## Folders

Ten modules — each maps to a section in `architecture.md` and a folder under `internal_docs/`.

| Folder | Module | Covers |
|--------|--------|--------|
| `internal_docs/scanning/` | 1. Agentic Shopping Score | Scan engine, scoring rubric, scan queue, maturity |
| `internal_docs/skills/` | 2. Agent Shopping Skills | SKILL.md generation, skill.json, registry API |
| `internal_docs/catalog/` | 3. Brands Index | Brand catalog, recommend API, product search, categories |
| `internal_docs/payment/` | 4. Payment Tools | Wallets, payment rails |
| `internal_docs/agent-interaction/` | 5. Agent Interaction | Webhooks, polling, approvals, guardrails, orders |
| `internal_docs/agent-plugins/` | 6. Agent Plugins | Per-platform plugins (OpenClaw, etc.), browser extension |
| `internal_docs/platform/` | 7. Platform Management | Auth, bot lifecycle, pairing, feature flags, admin |
| `internal_docs/tenants/` | 8. Multi-tenant Structure | Tenant routing, onboarding, landing pages, theming |
| `internal_docs/agent-shops/` | 9. Agent Shops | Checkout pages, shops, seller profiles, procurement controls |
| `internal_docs/thought-leadership/` | 10. Thought Leadership | Standards (ASX rubric, SKILL.md spec, open brands index) |

Other folders:

| Folder | Purpose |
|--------|---------|
| `currently_building/` | Active build cycle — scratch research, build notes, in-progress work |
| `future/` | Ideas, rough plans, strategy docs not yet tied to a build cycle |

`currently_building/` is the working bench. Gets cleaned out every 1-2 weeks — finished docs move to `internal_docs/`, stale ones get deleted.
