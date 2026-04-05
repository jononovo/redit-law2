---
name: Internal Documentation Guide
description: Convention for writing internal developer documentation. Read this before creating or updating any file in docs/internal/.
---

# Internal Documentation Guide

This folder contains concise technical documentation for agents and developers who need to understand why features exist, how they interact, and what the most complex elements are. It is not external user documentation, and it is not the top-level `replit.md` project overview.

---

## When to Write a Doc

Write a new doc when a feature has **logic that isn't obvious from the code** — business rules, multi-step pipelines, implicit dependencies, or "why we did it this way" decisions. Do not document simple CRUD endpoints, color changes, or features whose behavior is fully self-evident from reading the code.

## Update Policy — Three Tiers

Not all updates carry the same risk. A wrong file path is easy to fix. A wrong statement about why a feature exists can mislead every future developer who reads it. These docs are the institutional memory of the project — they encode intentional decisions, growth positioning, and deliberate constraints that aren't visible in the code.

Before updating any internal doc, determine which tier your change falls into and follow the corresponding requirements.

### Tier 1: Factual corrections

- **What:** File paths changed, function renamed, a new column was added, a bug fix expanded an index, typo fixes, updated counts or version numbers
- **Risk:** Low — these are verifiable facts
- **Requirements:**
  - Verify the specific fact you're changing against the current codebase
  - Keep the change scoped to the fact itself — don't rewrite surrounding context
- **Examples:** "File moved from `lib/foo.ts` to `lib/bar/foo.ts`" / "Table now has 29 brands instead of 28" / "Function was renamed from `buildSkill` to `buildVendorSkillDraft`"

### Tier 2: Behavioral and architectural changes

- **What:** How features interact, data flows, pipeline steps, what triggers what, architectural diagrams, gotchas, fragile areas
- **Risk:** Medium — inaccurate descriptions of how things work will send future developers down wrong paths
- **Requirements before editing:**
  1. **Read every file in the subfolder** where the doc lives — you need the full context of how this feature area is documented, not just the one file you're editing
  2. **Do deep code analysis** of the actual implementation — trace the code paths, verify the data flows, confirm the architectural claims
  3. **Cross-check related docs** — if your change affects something described in another subfolder's docs, read those too
  4. **Verify your update is accurate** — don't write what you think the code does, write what it actually does after reading it
- **Do not:**
  - Update architecture descriptions based on a surface-level code scan
  - Remove or change gotchas/fragile areas unless you've verified the issue no longer exists
  - Assume something is broken just because it looks unusual — many patterns are intentional

### Tier 3: Intentional and strategic statements

- **What:** Why a feature exists, what problem it solves, growth positioning ("we built it this way because..."), deliberate constraints ("we intentionally don't do X because..."), statements about future direction, milestone-gated decisions, the purpose or objective of a feature
- **Risk:** High — these statements encode the owner's product decisions and long-term strategy. An agent analyzing the code might conclude "this should be refactored" when in fact it was deliberately positioned for a future expansion. Changing these statements can cause cascading misunderstandings across the entire team.
- **Requirements:**
  - **Do not modify without explicit owner approval** — if you believe a strategic statement is outdated or incorrect, flag it for the owner rather than changing it yourself
  - This includes: "Why It Exists" sections, expansion plans, statements about deliberate limitations, milestone gates, and any language about positioning or growth strategy
- **Examples of what NOT to change on your own:**
  - "We chose Postgres over a dedicated vector DB because we want to keep infrastructure simple at this stage" — this is a deliberate positioning decision
  - "Category keywords are partially populated — we expand coverage as needed, not all at once" — this is an intentional constraint
  - "Maturity auto-promotion uses a deliberately low bar" — this encodes a product decision about visibility vs. quality

### Summary

| Tier | What changes | Required before editing |
|------|-------------|----------------------|
| **1 — Factual** | File paths, counts, names, typos | Verify the specific fact |
| **2 — Behavioral** | Architecture, data flows, interactions, gotchas | Read full subfolder + deep code analysis |
| **3 — Strategic** | Purpose, intent, positioning, constraints, direction | Owner approval required |

When in doubt about which tier a change falls into, treat it as the higher tier.

---

## When to Update a Doc

Update an existing doc when you:
- Change the behavior of a feature it describes
- Add a new step to a pipeline it documents
- Discover a new gotcha or fragile area
- Implement something that was previously listed as a plan

Do not update docs for cosmetic changes, minor refactors that don't change behavior, or bug fixes that don't reveal new information about the system.

Always follow the tier requirements above before making any update.

---

## File Structure

Every file in `docs/internal/` (including files in subfolders) must have YAML frontmatter with two fields:

```yaml
---
name: Feature Name
description: One sentence explaining what this doc covers and when to read it.
---
```

The `name` is a short human-readable title. The `description` should tell a reader whether this doc is relevant to their task — e.g., "Read this before modifying the scan pipeline or adding new scoring signals."

### Body Sections

Use whichever of these sections are relevant. Not every doc needs all of them.

| Section | Purpose |
|---------|---------|
| **Purpose** | One sentence: what this feature does. |
| **Why It Exists** | The business or product reason this was built. What problem it solves. |
| **How It Works** | Technical flow — the pipeline, the data model, the key decisions. Focus on the complex parts, not the obvious ones. |
| **Key Files** | Table of files involved, with one-line descriptions. |
| **Gotchas** | Fragile areas, implicit dependencies, things that break silently. |
| **Status** | Whether this is implemented, partially built, or a plan. |
| **Expansion Plans** | What's next, if applicable. |

### Plans vs. Implemented Features

- If a doc describes something **already built**, the body should describe how it works today.
- If a doc describes something **not yet built**, prefix the title with "Plan:" and include a `Status` section that says so clearly.
- When you implement a plan, update the doc to remove the "Plan:" prefix, change the body from future tense to present tense, and update the `Status` section.

---

## Folder Structure

Files are organized into subfolders by feature area:

```
docs/internal/
  guide.md              ← this file
  README.md             ← folder overview with reading order
  scanning/             ← ASX scanner, scan pipeline, maturity, scan history
  catalog/              ← brand catalog, taxonomy, merchant index, product search
  platform/             ← multitenant system, onboarding, auth
```

When adding a new doc, place it in the subfolder that matches its feature area. If no subfolder fits, create one — but only if you expect 2+ docs in that area. A single orphan doc can go in the root `docs/internal/` folder.

---

## Writing Style

- **Concise.** A developer should be able to read the full doc in under 5 minutes.
- **Technical.** This is for engineers and agents, not end users. Use exact file paths, function names, SQL snippets, and data types.
- **Opinionated.** Explain *why* decisions were made, not just *what* was built. "We chose X over Y because Z" is more useful than "X is used."
- **Honest about limitations.** If something is fragile, hacky, or temporary, say so. Don't pretend everything is clean — the reader will find out anyway.
- **No filler.** Skip introductions like "This document describes..." — the frontmatter description already covers that. Jump straight into the content.

---

## Quick Checklist

Before creating or updating an internal doc:

1. Does it have YAML frontmatter with `name` and `description`?
2. Is it in the right subfolder?
3. Does it explain *why*, not just *what*?
4. Does it call out the most complex element clearly?
5. Are file paths and function names current?
6. Is the status accurate (plan vs. implemented)?
