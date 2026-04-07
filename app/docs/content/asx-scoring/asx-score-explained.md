# ASX Score

The ASX Score (Agentic Shopping Experience Score) is a 0–100 rating that measures how well an online store supports AI shopping agents. It's computed automatically by scanning a store's website for 11 specific signals — no account or integration required.

## How It Works

Enter any merchant domain at [/agentic-shopping-score](/agentic-shopping-score) and we'll scan the site for 11 signals across three pillars. The scan takes a few seconds and produces a score, a per-signal breakdown, and actionable recommendations for improvement.

Results are cached for 30 days. If the domain was scanned recently, you'll see the cached result immediately.

### The scan process

1. An AI agent visits the store's homepage and a sample of product pages
2. Each of the 11 signals is evaluated and scored
3. Scores are summed across all three pillars
4. The total ASX Score is reported with a per-signal breakdown

## The Three Pillars

### Clarity (up to 35 points) — Can agents understand the product catalog?

| Signal | Max Points | What We Check |
|---|---|---|
| JSON-LD / Structured Data | 15 | Product schema markup that agents can parse directly without rendering the page |
| Product Feed / Sitemap | 10 | Structured sitemap with product URLs for catalog discovery |
| Clean HTML / Semantic Markup | 10 | Well-structured DOM with semantic elements for reliable content extraction |

### Discoverability (up to 30 points) — Can agents find and evaluate products?

| Signal | Max Points | What We Check |
|---|---|---|
| Search API / MCP | 10 | Programmatic API or MCP endpoint for direct product queries |
| Internal Site Search | 10 | On-site search form that returns relevant results |
| Page Load Performance | 5 | Fast initial load time for headless agent browsing |
| Product Page Quality | 5 | Machine-readable pricing, variant selectors, direct URLs |

### Reliability (up to 35 points) — Can agents complete a purchase?

| Signal | Max Points | What We Check |
|---|---|---|
| Access & Authentication | 10 | Guest checkout available, no mandatory registration walls |
| Order Management | 10 | Clear variant selection, cart management, shipping details |
| Checkout Flow | 10 | Discoverable discount fields, labeled payment and shipping options |
| Bot Tolerance | 5 | No aggressive CAPTCHAs or bot-blocking on landing pages |

Sites with programmatic checkout (MCP, API, CLI) that cover product selection through payment receive full marks on Order Management and Checkout Flow automatically.

## Score Labels

| Range | Label | Meaning |
|---|---|---|
| 80–100 | Excellent | Store is highly agent-ready. Agents can discover, browse, and purchase with minimal friction. |
| 60–79 | Good | Store supports basic agent interactions but has gaps in some areas. |
| 40–59 | Fair | Agents can find products but face significant obstacles in checkout or discovery. |
| 0–39 | Needs Work | Store is largely inaccessible to AI shopping agents. |

## ASX Score vs AXS Rating

The ASX Score and the [AXS Rating](/axs) are complementary but separate:

- **ASX Score** — Automated scan of technical readiness. Measures what a site *should* support based on its implementation.
- **AXS Rating** — Crowdsourced from real agent and human interactions. Measures how a site *actually performs* in practice.

A site can have a high ASX Score (great technical setup) but a low AXS Rating (breaks in practice), or vice versa. Together they give the full picture.

## Rescanning

ASX Scores are point-in-time snapshots. As a store improves its agent-readiness (adding structured data, fixing checkout flows, improving search), it can be rescanned to generate an updated score.
