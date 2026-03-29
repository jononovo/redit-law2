# shopy CLI — Technical Plan

## Overview

`shopy` is an npm package that lets developers install commerce SKILL.md files into their agent's skill directory from the command line. It's a thin client that talks to the shopy.sh registry API, discovers skills, and writes them locally.

```bash
npx shopy add amazon
npx shopy add --sector office
npx shopy search "office supplies"
npx shopy update
npx shopy list
```

This plan covers the three most complex pieces: (1) the public registry API, (2) the npm package itself, and (3) npm publishing and versioning.

---

## Complexity 1: Public Registry API

### Why this is complex

The CLI needs a public API that doesn't require authentication for basic operations (search, download). Today, skill data is served through two separate API surfaces — the bot API (`/api/v1/bot/skills/`) which requires Bearer auth, and the internal API (`/api/internal/brands/`) which is meant for the dashboard UI. Neither is suitable as a public CLI registry endpoint.

The registry API must:
- Be unauthenticated for `add`, `search`, and `list` operations
- Return SKILL.md content as raw markdown (not wrapped in JSON)
- Support search, sector filtering, and multi-vendor batch downloads
- Include version metadata so `shopy update` knows what's changed
- Be rate-limited to prevent abuse
- Serve from the shopy.sh domain (resolved by the multitenant middleware)

### What to build

**New API route group:** `app/api/v1/registry/`

```
app/api/v1/registry/
├── skills/route.ts          GET — search/list skills (paginated)
├── skills/[slug]/route.ts   GET — single skill metadata + download
├── skills/[slug]/raw/route.ts  GET — raw SKILL.md content (text/markdown)
├── sectors/route.ts         GET — list sectors with skill counts
└── manifest/route.ts        GET — version manifest for `shopy update`
```

**`GET /api/v1/registry/skills`** — Search and list
- Query params: `search`, `sector`, `tier`, `limit`, `offset`, `sort`
- Response: JSON array of skill summaries (slug, name, domain, sector, version, ASX score, AXS rating, updated_at)
- No auth required. Rate limited: 60 req/min per IP.
- Source: `storage.searchBrands()` with `lite: true`

**`GET /api/v1/registry/skills/[slug]`** — Skill detail
- Response: JSON with full metadata (all frontmatter fields, version, checksum, download URL)
- No auth required.
- Source: `storage.getBrandBySlug()`

**`GET /api/v1/registry/skills/[slug]/raw`** — Raw SKILL.md
- Response: `text/markdown` content type, raw `skill_md` from `brand_index`
- Headers: `X-Skill-Version`, `X-Skill-Checksum` for cache validation
- No auth required.
- Source: `brand_index.skill_md` + `brand_index.active_version_id`

**`GET /api/v1/registry/manifest`** — Version manifest for updates
- Response: JSON object mapping `slug → { version, checksum, updated_at }`
- The CLI compares this against its local `.shopy/manifest.json` to find stale skills.
- No auth required. Cached: 5 min TTL.
- Source: lightweight query on `brand_index` (slug, active_version_id, updated_at) + join to `skill_versions` for checksum

**`GET /api/v1/registry/sectors`** — Sector listing
- Response: JSON array of `{ id, label, count }` for sectors with at least one published brand
- No auth required.
- Source: `storage.getAllBrandFacets()` (already cached with 10-min TTL)

### Existing infrastructure to leverage

- `storage.searchBrands({ lite: true })` already returns catalog card data efficiently
- `storage.getBrandBySlug()` already returns full brand data including `skill_md`
- `skill_versions` table already has checksums and version tracking
- `skill_exports` table already tracks what's been synced to external destinations — the registry is just another destination
- The existing bot API at `/api/v1/bot/skills/[vendor]` already serves `text/markdown` — the registry `/raw` endpoint follows the same pattern but without auth

### Rate limiting approach

Use Next.js middleware or a lightweight in-memory rate limiter (IP-based, 60 req/min for search, 120 req/min for downloads). No API key required for read operations. If abuse becomes an issue, add optional API key auth for higher limits later.

---

## Complexity 2: The npm Package

### Why this is complex

The CLI must handle: config file management, local file tracking (which skills are installed, what version), conflict resolution (skill already exists locally, newer version available), multi-skill batch operations, and a good terminal UX (progress indicators, colored output, error messages). It also needs to work both as `npx shopy` (zero-install, always latest) and `npm install -g shopy` (persistent install).

