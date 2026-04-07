---
name: How to Use This Folder
description: Navigation guide for project_knowledge/. Start here if you're new.
---

# How to Use This Folder

## Start here

1. **`vision.md`** — what we're building and why
2. **`architecture.md`** — system overview, all components, current status
3. **`tenants_vision/`** — one file per tenant (vision + identity + brand + design + key files)
4. **`internal_docs/` subfolder for your task** — dive into the relevant feature area
5. **`_how-to-write-docs-guide.md`** — only if you're writing or updating docs

## How to navigate a subfolder

1. **Read `_README.md`** if present — it gives context on the module and lists key code paths
2. **Scan frontmatter** of every `.md` file in the folder — each has `name` and `description` in YAML frontmatter, so you can find the right doc without reading full files
3. **Read the relevant doc** for the work you're doing
4. **Check `_research/`** if you need deeper context — contains dated analysis docs, decision reasoning, and industry research that informed the feature

Not every subfolder has a `_README.md` or `_research/` folder — but when they exist, use them.

**Writing or updating docs?** Read `_how-to-write-docs-guide.md` first — it covers frontmatter format, update tiers, file placement, and research doc conventions.

## Structure

- Root-level files are entry points (vision, architecture, guide)
- `currently_building/` is the active working bench
- `internal_docs/` contains permanent feature documentation organized by area
- `_completed/` subfolders hold archived plans that have been built

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
| `internal_docs/01-brands-skills-system/` | 1–3. Brands & Skills | Unified: scan engine, scoring, skill generation, brand catalog, taxonomy, recommend API, brand claims. Start with `_overview.md`. |
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
| `tenants_vision/` | One file per tenant — `creditclaw.md`, `shopy.md`, `brands.md` — each contains vision, identity, brand, design language, and key files (Tier 3 protected) |
| `currently_building/` | Active build cycle — scratch research, build notes, in-progress work |
| `future/` | Ideas, rough plans, strategy docs not yet tied to a build cycle |

`currently_building/` is the working bench. Gets cleaned out every 1-2 weeks — finished docs move to `internal_docs/`, stale ones get deleted.
