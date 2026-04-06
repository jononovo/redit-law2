---
name: Thought Leadership
description: Module 10 — Standards and open protocols we define and maintain. ASX rubric, SKILL.md spec, open brands index.
---

# Thought Leadership

Docs for Module 10. This module is about the standards we create, publish, and evolve — not feature code, but the frameworks that drive product direction.

## Standards we own

| Standard | What it is | Where it lives in code |
|----------|-----------|----------------------|
| ASX Score | Scoring rubric for merchant AI-readiness | `lib/agentic-score/rubric.ts` |
| SKILL.md Specification | Open format for agent shopping instructions | `content/agentic-commerce-standard.md` |
| skill.json Schema | Machine-readable companion to SKILL.md | `lib/procurement-skills/skill-json.ts` |
| Open Brands Skills Index | Public registry of merchant skills | brands.sh, registry API |

## What belongs here

- Research on emerging protocols (ACP, UCP, A2A, MCP) and how they affect our standards
- Rubric evolution decisions (why we changed weights, added/removed signals)
- Competitive positioning docs for standards landscape
- Standard specification documents

## Related modules

- **Module 1 (Scanning)** implements the ASX rubric
- **Module 2 (Skills)** implements the SKILL.md and skill.json specs
- **Module 3 (Brands Index)** hosts the open brands index
