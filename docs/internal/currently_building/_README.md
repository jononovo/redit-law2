---
name: Currently Building
description: Working folder for active build cycles. Scratch research, build notes, and in-progress analysis go here. Cleaned out every 1-2 weeks.
---

# Currently Building

Active working folder. Everything here is in flux.

## What goes here

- Research and analysis for features currently being built
- Build notes, scratch docs, decision logs
- Any document that isn't ready for permanent placement

## What doesn't go here

- Finished operational docs → move to the appropriate subfolder
- Completed research → move to the relevant `research/` subfolder
- Stale or abandoned docs → delete them

## Cleanup

Every 1-2 weeks, review this folder:
1. Finished research → move to `{subfolder}/research/` with proper frontmatter
2. Operational insights → fold into existing docs or create new ones
3. Stale or one-off notes → delete
4. Anything still active → leave here

## Frontmatter

Files here still need frontmatter, but it can be lighter:

```yaml
---
name: Premium Scan Research
description: Exploring browser-agent inspection for premium tier scans.
date: 2026-04-02
---
```

`status` and `outcome` fields are optional until the research concludes.
