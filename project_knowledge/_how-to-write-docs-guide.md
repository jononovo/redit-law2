---
name: Internal Documentation Guide
description: Convention for writing internal developer documentation. Read this before creating or updating any file in project_knowledge/.
---

# Internal Documentation Guide

Concise technical docs for agents and developers. Explains why features exist, how they interact, and what's complex. Not external user docs. Not `replit.md`.

---

## When to Write a Doc

Write when a feature has **logic that isn't obvious from the code** — business rules, pipelines, implicit dependencies, "why we did it this way" decisions. Skip simple CRUD, color changes, or self-evident code.

---

## Update Policy — Three Tiers

These docs are institutional memory. They encode intentional decisions, growth positioning, and constraints that aren't visible in the code. Wrong updates cascade.

| Tier | What changes | Required before editing |
|------|-------------|----------------------|
| **1 — Factual** | File paths, counts, names, typos | Verify the fact against codebase. Keep change scoped. |
| **2 — Behavioral** | Architecture, data flows, interactions, gotchas | Read **every file in the subfolder**. Deep code analysis. Cross-check related docs. |
| **3 — Strategic** | Purpose, intent, positioning, constraints, direction | **Owner approval required.** Flag it, don't change it. |

### Tier 2 rules

- Read the full subfolder for context, not just the file you're editing
- Trace actual code paths — don't write what you *think* the code does
- Don't remove gotchas unless you've verified the issue is gone
- Don't assume unusual patterns are broken — many are intentional

### Tier 3 — what's protected

- "Why It Exists" sections
- Expansion plans and future direction
- Deliberate constraints ("we intentionally don't do X because...")
- Growth positioning ("we built it this way for future expansion")
- Milestone-gated decisions

If you think a strategic statement is outdated, flag it for the owner. Don't rewrite it.

**When in doubt, treat it as the higher tier.**

---

## When to Update

- Changed feature behavior → update the doc
- Added pipeline step → update the doc
- Found new gotcha → add it
- Implemented a plan → update status, remove "Plan:" prefix

Don't update for: cosmetic changes, minor refactors, bug fixes that reveal nothing new.

---

## File Structure

### Frontmatter (required)

```yaml
---
name: Feature Name
description: One sentence — what this covers and when to read it.
---
```

### Body Sections (use what's relevant)

- **Purpose** — one sentence
- **Why It Exists** — business/product reason (Tier 3 protected)
- **How It Works** — technical flow, complex parts only
- **Key Files** — table of files with one-line descriptions
- **Gotchas** — fragile areas, silent failures, implicit dependencies
- **Status** — implemented / partial / plan
- **Expansion Plans** — what's next (Tier 3 protected)

### Plans vs. Implemented

- Built → describe how it works today
- Not built → prefix title with "Plan:", include Status section
- Just implemented → remove "Plan:", update to present tense

---

## File Placement

Place docs in the matching subfolder inside `internal_docs/` (`scanning/`, `catalog/`, `platform/`, `tenants/`). New subfolder only if 2+ docs expected.

### Folder README files

Use `_README.md` (with leading underscore) for folder navigation files. The underscore sorts it to the top of file listings and distinguishes it from content docs.

- `project_knowledge/_README.md` — main navigation for the whole folder
- `currently_building/_README.md` — explains the working bench
- Feature subfolders in `internal_docs/` don't need a `_README.md` — agents scan frontmatter of the docs directly

---

## Research Files

Research docs capture the analysis, industry context, and decision reasoning behind features. They're the deepest layer of progressive disclosure — an agent reads the operational doc first, then dives into research only when they need first-principles understanding.

### Where they live

Each feature subfolder in `internal_docs/` can have a `research/` subfolder:

```
internal_docs/scanning/
  research/
    260403-scanner-rebuild-research.md
    260403-taxonomy-options-analysis.md
  asx-scanner.md
  ...
```

Cross-cutting research that spans multiple areas goes in `internal_docs/research/` or `currently_building/` if still active.

### Research frontmatter (required)

```yaml
---
name: Scanner Rebuild Research
description: Analysis of broken scanner pipeline and alternative approaches. Led to Perplexity migration.
date: 2026-04-03
status: concluded | ongoing | superseded
outcome: One sentence — what was decided or built as a result.
related:
  - scanning/asx-scanner.md
---
```

| Field | Purpose |
|-------|---------|
| `name` | Short title |
| `description` | What was researched and why |
| `date` | When the research was done (YYYY-MM-DD) |
| `status` | `concluded` (decision made), `ongoing` (still open), `superseded` (replaced by newer research) |
| `outcome` | What we decided / what was built as a result |
| `related` | Which operational docs this research informed |

### Research vs. operational docs

- **Operational docs** describe how things work *today* — they stay current
- **Research docs** are point-in-time snapshots — they capture what we knew and decided *at that moment*
- Research docs are **not updated** when the feature evolves. They're historical records.
- If research becomes outdated, set `status: superseded` and add a note pointing to newer research

### When to write a research doc

- Deep industry analysis that informed a feature decision
- Technology comparison (we evaluated X, Y, Z and chose Y because...)
- Systematic testing or audit of existing behavior
- Strategy or go-to-market analysis
- Any analysis where the *reasoning* is as valuable as the *conclusion*

### Active build cycle

During a build cycle, put all working docs (research, build notes, scratch analysis) in `currently_building/`. Don't scatter in-progress work across permanent folders.

When the build cycle is done:
- Research docs → move to `{subfolder}/research/` with full frontmatter
- Operational insights → fold into existing docs or create new ones
- Stale notes → delete

---

## Writing Style

- **Succinct.** Bullet points over paragraphs. Headers over prose.
- **Technical.** File paths, function names, SQL, data types.
- **Opinionated.** "We chose X over Y because Z" — not just "X is used."
- **Honest.** If it's fragile or hacky, say so.
- **No filler.** Frontmatter handles the intro. Jump to content.

---

## Checklist

1. YAML frontmatter with `name` + `description`?
2. Right subfolder?
3. Explains *why*, not just *what*?
4. File paths and function names current?
5. Status accurate (plan vs. implemented)?
6. Update tier identified and requirements met?
