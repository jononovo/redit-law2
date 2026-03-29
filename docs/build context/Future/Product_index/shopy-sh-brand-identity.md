# shopy.sh — Brand Identity & Product Definition

## What shopy.sh Is

shopy.sh is an open standard and platform that makes online stores discoverable and shoppable by AI agents. It extends Vercel's skills.sh format with commerce-specific metadata — turning a plain SKILL.md file into a complete procurement instruction set that any AI agent can read and execute.

Think of it as **the open standard for agentic commerce** — the bridge between merchants who sell online and the AI agents that are starting to buy.

For merchants, it answers: "How do AI agents find and buy from my store?" For agent developers, it answers: "How do I teach my agent to shop at any store?"

## Who It's For

### Primary audience: Merchants and the people who run their stores

- **Developers managing merchant sites** — the engineers and agencies building and maintaining e-commerce platforms. They need to understand what makes a store agent-friendly and how to implement the metadata standard.
- **CTOs of fashion, retail, and e-commerce brands** — technical leaders who need to ensure their stores are discoverable by the next generation of shopping interfaces (AI agents, not just browsers).
- **E-commerce and marketing professionals** — people responsible for product discovery and conversion who need to understand this new channel. If SEO was about being found by Google, shopy.sh is about being found by ChatGPT, Claude, and Gemini.

These are the people who care about their ASX Score, who want to see how their store compares, and who will adopt the metadata standard to make their products more discoverable.

### Secondary audience: Agent developers

Developers building AI agents that need to buy things — personal shopping assistants, corporate procurement bots, inventory management systems, comparison engines. They use the shopy.sh catalog and CLI to install skills that teach their agents how to shop at specific stores. They care about the spec, the install experience, and the quality/reliability of skills.

### Tertiary audience: The agent platform ecosystem

Platform builders (OpenAI, Anthropic, Google, open-source agent frameworks) who want standardized commerce capabilities for their agents. shopy.sh gives them a single format to ingest rather than building custom integrations per merchant.

## The One-Liner

**"Make your store shoppable by AI agents."**

Alternative framings:
- "The open standard for agentic commerce."
- "Get found by AI shopping agents."
- "SEO was for search engines. shopy.sh is for shopping agents."

For the developer/CLI angle:
- "Install shopping skills for your AI agent."
- "The package manager for commerce skills."

## How It Works

### For Merchants

1. Your store gets scanned (via CreditClaw or self-service)
2. A SKILL.md file is generated in the shopy.sh format — it describes how agents can search, browse, cart, and check out at your store
3. The skill is published to the shopy.sh catalog
4. AI agents discover your store through the catalog, the CLI, or direct install
5. Agents shop at your store, and their feedback feeds back into your ASX Score and AXS Rating

### For Agent Developers (CLI)

### Install a skill

```bash
npx shopy add amazon
```

This downloads `amazon.md` (a SKILL.md file in the shopy.sh commerce format) into the agent's skill directory. The file contains everything the agent needs: how to search Amazon, how to read product pages, how to add to cart, how to check out, what payment methods work, what fails, and what to do when it fails.

### Install multiple skills

```bash
npx shopy add amazon walmart staples grainger
```

### Install by sector

```bash
npx shopy add --sector office
npx shopy add --sector electronics
```

### Search for skills

```bash
npx shopy search "office supplies"
npx shopy search "industrial safety equipment"
```

### Update skills

```bash
npx shopy update
```

Skills get stale — stores change their checkout flows, APIs get updated, new payment methods appear. `shopy update` pulls the latest versions.

### List installed skills

```bash
npx shopy list
```

### Compatibility

shopy.sh skills are valid SKILL.md files. Any agent that supports the skills.sh format (Claude Code, Cursor, Copilot, Windsurf, Gemini, custom agents) can load them without modification. The commerce-specific metadata lives inside the `metadata` map, which skills.sh already supports as arbitrary key-value pairs.

## The Specification

The shopy.sh specification defines:

1. **Commerce frontmatter fields** — structured metadata that sits in the YAML frontmatter of a SKILL.md file. Covers: vendor identity, taxonomy, ASX Score, AXS Rating, API access tiers, checkout capabilities, shipping options, payment methods, loyalty programs, and distribution status. Full field reference is in `agentic-commerce-standard.md` Part 1.

2. **Skill body structure** — recommended markdown structure for the body of a commerce skill: Product Discovery → Product Detail → Cart Operations → Checkout Flow → Post-Purchase → Known Limitations → Error Handling → Feedback.

3. **Scoring fields** — ASX Score (automated, 0-100) and AXS Rating (crowd-sourced, 1-5) embedded in every skill's frontmatter so agents can assess merchant reliability before shopping.

4. **Feedback protocol** — every skill includes a feedback section at the end instructing the agent to POST three ratings after each purchase attempt. This is how the crowd-sourced AXS Rating gets populated.

## The Catalog

shopy.sh hosts a searchable catalog of all published commerce skills. This is similar to npmjs.com for packages or skills.sh's skill directory.

Every skill in the catalog shows:
- Vendor name, domain, sector
- ASX Score with signal breakdown
- AXS Rating with feedback count
- API access tier (open / keyed / partnered / private)
- Checkout capabilities (guest checkout, payment methods, shipping options)
- Skill quality (who generated it, when it was last verified, verification status)
- Download / install command

