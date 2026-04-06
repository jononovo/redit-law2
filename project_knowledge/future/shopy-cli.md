---
name: Shopy CLI
description: npm package for installing merchant shopping skills. Advertised on brands.sh but not yet built.
date: 2026-04-06
---

# Shopy CLI (`npx shopy add <brand>`)

## Status

**Not started.** The brands.sh landing page advertises this command but the npm package does not exist.

## What It Does

CLI tool that lets agent developers install SKILL.md files from the brands.sh registry into their agent's skill directory.

## Phase 2 — Core Package (not started)

- npm package name: `shopy` (needs to be claimed)
- Core flow: `npx shopy add nike` → hits registry API → downloads skill.json + SKILL.md → writes to `./skills/nike/`
- Config management and local manifests
- This is the minimum needed to make the brands.sh landing page CTA truthful

## Phase 3 — Extended Commands (not started)

- `npx shopy update` — pull latest skill versions
- `npx shopy init` / `npx shopy remove` — workspace setup and cleanup
- GitHub Actions CI integration

## Master Skill (PROCUREMENT.md)

A meta-document (stored as a special `brand_index` row with slug `_creditclaw_index` or served from a dedicated endpoint) that teaches agents how to use the search/registry API — available parameters, filter combinations, maturity levels, brand relationships (searching "Nike" returns Nike HQ + retailers carrying Nike), example queries, and how to read the SKILL.md once a brand is selected.

Ships alongside the CLI since it only makes sense once agents have a programmatic way to query the index.

**Source:** `brand-index-implementation-plan-v3.md` (Phase 4)

## Dependencies

- Registry API Phase 1 ✅ (4 endpoints live)
- No other blockers — can start now
