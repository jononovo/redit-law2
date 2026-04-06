---
name: How to Use This Folder
description: Navigation guide for project_knowledge/. Start here if you're new.
---

# How to Use This Folder

## Start here

1. **`vision.md`** — what we're building and why
2. **`architecture.md`** — system overview, all components, current status
3. **`tenants_vision/`** — per-tenant vision and context docs
4. **`internal_docs/` subfolder for your task** — dive into the relevant feature area
5. **`_how-to-write-docs-guide.md`** — only if you're writing or updating docs

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
| `architecture.md` | System components, data flow, status, future plans |
| `_how-to-write-docs-guide.md` | How to write and update docs in this folder |

## Folders

Ten modules — each maps to a section in `architecture.md` and a folder under `internal_docs/`.

| Folder | Module | Covers |
|--------|--------|--------|
| `internal_docs/01-agentic-shopping-score/` | 1. Agentic Shopping Score | Scan engine, scoring rubric, scan queue, maturity |
| `internal_docs/02-agent-shopping-skills/` | 2. Agent Shopping Skills | SKILL.md generation, skill.json, registry API, recommend API pipeline |
| `internal_docs/03-brands-index/` | 3. Brands Index | Brand catalog, taxonomy, catalog UI, brand claims |
| `internal_docs/04-payment-tools/` | 4. Payment Tools | Wallets, outbound payment rails (funding + spending) |
| `internal_docs/05-agent-interaction/` | 5. Agent Interaction | Webhooks, polling, approvals, guardrails, orders |
| `internal_docs/06-agent-plugins/` | 6. Agent Plugins | Per-platform plugins (OpenClaw, etc.), browser extension |
| `internal_docs/07-platform-management/` | 7. Platform Management | Auth, bot lifecycle, pairing, feature flags, admin |
| `internal_docs/08-multi-tenant/` | 8. Multi-tenant Structure | Tenant routing, onboarding, landing pages, theming |
| `internal_docs/09-agent-shops/` | 9. Agent Shops | Checkout pages, shops, seller profiles, procurement controls, inbound payments |
| `internal_docs/10-thought-leadership/` | 10. Thought Leadership | Standards (ASX rubric, SKILL.md spec, open brands index) |

Other folders:

| Folder | Purpose |
|--------|---------|
| `tenants_vision/` | Per-tenant vision and context — `creditclaw-vision.md`, `creditclaw-context.md`, `shopy-vision.md`, `shopy-context.md` (Tier 3 protected) |
| `currently_building/` | Active build cycle — scratch research, build notes, in-progress work |
| `future/` | Ideas, rough plans, strategy docs not yet tied to a build cycle |

`currently_building/` is the working bench. Gets cleaned out every 1-2 weeks — finished docs move to `internal_docs/`, stale ones get deleted.