## Brand Voice

**Tone:** Clear, authoritative, practical. Speaks to technical e-commerce professionals — people who understand SEO, structured data, and APIs, but aren't necessarily writing code every day. Think Shopify's partner docs or Stripe's merchant guides — professional and specific without being impenetrable.

When speaking to the merchant/CTO audience:
- "Make your store discoverable by AI shopping agents" not "Empower your agent with capabilities"
- "Your ASX Score is 74/100 — here's what to improve" not "Achieve a strong agent readiness profile"
- "Agents can't find your products because you're missing structured data" not "Optimize your agentic commerce metadata layer"
- "SEO made you findable by Google. shopy.sh makes you findable by ChatGPT." not "Revolutionize your discoverability paradigm"

When speaking to the developer audience:
- "Run `npx shopy add amazon`" not "Get started by exploring our catalog"
- "The skill tells your agent how to search, cart, and checkout" not "Seamlessly integrate commerce workflows"

**Visual identity (initial direction):**
- Clean, modern typography — professional but with a technical edge
- The `.sh` in the name signals technical credibility — lean into that
- Minimal color palette — black/white/one accent color
- Data-forward design — scores, charts, comparisons front and center

## shopy.sh vs creditclaw.com

| | shopy.sh | creditclaw.com |
|---|---|---|
| **Audience** | Merchant dev teams, CTOs, e-commerce professionals + agent developers | Brand owners, procurement teams, agent operators |
| **Question it answers** | "How do AI agents find and buy from my store?" | "How do I use AI agents to buy for my business?" |
| **Primary action** | Check your store's score, read the spec, browse the catalog | Scan a domain, manage your brand, configure your agent |
| **Tone** | Open standard / technical authority | Commercial platform / product marketing |
| **Content** | Specification + catalog + leaderboard + CLI + developer docs | Scanner tool + brand dashboard + agent management + gateway |
| **Open/closed** | Open standard, open catalog, community contributions | Commercial platform with free and paid tiers |
| **Revenue role** | Awareness + adoption + credibility as a standards body | Revenue engine (scans, subscriptions, gateway) |

### The Flywheel

```
Merchant learns about agentic commerce via shopy.sh
  → checks their ASX Score
    → understands what to improve
      → adopts the metadata standard (or pays CreditClaw to do it)
        → skill is published to shopy.sh catalog
          → agent developers install the skill
            → agents shop at the merchant
              → agents POST feedback → AXS Rating improves
                → better ratings attract more agent traffic
                  → merchant sees ROI → upgrades to premium / full index
```

shopy.sh is the front door and the open standard. creditclaw.com is the commercial engine behind it. Merchants discover the standard through shopy.sh and implement it through CreditClaw's services.

## Website Structure

| Route | Purpose |
|---|---|
| `/` | Landing page — what shopy.sh is, install instructions, quick start |
| `/spec` | Full specification — frontmatter fields, body structure, validation rules |
| `/catalog` | Searchable directory of all published commerce skills |
| `/catalog/[vendor]` | Individual skill page — metadata, scores, download |
| `/sectors` | Browse skills by sector |
| `/leaderboard` | Top-rated vendors by ASX Score and AXS Rating |
| `/submit` | Submit new skills (community contributions) |
| `/docs` | Integration guide for agent developers |
| `/docs/gateway` | CreditClaw gateway documentation (for skills that route through the gateway) |

## Open Questions

1. **Separate codebase or shared?** shopy.sh could be a separate Next.js site on its own domain, or a section within creditclaw.com served via domain routing. Separate site = more legitimacy as an open standard. Shared site = simpler to maintain, single database.

2. **npm package name.** Is `shopy` available on npm? Alternatives: `@shopy/cli`, `shopy-skills`.

3. **Community contributions.** Should third parties submit skills? If yes, what's the review process? Auto-validate frontmatter schema + manual review of body content? Or fully automated with quality scoring?

4. **GitHub presence.** Should the spec live in a public GitHub repo (like `vercel/skills`)? This signals openness and invites contributions.

5. **Skill signing.** Should CreditClaw cryptographically sign skills so agents can verify authenticity? Prevents tampered skill files.

6. **Versioning.** How do skill versions work? Semantic versioning in the frontmatter? Auto-increment on re-scan? Breaking vs. non-breaking changes?

7. **Pricing for catalog access.** Is the catalog fully free? Or are some skills (Tier 2/3 quality) behind a paywall or API key?

---

## Technical Implementation

shopy.sh will run on the same codebase and database as creditclaw.com using the multitenant system described in `multitenant-system-nextjs-implementation-plan.md`. Middleware resolves the requesting domain, loads the tenant config, and the rest of the app renders accordingly — different branding, navigation, landing page, metadata, and feature visibility, all from a single deployment.

Key considerations for shopy.sh as a tenant:
- **Route-level separation.** Some pages are unique to each brand (`/spec` on shopy.sh, `/agentic-shopping-score` on creditclaw.com). This goes beyond feature flags — tenant-aware route groups or conditional page rendering will be needed.
- **Shared data, different framing.** Both brands read from the same `brand_index` table. The catalog on shopy.sh shows install commands and spec fields (developer-focused). The catalog on creditclaw.com shows scores and recommendations (merchant-focused). Same data, different components.
- **Navigation.** Each brand has its own nav structure, footer, and header — driven by the tenant config.
