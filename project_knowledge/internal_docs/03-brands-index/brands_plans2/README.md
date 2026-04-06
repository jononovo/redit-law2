# brands.sh — Build Context

This folder contains planning and specification documents for brands.sh — the skill registry for AI shopping agents.

---

## Documents

| Document | Purpose |
|---|---|
| `brands-sh-skill-registry-plan.md` | Full redesign plan: transforming brands.sh from a score directory into a ClawHub-style skill registry. Covers landing page redesign, `/skills/[slug]` crash fix, data requirements, and design rules. |

---

## Relationship to Other Tenants

| Tenant | URL Pattern | Purpose |
|---|---|---|
| **shopy.sh** | `/brands/[slug]` | Score-oriented — ASX Score breakdown, leaderboard, scoring rubric |
| **brands.sh** | `/skills/[slug]` | Skill-oriented — SKILL.md content, capabilities, install command, checkout methods |
| **creditclaw.com** | `/agentic-shopping-score` | Scanner — generates scores + SKILL.md files for new brands |

All three tenants share one Next.js codebase and the same `brand_index` database table. The difference is presentation: shopy shows scores, brands shows skills, creditclaw runs the scanner.
