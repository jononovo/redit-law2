---
name: How to Use This Folder
description: Navigation guide for docs/internal/. Start here if you're new.
---

# How to Use This Folder

## Start here

1. **`vision.md`** — what we're building and why
2. **`architecture.md`** — system overview, all components, current status
3. **Subfolder for your task** — dive into the relevant feature area
4. **`guide.md`** — only if you're writing or updating docs

## Structure

Every subfolder covers a feature area. Every file has YAML frontmatter with `name` and `description` — scan the frontmatter to find the right doc.

Subfolders can contain a `research/` folder with dated analysis docs — industry research, technology comparisons, and decision reasoning that led to the current architecture. These are point-in-time snapshots, not living docs.

## Root files

| File | Purpose |
|------|---------|
| `vision.md` | Product purpose and direction (Tier 3 protected) |
| `architecture.md` | System components, data flow, status, folder map |
| `guide.md` | How to write and update docs in this folder |

## Subfolders

Each subfolder has operational docs (how things work today) and optionally a `research/` subfolder (why we built it that way).

| Folder | Covers |
|--------|--------|
| `currently_building/` | Active build cycle — scratch research, build notes, in-progress work |
| `tenants/` | Tenant identity, purpose, audience, branding |
| `scanning/` | ASX scanner, scan pipeline, maturity, scan history |
| `catalog/` | Brand catalog, taxonomy, recommend API, product search |
| `platform/` | Multitenant infrastructure, routing, auth, onboarding |

`currently_building/` is the working bench. It gets cleaned out every 1-2 weeks — finished docs move to permanent folders, stale ones get deleted.
