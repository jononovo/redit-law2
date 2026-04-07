# ASX Score Explained

The ASX Score (Agentic Shopping Experience Score) is a 0–100 score that measures how well an online store supports AI shopping agents. It's computed by scanning a store's website for 11 specific signals.

## The three pillars

### Clarity (up to 35 points)

Can the agent understand the product catalog?

| Signal | Max Points | What it measures |
|---|---|---|
| JSON-LD / Structured Data | 15 | Product schema markup that agents can parse directly |
| Product Feed / Sitemap | 10 | Structured sitemap with product URLs for catalog discovery |
| Clean HTML / Semantic Markup | 10 | Well-structured DOM with semantic elements |

### Discoverability (up to 30 points)

Can the agent find and evaluate products?

| Signal | Max Points | What it measures |
|---|---|---|
| Search API / MCP | 10 | Programmatic API or MCP endpoint for product queries |
| Internal Site Search | 10 | On-site search that returns relevant results |
| Page Load Performance | 5 | Fast initial load for headless agent browsing |
| Product Page Quality | 5 | Machine-readable pricing, variant selectors, direct URLs |

### Reliability (up to 35 points)

Can the agent complete a purchase?

| Signal | Max Points | What it measures |
|---|---|---|
| Access & Authentication | 10 | Guest checkout available, no mandatory registration walls |
| Order Management | 10 | Clear variant selection, cart management, shipping details |
| Checkout Flow | 10 | Discoverable discount fields, labeled payment and shipping options |
| Bot Tolerance | 5 | No aggressive CAPTCHAs blocking agent interaction |

## How the scan works

1. An AI agent visits the store's homepage and a sample of product pages
2. Each of the 11 signals is evaluated and scored
3. Scores are summed across all three pillars
4. The total ASX Score is reported with a per-signal breakdown

## Score interpretation

| Range | Label | Meaning |
|---|---|---|
| 80–100 | Excellent | Store is highly agent-ready. Agents can discover, browse, and purchase with minimal friction. |
| 60–79 | Good | Store supports basic agent interactions but has gaps in some areas. |
| 40–59 | Fair | Agents can find products but face significant obstacles in checkout or discovery. |
| 0–39 | Needs work | Store is largely inaccessible to AI shopping agents. |

## Rescanning

ASX Scores are point-in-time snapshots. As a store improves its agent-readiness (adding structured data, fixing checkout flows, improving search), it can be rescanned to generate an updated score.
