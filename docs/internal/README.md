# Internal Developer Documentation

Private technical documentation for the CreditClaw / shopy.sh engineering team. These docs cover implementation details, fragile areas, expansion plans, and operational notes that don't belong in the public-facing docs.

## What goes here

- **Feature deep-dives** — how each major system works internally, where the sharp edges are, and what to watch out for when changing things
- **Expansion notes** — what needs to happen to grow or extend each feature
- **Fragile areas** — known coupling, implicit dependencies, and things that break silently
- **Operational guides** — step-by-step runbooks for common developer tasks (adding a tenant, running migrations, etc.)

## What does NOT go here

- Public user guides → `docs/content/`
- Active build plans still being executed → `docs/build context/`
- Brand/design guidelines → `docs/brand.md`

## Pages

| File | Feature | Summary |
|------|---------|---------|
| `scan-taxonomy-skills-pipeline.md` | **Pipeline Overview** | End-to-end flow: scan → classify → score → taxonomy → SKILL.md → skill.json. Start here. |
| `asx-scanner.md` | ASX Scanner | Perplexity-powered scan, rubric v1.1.0, 11 signals, 3 API calls per scan |
| `metadata-and-taxonomy.md` | Metadata & Taxonomy | 27-sector system, Google Product Taxonomy, tiers, capabilities, skill.json |
| `product-index.md` | Product Index | Brand catalog, LITE_COLUMNS, filtering, generateStaticParams, search_vector |
| `multitenant-system.md` | Multitenant | Hostname routing, tenant configs, theming, adding new tenants |