### Package structure

```
shopy/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              Entry point (shebang + commander setup)
│   ├── commands/
│   │   ├── add.ts            Install one or more skills
│   │   ├── search.ts         Search the registry
│   │   ├── update.ts         Update installed skills
│   │   ├── list.ts           List installed skills
│   │   ├── remove.ts         Remove installed skills
│   │   └── init.ts           Initialize .shopy config
│   ├── registry/
│   │   ├── client.ts         HTTP client for registry API
│   │   └── types.ts          Response types
│   ├── local/
│   │   ├── config.ts         Read/write .shopy/config.json
│   │   ├── manifest.ts       Read/write .shopy/manifest.json (installed skills)
│   │   └── files.ts          Write SKILL.md files to disk
│   └── ui/
│       ├── spinner.ts        Terminal spinner (ora)
│       ├── table.ts          Table formatting for search results
│       └── colors.ts         Chalk color helpers
├── dist/                     Compiled output (gitignored, published to npm)
└── README.md
```

### Key design decisions

**Config file: `.shopy/config.json`**
Created by `shopy init` or auto-created on first `shopy add`. Stores:
```json
{
  "skillDir": "./skills",
  "registry": "https://shopy.sh/api/v1/registry",
  "format": "markdown"
}
```
- `skillDir` — where SKILL.md files are written. Default: `./skills` (relative to project root). Can be customized for different agent frameworks (e.g., `.cursor/skills/`, `.claude/skills/`).
- `registry` — API base URL. Defaults to shopy.sh. Could be overridden for self-hosted registries in the future.
- `format` — `markdown` (SKILL.md) or `json` (skill.json). Default: `markdown`.

**Local manifest: `.shopy/manifest.json`**
Tracks installed skills so `update` and `list` know what's local:
```json
{
  "amazon": { "version": "3", "checksum": "abc123", "installedAt": "2026-03-29T..." },
  "walmart": { "version": "1", "checksum": "def456", "installedAt": "2026-03-28T..." }
}
```

**The `add` command flow:**
1. Parse args: `shopy add amazon walmart --sector office`
2. If `--sector` is provided, query `GET /registry/skills?sector=office` to resolve slugs
3. For each slug, check local manifest — if already installed and same version, skip (unless `--force`)
4. Fetch `GET /registry/skills/[slug]/raw` for each skill
5. Write to `{skillDir}/{slug}.md`
6. Update `.shopy/manifest.json` with version + checksum
7. Print summary: "Installed 3 skills (2 new, 1 updated)"

**The `update` command flow:**
1. Read local `.shopy/manifest.json`
2. Fetch `GET /registry/manifest` (single request, all versions)
3. Compare checksums — find skills where remote checksum ≠ local checksum
4. For each stale skill, fetch and overwrite
5. Print summary: "Updated 2 skills, 5 up to date"

**The `search` command flow:**
1. `shopy search "office supplies"` → `GET /registry/skills?search=office+supplies`
2. Format results as a terminal table: name, domain, sector, ASX score, AXS rating
3. Show install command for each: `npx shopy add staples`

### Dependencies (minimal)

```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "chalk": "^5.0.0",
    "ora": "^8.0.0"
  }
}
```

No heavy dependencies. Uses native `fetch` (Node 18+). No `node-fetch` needed. `fs/promises` for file operations. `commander` for CLI parsing. `chalk` for colors. `ora` for spinners.

### Build tooling

- TypeScript compiled with `tsup` (fast, zero-config bundler for CLI tools)
- Single output file at `dist/index.js` with shebang `#!/usr/bin/env node`
- Target: Node 18+ (native fetch, ES modules)

---

## Complexity 3: npm Publishing & Versioning

### Why this is complex

Publishing to npm requires: choosing the right package name (and securing it before someone else does), setting up automated publishing via CI, managing semantic versioning, handling the npm org/scope decision, and coordinating CLI versions with registry API versions (backward compatibility).

### Package name

**Preferred:** `shopy`
**Fallback:** `@shopy/cli` (scoped under a shopy npm org)

The unscoped name `shopy` is cleaner for `npx shopy add amazon`. The scoped name `@shopy/cli` is more professional and avoids name squatting, but requires `npx @shopy/cli add amazon` which is longer.

**Action required:** Check npm name availability and register immediately. Run `npm view shopy` — if it 404s, it's available. If taken, register the `@shopy` npm org and use `@shopy/cli`.

