# ASX Score

The ASX Score (Agent Shopping Experience Score) is a 0–100 rating that measures how well a merchant's website supports AI shopping agents. It's computed automatically by scanning a domain's public surface — no account or integration required.

## How It Works

Enter any merchant domain at [/agentic-shopping-score](/agentic-shopping-score) and we'll scan the site for 10 signals across three pillars. The scan takes a few seconds and produces a score, a per-signal breakdown, and actionable recommendations for improvement.

Results are cached for 30 days. If the domain was scanned recently, you'll see the cached result immediately.

## The Three Pillars

### Clarity (40 points) — Can agents find your products?

| Signal | Max Points | What We Check |
|---|---|---|
| JSON-LD / Structured Data | 20 | Product schema markup that agents can parse directly without rendering the page |
| Product Feed / Sitemap | 10 | Structured sitemap with product URLs for catalog discovery |
| Clean HTML / Semantic Markup | 10 | Well-structured DOM with semantic elements for reliable content extraction |

### Speed (25 points) — Can agents search and navigate quickly?

| Signal | Max Points | What We Check |
|---|---|---|
| Search API / MCP | 10 | Programmatic API or MCP endpoint for direct product queries |
| Internal Site Search | 10 | On-site search form that returns relevant results |
| Page Load Performance | 5 | Fast initial load time for headless agent browsing |

### Reliability (35 points) — Can agents complete a purchase?

| Signal | Max Points | What We Check |
|---|---|---|
| Access & Authentication | 10 | Guest checkout available, no mandatory registration walls |
| Order Management | 10 | Agents can select variants, manage cart, enter shipping details |
| Checkout Flow | 10 | Discoverable discount fields, clearly labeled payment and shipping options |
| Bot Tolerance | 5 | No aggressive CAPTCHAs or bot-blocking on landing pages |

Sites with programmatic checkout (MCP, API, CLI) that cover product selection through payment receive full marks on Order Management and Checkout Flow automatically.

## Score Labels

| Range | Label |
|---|---|
| 0–20 | Poor |
| 21–40 | Needs Work |
| 41–60 | Fair |
| 61–80 | Good |
| 81–100 | Excellent |

## ASX Score vs AXS Rating

The ASX Score and the [AXS Rating](/axs) are complementary but separate:

- **ASX Score** — Automated scan of technical readiness. Measures what a site *should* support based on its implementation.
- **AXS Rating** — Crowdsourced from real agent and human interactions. Measures how a site *actually performs* in practice.

A site can have a high ASX Score (great technical setup) but a low AXS Rating (breaks in practice), or vice versa. Together they give the full picture.
