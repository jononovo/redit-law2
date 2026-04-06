---
name: shopy.sh — Vision, Identity & Brand
description: Everything about shopy.sh in one place — product vision, brand voice, design language, CLI, dual-track UX, and key files. Tier 3 protected.
---

# shopy.sh

## Vision

The open standard and platform for agentic commerce. Makes online stores discoverable and shoppable by AI agents.

- **For merchants:** "How agent-ready is your store?" — ASX Score scanner (0–100), improvement roadmap, leaderboard
- **For agent developers:** CLI tool to install shopping skills (`npx shopy add amazon`)
- **For the ecosystem:** open standard extending skills.sh with commerce-specific metadata

Every scan creates or updates a brand in the catalog. Zero manual curation. The catalog grows automatically.

## The One-Liner

**"Make your store shoppable by AI agents."**

Alternatives:
- "The open standard for agentic commerce."
- "SEO was for search engines. shopy.sh is for shopping agents."
- Developer angle: "The package manager for commerce skills."

## Identity

- **Name:** shopy.sh
- **Tagline:** "Make your store shoppable by AI agents."
- **Logo:** shared chip logo with 🛒
- **Audience (primary):** merchants, store developers, e-commerce CTOs
- **Audience (secondary):** agent developers who need shopping skills
- **Audience (tertiary):** agent platform builders (OpenAI, Anthropic, Google)

## Brand Voice

Clear, authoritative, practical. Speaks to technical e-commerce professionals who understand SEO and APIs.

- ✅ "Your ASX Score is 74/100 — here's what to improve"
- ❌ "Achieve a strong agent readiness profile"
- ✅ "Agents can't find your products because you're missing structured data"
- ❌ "Optimize your agentic commerce metadata layer"
- ✅ "Run `npx shopy add amazon`"
- ❌ "Get started by exploring our catalog"

## Design Language

Minimal, data-forward, terminal-influenced. The `.sh` signals technical credibility.

- No rounded corners on cards, no shadows
- `font-mono` section labels
- `gap-px bg-neutral-200` grid dividers
- `→` list items
- Dark sections: `bg-neutral-950`
- Green accent only in terminal contexts
- Light mode overall (minimal, clean)

| Token | Value |
|-------|-------|
| Primary | `hsl(0 0% 9%)` — near-black |
| Accent | `hsl(0 0% 20%)` — dark grey |
| Secondary | `hsl(0 0% 45%)` — grey |

## Dual-Track UX

The site *looks* developer-focused (clean, technical, data-forward) but has clear on-ramps for non-technical visitors.

**On-page contextual cards** — inline, unobtrusive callouts throughout technical pages:
- `/standard` page: *"Not a developer? Here's what this means for your brand →"*
- Score breakdown: *"What does this score mean for my store?"*
- CLI section: *"Don't have a developer? Here's how to get started without one →"*

**`/guide`** — dedicated non-technical explainer: what is agentic commerce, why it matters, how to check your score, how to improve, what happens next.

## The ASX Score

Three pillars, 100 points total:
- **Clarity (35pts)** — structured data, product feeds, agent metadata
- **Discoverability (30pts)** — search API/MCP, site search, page load, product page quality
- **Reliability (35pts)** — guest checkout, order management, cart predictability, bot tolerance

Rubric v2.0.0, 11 signals. Score labels: Poor (0–20), Needs Work (21–40), Fair (41–60), Good (61–80), Excellent (81–100).

## CLI Reference

```bash
npx shopy add amazon                    # install a skill
npx shopy add amazon walmart staples    # install multiple
npx shopy add --sector office           # install by sector
npx shopy search "office supplies"      # search for skills
npx shopy update                        # update installed skills
npx shopy list                          # list installed
```

Skills are valid SKILL.md files compatible with any agent that supports skills.sh (Claude Code, Cursor, Copilot, Windsurf, Gemini).

**CLI status:** planned, not yet built.

## The Specification

