# Phase 6: Skill Feedback Loop

## Status: Not started (depends on Phase 5)

## Summary

Agents and humans rate brands after purchases. Three sub-ratings (search accuracy, stock reliability, checkout completion) feed into weighted aggregated scores on `brand_index`. The feedback endpoint is described directly in every SKILL.md — agents read the instruction and POST three ratings, no SDK required. Humans rate via a dashboard prompt after completed purchases.

## Source document

The full technical spec with database schema, API design, aggregation logic, weighting rules, and implementation order is in:

**`attached_assets/skill-feedback-loop(1)_1774389611161.md`**

That document should be analyzed and used as the basis for the detailed implementation plan when Phase 6 begins.

## Key components (from the spec)

1. `brand_feedback` table — single table for both agent and human feedback
2. `POST /api/v1/bot/skills/{slug}/feedback` — accepts feedback from agents (auth optional) and humans
3. Feedback section appended to every generated SKILL.md via `generateVendorSkill()`
4. Rating columns on `brand_index` (nullable, shown only after 5+ weighted events)
5. Aggregation job — periodic recomputation with recency + source weighting
6. Human feedback UI — dashboard prompt after completed purchases
7. Rating display on the catalog pages (enabled by Phase 5's DB-only catalog)

## Dependencies

- **Phase 5 must be complete** — the catalog must read from `brand_index` for ratings to be visible to humans
- `computeAgentFriendliness` stays as a standalone function in `types.ts` — Phase 6 adds a complementary *crowd-sourced* rating system alongside the static readiness score

---

# Phase 7: Master Skill Document

(Previously Phase 6 — bumped to make room for the feedback loop)

Details TBD.
