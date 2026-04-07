# Brand Versioning Technical Plan

**Status:** Proposed  
**Priority:** Medium — not blocking any current step, but needed before re-scan workflows go live  
**Depends on:** None (can be built independently)  
**Affects:** Step 4 (Registry API), Step 5 (Premium Scan)

---

## Problem

When the ASX scanner re-scans a domain, it upserts the `brand_index` row. The previous state — scores, signals, SKILL.md, skill.json, and all structured data — is overwritten with no history preserved.

This creates three gaps:

1. **No score trending.** We can't show "Nike improved from 62 to 71 this month" or detect regressions.
2. **No package history.** If a re-scan produces a worse SKILL.md (model hallucination, temporary site issue), there's no way to roll back to the previous version.
3. **No audit trail.** For a professional platform hosting skills for thousands of brands, there's no record of what changed, when, or why.

---

## Research Summary

The established pattern for this problem is the **Document Versioning Pattern** (MongoDB's terminology, but the concept is database-agnostic):

- The **current document** lives in a hot table optimized for reads (our `brand_index`).
- **All previous versions** live in a separate append-only history table, written once and never updated.
- Metadata and content are **separated by access pattern** — score/audit data is queried frequently (trending, dashboards), while full package content is accessed rarely (rollback, diff, download).

This is how content management systems, insurance platforms, and regulated SaaS products handle versioned records. Git uses a more complex content-addressable object store, but that's overkill for our use case since we're versioning whole-document snapshots, not line-level diffs across millions of files.

Key design principles from the research:

- **Append-only, immutable rows.** Version history rows are INSERT-only. No UPDATE or DELETE. This guarantees audit integrity and simplifies replication/archival.
- **Separate metadata from content.** Score data (small, frequently queried) stays in one table. File content (large, rarely accessed) stays in another. Different access patterns, different storage characteristics.
- **Content-type-agnostic file storage.** Don't hardcode file names as columns (`skill_md`, `skill_json`). Use a normalized file table with `file_path` + `content` so the package shape can evolve without schema migrations.
- **Denormalize what you query.** Pull `score_total` and key metrics out of the blob and into indexed columns so trending queries don't require JSONB unpacking.

---

## Architecture

Two new tables, one trigger modification.

### Table 1: `brand_versions` — Version metadata + score history

This is the lightweight, frequently-queried table. One row per scan per brand.

```sql
CREATE TABLE brand_versions (
  id              SERIAL PRIMARY KEY,
  brand_slug      TEXT NOT NULL,
  version_number  INTEGER NOT NULL,
  
  -- Denormalized score data (fast trending queries)
  score_total     INTEGER NOT NULL,
  score_breakdown JSONB NOT NULL,
  recommendations JSONB,
  
  -- Scan audit metadata
  scan_tier       TEXT NOT NULL,        -- 'free' | 'agentic' | 'premium'
  scanned_by      TEXT,                 -- 'public' | user uid
  scan_duration_ms INTEGER,             -- how long the scan took
  model_used      TEXT,                 -- 'claude-sonnet-4-6' etc.
  pages_crawled   TEXT[],               -- URLs the agent visited
  
  -- Snapshot of the full brand_index row at this version
  brand_snapshot  JSONB NOT NULL,       -- complete brand_index state
  
  -- Diff from previous version (optional, computed on write)
  changed_fields  TEXT[],               -- which top-level fields changed
  score_delta     INTEGER,              -- score change from previous version
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query: "show me all versions of this brand, newest first"
CREATE INDEX brand_versions_slug_created_idx 
  ON brand_versions (brand_slug, created_at DESC);

-- Trending query: "brands with biggest score change this week"
CREATE INDEX brand_versions_score_delta_idx 
  ON brand_versions (created_at, score_delta) 
  WHERE score_delta IS NOT NULL;

-- Version lookup
CREATE UNIQUE INDEX brand_versions_slug_version_idx 
  ON brand_versions (brand_slug, version_number);
```

**Why `brand_snapshot` as JSONB instead of individual columns:**
The `brand_index` schema has 50+ columns and will keep growing. Duplicating every column would create a maintenance nightmare — every schema change to `brand_index` would require a matching migration on `brand_versions`. A single JSONB snapshot captures the full state without coupling the two schemas. The denormalized `score_total`, `score_breakdown`, and `score_delta` columns handle the hot-path queries without needing to unpack the blob.

**Why `version_number` as an auto-incrementing integer per brand:**
Simpler than semver for automated scans. The scanner isn't making "breaking" vs "minor" changes — it's producing a new snapshot each time. Sequential integers are easier to query ("give me version N-1"), sort, and reason about. If we later need semver for the registry API, it can be derived: `1.0.{version_number}`.

### Table 2: `brand_version_files` — Package file content

This is the heavy, rarely-accessed table. Stores the actual files that make up a skill package at each version.

```sql
CREATE TABLE brand_version_files (
  id              SERIAL PRIMARY KEY,
  version_id      INTEGER NOT NULL REFERENCES brand_versions(id) ON DELETE CASCADE,
  
  file_path       TEXT NOT NULL,          -- e.g. 'SKILL.md', 'skill.json', 'payments/rules.md'
  content_type    TEXT NOT NULL,          -- 'text/markdown', 'application/json', 'text/plain'
  content         TEXT NOT NULL,          -- the actual file content
  content_hash    TEXT,                   -- SHA-256 for dedup/integrity checking
  size_bytes      INTEGER,               -- content length for quick size queries
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Get all files for a version
CREATE INDEX brand_version_files_version_idx 
  ON brand_version_files (version_id);

-- Check if a specific file exists/changed
CREATE INDEX brand_version_files_path_idx 
  ON brand_version_files (version_id, file_path);
```

**Why a separate table instead of JSONB on the version row:**
- Each file can be fetched independently (API serves `GET /registry/{vendor}/SKILL.md` without loading skill.json, payments.md, etc.)
- New file types are added by inserting rows, not altering schema
- Supports folders naturally — `file_path` can be `config/overrides.json` or `payments/us/rules.md`
- Row sizes stay predictable — a SKILL.md can be 5KB+, and stuffing multiple files into a JSONB column on the version row would make that table bloated and slow to scan for trending queries
- Content deduplication is possible via `content_hash` — if SKILL.md didn't change between v3 and v4, we can detect that (and optionally skip storing the duplicate)

**Why TEXT and not BYTEA:**
All current and planned package files are text-based (Markdown, JSON, YAML). If binary files are needed later (images, PDFs), they should go to object storage (S3/R2) with a URL reference in this table, not inline in PostgreSQL. The `content_type` field already supports this — a future binary file would have `content_type: 'image/png'` and `content` would be the S3 key instead of inline data.

---

## Data Flow

### On scan (write path)

The scanner's upsert flow in `app/api/v1/scan/route.ts` gets one new step between computing the score and upserting `brand_index`:

```
1. Compute score (existing)
2. Generate SKILL.md (existing)
3. ── NEW: Snapshot current brand_index row into brand_versions ──
   a. Read the existing brand_index row (already fetched as `existing`)
   b. If it exists AND has a score (not first scan):
      - Determine next version_number (max + 1 for this slug)
      - Compute changed_fields by comparing old vs new data
      - Compute score_delta (new score - old score)
      - INSERT into brand_versions with the OLD state as brand_snapshot
      - INSERT into brand_version_files with the OLD SKILL.md, skill.json, etc.
   c. If it's the first scan: skip (first version is created on the NEXT scan)
4. Upsert brand_index (existing — this becomes the new "current")
```

**Important: We snapshot the OLD state before overwriting.** This means `brand_versions` contains the history of what was replaced, and `brand_index` is always the latest. Version 1 appears in history only after version 2 is created. This is the standard pattern — the current document is always in the hot table, history is append-only.

### On read (query paths)

| Query | Table | Example |
|---|---|---|
| "Current score for Nike" | `brand_index` | Unchanged — no performance impact |
| "Nike's score over time" | `brand_versions` | `WHERE brand_slug = 'nike' ORDER BY created_at` |
| "Brands that improved most this month" | `brand_versions` | `WHERE score_delta > 0 AND created_at > interval` |
| "Nike's SKILL.md from 2 weeks ago" | `brand_version_files` | JOIN `brand_versions` on slug+date, then files |
| "What changed between v3 and v4" | `brand_versions` | `changed_fields` array on the newer row |
| "Download Nike's v3 skill package" | `brand_version_files` | `WHERE version_id = ?` returns all files |

---

## Drizzle Schema (for implementation)

```typescript
export const brandVersions = pgTable("brand_versions", {
  id: serial("id").primaryKey(),
  brandSlug: text("brand_slug").notNull(),
  versionNumber: integer("version_number").notNull(),
  scoreTotal: integer("score_total").notNull(),
  scoreBreakdown: jsonb("score_breakdown").notNull(),
  recommendations: jsonb("recommendations"),
  scanTier: text("scan_tier").notNull(),
  scannedBy: text("scanned_by"),
  scanDurationMs: integer("scan_duration_ms"),
  modelUsed: text("model_used"),
  pagesCrawled: text("pages_crawled").array(),
  brandSnapshot: jsonb("brand_snapshot").notNull(),
  changedFields: text("changed_fields").array(),
  scoreDelta: integer("score_delta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("brand_versions_slug_created_idx").on(table.brandSlug, table.createdAt),
  index("brand_versions_slug_version_idx").on(table.brandSlug, table.versionNumber),
]);

export const brandVersionFiles = pgTable("brand_version_files", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").notNull(),
  filePath: text("file_path").notNull(),
  contentType: text("content_type").notNull(),
  content: text("content").notNull(),
  contentHash: text("content_hash"),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("brand_version_files_version_idx").on(table.versionId),
  index("brand_version_files_path_idx").on(table.versionId, table.filePath),
]);
```

---

## Scale Considerations

**Current state:** ~14 seeded brands + organic scans. Low volume.

**Near-term (1-3 months):** Thousands of brands, each scanned 1-3 times. `brand_versions` grows to ~5K-15K rows. `brand_version_files` at 2-3 files per version = ~10K-45K rows. PostgreSQL handles this trivially.

**Medium-term (6-12 months):** Tens of thousands of brands with periodic re-scans. `brand_versions` at ~100K rows, `brand_version_files` at ~300K rows. Still well within PostgreSQL comfort zone with proper indexes.

**Long-term archival path (when needed, not now):**
- PostgreSQL declarative partitioning on `brand_versions` by month — old partitions become read-only
- Or: archive rows older than N months to S3 as JSONL files, keep a summary row in a `brand_score_archive` table with just slug + score + date
- `brand_version_files` content can be migrated to object storage (S3/R2) with the `content` column replaced by a URL — the `content_type` and `content_hash` columns already support this transition

None of this archival work is needed until we're well past 100K version rows, which is months away at minimum.

---

## What This Enables

1. **Score trending charts** on brand detail pages ("this brand's score over time")
2. **Regression detection** alerts ("Nike dropped 15 points since last scan — flag for review")
3. **Version history** in the registry API (`GET /api/v1/registry/{vendor}/versions`)
4. **Rollback capability** — if a scan produces garbage, restore from the previous version's snapshot
5. **Diff view** — "what changed between scans" using `changed_fields` + snapshot comparison
6. **Premium scan comparison** — Tier 2 scan results stored as their own version, comparable against the free scan baseline
7. **Package download by version** — `GET /api/v1/registry/{vendor}/v3/SKILL.md`

---

## Files to Modify (implementation checklist)

| File | Change |
|---|---|
| `shared/schema.ts` | Add `brandVersions` and `brandVersionFiles` table definitions |
| `server/storage/brand-versions.ts` | New storage module: create version, list versions, get files |
| `server/storage/types.ts` | Add version methods to `IStorage` |
| `server/storage/index.ts` | Register version storage methods |
| `app/api/v1/scan/route.ts` | Add snapshot step before `upsertBrandIndex` |
| `app/api/v1/registry/[vendor]/versions/route.ts` | New: list version history |
| `app/api/v1/registry/[vendor]/versions/[id]/route.ts` | New: get version detail + files |

---

## Open Questions

1. **Should the first scan create a version?** Current design says no — version 1 appears in history only when version 2 replaces it. Alternative: always create a version row, even on first scan, so every state is in history. Trade-off is an extra write on every first-time scan. Recommendation: create on first scan too — it's one extra INSERT and means the version history is complete from day one.

2. **Content deduplication.** If SKILL.md didn't change between scans, should we skip storing a duplicate in `brand_version_files`? The `content_hash` column enables this, but adds complexity. Recommendation: store everything for now, optimize later if storage becomes a concern.

3. **Premium scan versions.** When Tier 2 (premium) scans land, they'll produce richer data than free scans. Should premium and free versions live in the same history table with `scan_tier` distinguishing them, or separate tables? Recommendation: same table, `scan_tier` column already handles this.
