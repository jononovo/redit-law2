# shopy.sh — Brand Identity & Product Definition

## What shopy.sh Is

shopy.sh is an open-source developer tool and specification for teaching AI agents how to shop online. It extends Vercel's skills.sh format with commerce-specific metadata — turning a plain SKILL.md file into a complete procurement instruction set that any AI agent can read and execute.

Think of it as **skills.sh for commerce**.

skills.sh teaches agents how to use developer tools (deploy code, manage infrastructure, query databases). shopy.sh teaches agents how to shop (search products, compare prices, add to cart, check out, track orders).

## Who It's For

**Primary audience: AI agent developers.**

Anyone building an AI agent that needs to buy things — whether that's a personal shopping assistant, a corporate procurement bot, an inventory management system, or a comparison engine. These developers need a standardized way to tell their agent: "here's how you shop at Amazon" or "here's how you buy office supplies from Staples."

**Secondary audience: The agent ecosystem.**

Platform builders (OpenAI, Anthropic, Google, open-source agent frameworks) who want their agents to have built-in shopping capabilities. shopy.sh gives them a standard format to ingest rather than building custom integrations per merchant.

**Not the primary audience: Merchants.**

Merchants benefit from shopy.sh (their store becomes agent-discoverable), but they interact with shopy.sh through CreditClaw's services (scans, enrichment, distribution), not directly. A merchant who wants to improve their agent shopping experience goes to creditclaw.com. A developer who wants to install a shopping skill goes to shopy.sh.

## The One-Liner

**"Install shopping skills for your AI agent."**

Alternative framings:
- "Teach your agent how to shop."
- "The package manager for commerce skills."
- "npm install, but for shopping."

## How It Works (Developer Experience)

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

**Tone:** Technical, concise, no-nonsense. Like Vercel's docs or Stripe's API reference. Assumes the reader is a developer who builds things. No marketing fluff, no "revolutionizing" or "disrupting."

**Language patterns:**
- "Install a skill" not "Empower your agent with capabilities"
- "Run `npx shopy add amazon`" not "Get started by exploring our catalog"
- "The skill tells your agent how to search, cart, and checkout" not "Seamlessly integrate commerce workflows"
- "ASX Score: 74/100" not "This merchant has achieved a strong agent readiness profile"

**Visual identity (initial direction):**
- Monospace typography for the logo/wordmark (like Vercel, linear.app)
- Terminal-inspired UI elements (command examples, code blocks)
- Minimal color palette — black/white/one accent color
- The `.sh` in the name already signals "developer tool" — lean into that

## shopy.sh vs creditclaw.com

| | shopy.sh | creditclaw.com |
|---|---|---|
| **Audience** | Agent developers | Merchants and brand owners |
| **Question it answers** | "How do I teach my agent to shop at X?" | "How agent-ready is my store?" |
| **Primary action** | Install a skill | Scan your domain |
| **Tone** | Developer docs | Product marketing |
| **Content** | Specification + catalog + CLI | Scanner tool + brand catalog + dashboard |
| **Open/closed** | Open standard, open catalog | Commercial platform |
| **Revenue role** | Distribution channel (drives awareness, adoption) | Revenue engine (scans, subscriptions, gateway) |

### The Flywheel

```
creditclaw.com scans a merchant
  → generates a SKILL.md in shopy.sh format
    → publishes to shopy.sh catalog
      → agent developers install the skill
        → agents shop at the merchant
          → agents POST feedback ratings
            → AXS Ratings improve
              → better skills attract more developers
                → more agent traffic for merchants
                  → merchants pay for premium scans / full index
```

CreditClaw is the engine. shopy.sh is the distribution layer. They reinforce each other but speak to different audiences.

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
