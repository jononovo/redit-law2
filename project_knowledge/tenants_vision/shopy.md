---
name: shopy.sh — Vision, Identity & Brand
description: Product vision, brand voice, audience tiers, design language, CLI, dual-track UX, spec, and key files. Tier 3 protected.
---

# shopy.sh

## Vision

Open standard and platform for agentic commerce. Extends Vercel's skills.sh format with commerce-specific metadata — turns a plain SKILL.md into a complete procurement instruction set any AI agent can execute.

- **For merchants:** "How agent-ready is your store?" — ASX Score scanner (0–100), improvement roadmap, leaderboard
- **For agent developers:** "How do I teach my agent to shop at any store?" — CLI to install shopping skills (`npx shopy add amazon`)
- **For the ecosystem:** open standard, single format for platforms to ingest vs custom integrations per merchant

Every scan creates or updates a brand in the catalog. Zero manual curation — the catalog grows automatically.

## The One-Liner

**"Make your store shoppable by AI agents."**

Alternatives:
- "The open standard for agentic commerce."
- "Get found by AI shopping agents."
- "SEO was for search engines. shopy.sh is for shopping agents."
- Dev angle: "Install shopping skills for your AI agent." / "The package manager for commerce skills."

## Identity

- **Name:** shopy.sh
- **Tagline:** "Make your store shoppable by AI agents."
- **Logo:** shared chip logo with 🛒

## Audience

**Primary — merchants and the people who run their stores:**
- **Store developers** — engineers/agencies building e-commerce platforms. Need to understand what makes a store agent-friendly and implement the metadata standard
- **CTOs of fashion, retail, e-commerce brands** — ensure stores are discoverable by the next generation of shopping interfaces (AI agents, not just browsers)
- **E-commerce/marketing professionals** — responsible for product discovery and conversion. If SEO = being found by Google, shopy.sh = being found by ChatGPT, Claude, and Gemini

These are the people who care about ASX Scores, want to compare stores, and will adopt the standard to improve discoverability.

**Secondary — agent developers:**
- Building personal shopping assistants, corporate procurement bots, inventory management, comparison engines
- Use the shopy.sh catalog + CLI to install skills that teach agents to shop at specific stores
- Care about: spec, install experience, skill quality/reliability

**Tertiary — agent platform ecosystem:**
- Platform builders (OpenAI, Anthropic, Google, open-source frameworks)
- Want standardized commerce capabilities — shopy.sh gives them one format vs custom integrations per merchant

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

Site *looks* developer-focused (clean, technical, data-forward) but has clear on-ramps for non-technical visitors.

**On-page contextual cards** — inline, unobtrusive callouts on technical pages:
- `/standard`: *"Not a developer? Here's what this means for your brand →"*
- Score breakdown: *"What does this score mean for my store?"*
- CLI section: *"Don't have a developer? Here's how to get started without one →"*

Not modal pop-ups — inline, unobtrusive, clearly marked. Don't dilute the technical feel, just signal "you're welcome here too."

**`/guide`** — dedicated non-technical explainer:
1. What is agentic commerce? (diagram: customer → AI agent → your store)
2. Why does this matter for your brand?
3. What is an ASX Score?
4. How do I check my score?
5. How do I improve my score? (checklist, no code)
6. What happens next?

## The ASX Score

Three pillars, 100 points total:
- **Clarity (35pts)** — structured data, product feeds, agent metadata
- **Discoverability (30pts)** — search API/MCP, site search, page load, product page quality
- **Reliability (35pts)** — guest checkout, order management, cart predictability, bot tolerance

Rubric v2.0.0, 11 signals. Labels: Poor (0–20), Needs Work (21–40), Fair (41–60), Good (61–80), Excellent (81–100).

## How It Works

**For merchants:**
1. Store gets scanned (via CreditClaw or self-service)
2. SKILL.md generated — describes how agents search, browse, cart, and check out
3. Skill published to shopy.sh catalog
4. AI agents discover via catalog, CLI, or direct install
5. Agents shop → feedback feeds back into ASX Score and AXS Rating

**For agent developers (CLI):**

```bash
npx shopy add amazon                    # install a skill
npx shopy add amazon walmart staples    # install multiple
npx shopy add --sector office           # install by sector
npx shopy search "office supplies"      # search for skills
npx shopy update                        # update installed skills
npx shopy list                          # list installed
```