1. **Commerce frontmatter** — vendor identity, taxonomy, ASX Score, AXS Rating, API access tiers, checkout capabilities, shipping, payment methods, loyalty, distribution status
2. **Skill body structure** — Product Discovery → Product Detail → Cart → Checkout → Post-Purchase → Known Limitations → Error Handling → Feedback
3. **Scoring fields** — ASX Score (automated 0–100) + AXS Rating (crowd-sourced 1–5) in every skill's frontmatter
4. **Feedback protocol** — every skill instructs agents to POST three ratings after each purchase attempt → feeds the crowd-sourced AXS Rating

## The Catalog

Searchable directory of all published commerce skills. Each entry shows:
- Vendor name, domain, sector
- ASX Score with signal breakdown + AXS Rating with feedback count
- API access tier, checkout capabilities, payment methods
- Skill quality and verification status
- Install command

## shopy.sh vs creditclaw.com

| | shopy.sh | creditclaw.com |
|---|---|---|
| **Audience** | Merchant dev teams, CTOs, e-commerce pros + agent devs | Brand owners, procurement teams, agent operators |
| **Question** | "How do AI agents find and buy from my store?" | "How do I use AI agents to buy for my business?" |
| **Tone** | Open standard / technical authority | Commercial platform / product marketing |
| **Revenue role** | Awareness + adoption + credibility | Revenue engine (scans, subscriptions, gateway) |

shopy.sh is the front door and open standard. creditclaw.com is the commercial engine behind it.

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing — ASX Score search bar, recent scores leaderboard |
| `/agentic-shopping-score` | Scanner tool |
| `/standard` | Agentic commerce standard spec (custom markdown renderer, sticky TOC sidebar) |
| `/guide` | Non-technical merchant explainer (6 sections, CSS-only flow diagram, checklist) |
| `/axs` | Scoring methodology |

Shopy docs: `/docs/shopy/...` — Getting Started, CLI, Skill Format, Agent Integration.

## Context — Standards Landscape

| Standard | Status |
|----------|--------|
| **ACP** (Stripe) | We probe for `.well-known/acp.json` during scans |
| **UCP** (Google) | Track but don't depend — restricted access, Google ecosystem |
| **x402** | Payment rail, not discovery — we have `lib/x402/` |
| **MCP** (Anthropic) | Probe for `mcp_endpoint`, score it (4pts in Discoverability) |
| **Agent Skills Standard** | Our SKILL.md extends this with commerce metadata |

**Google Product Taxonomy** — backbone of our category system. ~5,600 categories, 28 sectors (21 Google + 6 custom + multi-sector). Category keywords map natural language to taxonomy IDs for the recommend API.

**Key insight:** most competitors require merchant integration. Our scanner works *without* merchant cooperation — we evaluate existing sites and generate skills from what's publicly available. Scales independently of merchant adoption.

## Current State

- ASX Scanner running (3 Perplexity API calls per scan)
- ~28 brands scanned and scored
- Maturity auto-promotion deployed (draft → community)
- Registry API live
- Category keyword resolution partial (~1,286 / 5,638)
- Product vector search via pgvector (live in recommend API)

## Near-term Direction

- Scale to thousands of brands via automated scan queue
- Premium scan tier with browser-agent inspection
- CLI package (`npx shopy add`) — Phase 2
- Full category keyword coverage

## Open Questions

1. npm package name — is `shopy` available? Alternatives: `@shopy/cli`, `shopy-skills`
2. Community contributions — should third parties submit skills? Review process?
3. GitHub presence — should the spec live in a public repo?
4. Skill signing — cryptographic verification of skill authenticity?
5. Versioning — semantic versioning in frontmatter? Auto-increment on re-scan?
6. Pricing — fully free catalog or some skills behind paywall/API key?

## Key Files

| File | Purpose |
|------|---------|
| `components/tenants/shopy/landing.tsx` | Landing page |
| `components/tenants/shopy/how-it-works.tsx` | How it works page |
| `lib/tenants/tenant-configs.ts` | Tenant config (shopy section) |
| `public/tenants/shopy/config.json` | Dynamic config |
| `content/agentic-commerce-standard.md` | The spec source |
