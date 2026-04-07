---
name: Shopy CLI
description: npm package for installing merchant shopping skills. Advertised on brands.sh but not yet built.
date: 2026-04-06
---

# Shopy CLI (`npx shopy add <brand>`)

## Status

**Not started.** The brands.sh landing page advertises this command but the npm package does not exist. Registry API Phase 1 is complete (4 endpoints live) — no other blockers.

## What It Does

CLI tool that lets agent developers install SKILL.md files from the brands.sh registry into their agent's skill directory.

```bash
npx shopy add amazon
npx shopy add --sector office
npx shopy search "office supplies"
npx shopy update
npx shopy list
```

## Phase 2 — Core Package (not started)

- npm package name: `shopy` (needs to be claimed on npm). Fallback: `@shopy/cli`
- Core flow: `npx shopy add nike` → hits registry API → downloads skill.json + SKILL.md → writes to `{skillDir}/nike.md`
- Config file: `.shopy/config.json` — stores `skillDir` (default `./skills`), `registry` URL, `format` (markdown/json)
- Local manifest: `.shopy/manifest.json` — tracks installed skills with version + checksum + installedAt
- Commands: `add`, `search`, `list`
- This is the minimum needed to make the brands.sh landing page CTA truthful

### `add` Command Flow

1. Parse args: `shopy add amazon walmart --sector office`
2. If `--sector`, query `GET /registry/skills?sector=office` to resolve slugs
3. For each slug, check local manifest — if already installed and same version, skip (unless `--force`)
4. Fetch `GET /registry/skills/[slug]/raw` for each skill
5. Write to `{skillDir}/{slug}.md`
6. Update `.shopy/manifest.json`
7. Print summary: "Installed 3 skills (2 new, 1 updated)"

### `search` Command Flow

1. `shopy search "office supplies"` → `GET /registry/skills?search=office+supplies`
2. Terminal table: name, domain, sector, ASX score, AXS rating
3. Show install command for each result

### `update` Command Flow

1. Read local `.shopy/manifest.json`
2. Fetch `GET /registry/manifest` (single request, all versions)
3. Compare checksums — find stale skills
4. Fetch and overwrite each stale skill
5. Print summary: "Updated 2 skills, 5 up to date"

## Phase 3 — Extended Commands (not started)

- `npx shopy update` — pull latest skill versions (manifest diffing)
- `npx shopy init` — config file creation
- `npx shopy remove` — remove installed skills
- GitHub Actions CI for automated publishing on tags

## Package Structure

```
shopy/
├── src/
│   ├── index.ts              Entry point (commander setup)
│   ├── commands/              add, search, update, list, remove, init
│   ├── registry/              HTTP client + response types
│   ├── local/                 config.json, manifest.json, file writes
│   └── ui/                    spinner (ora), table formatting, colors (chalk)
├── dist/                      Compiled output
└── package.json
```

Dependencies: `commander`, `chalk`, `ora`. Uses native `fetch` (Node 18+). Built with `tsup`.

## Registry API Endpoints (Phase 1 ✅)

4 endpoints live at `app/api/v1/registry/`:
- `GET /api/v1/registry` — list all skills (paginated, filterable)
- `GET /api/v1/registry/search` — ILIKE search across name/domain/slug/sector
- `GET /api/v1/registry/{vendor}/skill-json` — serialized skill.json
- `GET /api/v1/registry/{vendor}/skill-md` — raw SKILL.md as text/markdown

### Still Needed for CLI

- `GET /registry/manifest` — version manifest for `shopy update` (slug → version + checksum)
- `GET /registry/sectors` — sector listing with skill counts
- Rate limiting: 60 req/min search, 120 req/min downloads (IP-based)

## npm Publishing

- **Recommended:** Separate repo (`creditclaw/shopy` or `shopy-sh/cli`) — signals open standard, cleaner than monorepo subfolder
- Versioning: semver, independent of registry API version. CLI sends `User-Agent: shopy/1.x.x`
- First publish: manual `npm publish`. Subsequent: GitHub Actions on tag push

## Master Skill (PROCUREMENT.md)

A meta-document (stored as a special `brand_index` row with slug `_creditclaw_index` or served from a dedicated endpoint) that teaches agents how to use the search/registry API — available parameters, filter combinations, maturity levels, brand relationships (searching "Nike" returns Nike HQ + retailers carrying Nike), example queries, and how to read the SKILL.md once a brand is selected.

Ships alongside the CLI since it only makes sense once agents have a programmatic way to query the index.

**Source:** `brand-index-implementation-plan-v3.md` (Phase 4)