`npx shopy add amazon` downloads `amazon.md` into the agent's skill directory. Contains everything: how to search, read product pages, add to cart, check out, payment methods, what fails, what to do when it fails.

Skills are valid SKILL.md files — compatible with any agent supporting skills.sh (Claude Code, Cursor, Copilot, Windsurf, Gemini). Commerce metadata lives in the `metadata` map, which skills.sh already supports as arbitrary key-value pairs.

**CLI status:** planned, not yet built.

## The Specification

1. **Commerce frontmatter** — vendor identity, taxonomy, ASX Score, AXS Rating, API access tiers, checkout capabilities, shipping, payment methods, loyalty, distribution status
2. **Skill body structure** — Product Discovery → Product Detail → Cart → Checkout → Post-Purchase → Known Limitations → Error Handling → Feedback
3. **Scoring fields** — ASX Score (automated 0–100) + AXS Rating (crowd-sourced 1–5) in every skill's frontmatter
4. **Feedback protocol** — every skill instructs agents to POST three ratings after each purchase → feeds crowd-sourced AXS Rating

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
| **Content** | Spec + catalog + leaderboard + CLI + developer docs | Scanner + brand dashboard + agent management + gateway |
| **Revenue role** | Awareness + adoption + credibility | Revenue engine (scans, subscriptions, gateway) |

shopy.sh = front door + open standard. creditclaw.com = commercial engine behind it.

**The flywheel:**
Merchant discovers shopy.sh → checks ASX Score → understands improvements → adopts standard (or pays CreditClaw) → skill published → agent devs install → agents shop → POST feedback → AXS Rating improves → better ratings attract traffic → merchant sees ROI → upgrades to premium

## Routes (Current)

| Route | Purpose |
|-------|---------|
| `/` | Landing — ASX Score search bar, recent scores leaderboard |
| `/agentic-shopping-score` | Scanner tool |
| `/standard` | Agentic commerce standard spec (custom markdown renderer, sticky TOC sidebar) |
| `/guide` | Non-technical merchant explainer (6 sections, CSS-only flow diagram, checklist) |
| `/axs` | Scoring methodology |

Shopy docs: `/docs/shopy/...` — Getting Started, CLI, Skill Format, Agent Integration.

**Planned routes (not yet built):**
`/catalog`, `/catalog/[vendor]`, `/sectors`, `/leaderboard`, `/submit`, `/docs/gateway`

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

## Technical Implementation

Runs on same codebase + database as creditclaw.com via multitenant system. Middleware resolves domain → loads tenant config → renders accordingly.

Key considerations:
- **Route-level separation** — some pages unique per tenant (`/standard` on shopy.sh, `/agentic-shopping-score` on creditclaw.com). Goes beyond feature flags — needs tenant-aware route groups or conditional page rendering
- **Shared data, different framing** — both read from `brand_index` table. shopy.sh shows install commands + spec fields (dev-focused). creditclaw.com shows scores + recommendations (merchant-focused). Same data, different components
- **Navigation** — each brand owns its nav structure, footer, header via tenant config

## Open Questions

1. **npm package name** — is `shopy` available? Alternatives: `@shopy/cli`, `shopy-skills`
2. **Separate codebase or shared?** — separate = more legitimacy as open standard. Shared = simpler to maintain, single DB. Currently shared.
3. **Community contributions** — should third parties submit skills? Auto-validate frontmatter schema + manual review? Or fully automated with quality scoring?
4. **GitHub presence** — should spec live in a public repo (like `vercel/skills`)? Signals openness, invites contributions
5. **Skill signing** — cryptographic verification of skill authenticity to prevent tampering?
6. **Versioning** — semantic versioning in frontmatter? Auto-increment on re-scan? Breaking vs non-breaking changes?
7. **Pricing** — fully free catalog or some skills (Tier 2/3 quality) behind paywall/API key?

## Key Files

| File | Purpose |
|------|---------|
| `components/tenants/shopy/landing.tsx` | Landing page |
| `components/tenants/shopy/how-it-works.tsx` | How it works page |
| `lib/tenants/tenant-configs.ts` | Tenant config (shopy section) |
| `public/tenants/shopy/config.json` | Dynamic config |
| `content/agentic-commerce-standard.md` | The spec source |
