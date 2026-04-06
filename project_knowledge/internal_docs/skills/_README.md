---
name: Agent Shopping Skills per Brand
description: Module 2 — SKILL.md generation, skill.json, registry API. How we teach agents to shop at specific stores.
---

# Agent Shopping Skills per Brand

Docs for Module 2. Covers skill file generation, the machine-readable skill.json format, and the registry API.

## Key code

- `lib/procurement-skills/generator.ts` — `generateVendorSkill()`, `buildVendorSkillDraft()`
- `lib/procurement-skills/skill-json.ts` — `buildSkillJson()`
- `lib/procurement-skills/taxonomy.ts` — taxonomy mapping
- `app/api/v1/registry/` — registry API routes
- `app/api/v1/vendors/` — vendor skill endpoints

## Related modules

- **Module 1 (Scanning)** triggers skill generation after every scan
- **Module 3 (Brands Index)** hosts the skills and serves them via registry API
- **Module 8 (Thought Leadership)** owns the SKILL.md spec itself
