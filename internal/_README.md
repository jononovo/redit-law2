---
name: How to Use This Folder
description: Navigation guide for internal/. Start here if you're new.
---

# How to Use This Folder

## Start here

1. **`vision.md`** — what we're building and why
2. **`architecture.md`** — system overview, all components, current status
3. **`internal_docs/` subfolder for your task** — dive into the relevant feature area
4. **`guide.md`** — only if you're writing or updating docs

## Structure

- Root-level files are entry points (vision, architecture, guide)
- `currently_building/` is the active working bench
- `internal_docs/` contains permanent feature documentation organized by area
- Every file has YAML frontmatter with `name` and `description` — scan frontmatter to find the right doc
- Subfolders inside `internal_docs/` can contain a `research/` folder with dated analysis docs

## Root files

| File | Purpose |
|------|---------|
| `vision.md` | Product purpose and direction (Tier 3 protected) |
| `architecture.md` | System components, data flow, status |
| `guide.md` | How to write and update docs in this folder |

## Folders

| Folder | Covers |
|--------|--------|
| `currently_building/` | Active build cycle — scratch research, build notes, in-progress work |
| `internal_docs/tenants/` | Tenant identity, purpose, audience, branding |
| `internal_docs/scanning/` | ASX scanner, scan pipeline, maturity, scan history |
| `internal_docs/catalog/` | Brand catalog, taxonomy, recommend API, product search |
| `internal_docs/platform/` | Multitenant infrastructure, routing, auth, onboarding |

`currently_building/` is the working bench. Gets cleaned out every 1-2 weeks — finished docs move to `internal_docs/`, stale ones get deleted.