### npm account and org setup

1. Create an npm account for CreditClaw (or use existing one)
2. If using scoped package: create `@shopy` org on npmjs.com
3. Generate an automation token (granular, publish-only) for CI
4. Store the token as a secret in the CI environment (GitHub Actions or similar)

### Versioning strategy

- CLI follows **semver**: breaking CLI interface changes = major, new commands = minor, bug fixes = patch
- CLI version is independent of the registry API version
- The CLI sends its version in a `User-Agent` header (`shopy/1.2.0`) so the registry can track adoption and deprecate old clients if needed
- The registry API is versioned via URL path (`/api/v1/registry/`) — if a breaking change is needed, deploy `/api/v2/registry/` and have the CLI check for upgrade notices

### Publishing workflow

**Manual first publish:**
```bash
cd shopy/
npm login
npm publish          # or npm publish --access public (for scoped)
```

**Automated subsequent publishes (GitHub Actions):**
```yaml
name: Publish shopy CLI
on:
  push:
    tags: ['v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Tag a release (`git tag v1.0.0 && git push --tags`) → CI builds and publishes to npm.

### Where the CLI code lives

**Option A: Separate repo** (recommended)
- New GitHub repo: `creditclaw/shopy` (or `shopy-sh/cli`)
- Clean separation — the CLI is an independent open-source project
- Its own `package.json`, its own CI, its own release cycle
- Reinforces the "open standard" positioning of shopy.sh

**Option B: Monorepo subfolder**
- Lives at `packages/shopy-cli/` inside the CreditClaw monorepo
- Simpler to develop (same repo as the API), harder to publish (needs workspace-aware publishing)
- Less clean as an open-source artifact

**Recommendation:** Option A. The CLI should be its own repo. It's a small, focused package (~500 lines of code). Having it in a separate public repo signals that shopy.sh is a real open standard, not just a feature of CreditClaw. The registry API lives in the CreditClaw codebase (it's just another API route). The CLI is a standalone consumer of that API.

---

## Build Sequence

This work fits into the existing roadmap after the multitenant system (Step 2) and shopy.sh pages (Step 3). The registry API is part of the main codebase; the CLI is a separate project.

### Phase 1: Registry API (part of main codebase, during Step 3)

Build the `/api/v1/registry/` route group. This can be built alongside or immediately after the shopy.sh pages since it's just new API routes in the existing Next.js app.

Files to create:
- `app/api/v1/registry/skills/route.ts`
- `app/api/v1/registry/skills/[slug]/route.ts`
- `app/api/v1/registry/skills/[slug]/raw/route.ts`
- `app/api/v1/registry/sectors/route.ts`
- `app/api/v1/registry/manifest/route.ts`

Depends on: existing `brand_index` table, `skill_versions` table, `storage.searchBrands()`, `storage.getBrandBySlug()`

### Phase 2: npm package scaffolding (separate repo, Step 3.5)

Set up the `shopy` npm package repo, implement the core commands (`add`, `search`, `list`), and do the first manual publish.

1. Secure the npm package name (`shopy` or `@shopy/cli`)
2. Create the repo, scaffold the package structure
3. Implement `add`, `search`, `list` commands against the registry API
4. Manual `npm publish` to claim the name with a working v0.1.0
5. Test: `npx shopy search "office"` and `npx shopy add amazon`

### Phase 3: Update command + CI publishing (Step 3.5 continued)

1. Implement `update` command (manifest diffing)
2. Implement `init` command (config file creation)
3. Implement `remove` command
4. Set up GitHub Actions for automated publishing on tags
5. Write the README with install instructions and examples

---

## Relationship to Existing Infrastructure

| What exists | How the CLI uses it |
|---|---|
| `brand_index.skill_md` | The raw SKILL.md content served by `/registry/skills/[slug]/raw` |
| `skill_versions` table | Version numbers and checksums for the manifest endpoint |
| `storage.searchBrands()` | Powers the search/list endpoints |
| `storage.getBrandBySlug()` | Powers the single-skill detail endpoint |
| `skill_exports` table | Could track "shopy_registry" as a destination for sync tracking |
| `getAllBrandFacets()` | Powers the sectors endpoint |
| Bot API at `/api/v1/bot/skills/[vendor]` | Existing pattern for serving `text/markdown` — registry `/raw` follows the same approach without auth |
