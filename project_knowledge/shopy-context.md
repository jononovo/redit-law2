---
name: shopy.sh + brands.sh Context
description: Standards landscape, protocols, and taxonomy systems relevant to the scanner and registry. Reference doc for strategic decisions — not required for day-to-day work.
---

# shopy.sh + brands.sh Context

## Standards Landscape

The agentic commerce space is early. Multiple competing standards exist, none dominant yet. Our approach: support detection of all major protocols during scans, but don't depend on any single one.

### Agentic Commerce Protocol (ACP)

- Stripe's protocol for agent-to-merchant transactions
- Structured metadata format for merchant capabilities
- We probe for `.well-known/acp.json` on merchant domains during scans
- Detected as a `CheckoutMethod` in our scoring system

### Universal Commerce Protocol (UCP)

- Google's approach to agent commerce
- A2A (Agent-to-Agent) as the transport layer
- Restricted access, Google ecosystem
- We track it but don't depend on it

### x402 Protocol

- HTTP `402 Payment Required` for autonomous payments
- Agent hits 402, gets cryptographic signature, resubmits with `X-PAYMENT` header
- Built on EIP-3009/EIP-712 signatures (Base chain, USDC)
- We have an implementation (`lib/x402/`) but it's a payment rail, not a discovery standard

### Model Context Protocol (MCP)

- Anthropic's open standard for connecting AI to external tools
- We probe for `mcp_endpoint` during scans and score it (4pts in Discoverability pillar)
- "Coming soon" for our own MCP integration

### Agent Skills Standard

- Open spec (Anthropic, Microsoft, OpenAI, GitHub, Cursor)
- YAML frontmatter + markdown instructions
- Our SKILL.md extends this with commerce-specific fields (checkout flow, payment methods, product categories)
- skill.json is the machine-readable companion for programmatic discovery

## Google Product Taxonomy

The backbone of our category system:
- ~5,600 categories in a three-layer tree: Sector → Category → Sub-Category
- Format: `{numericId} - {Level1} > {Level2} > ... > {LeafCategory}`
- We use 28 sectors: 21 from Google + 6 custom + `multi-sector` (department stores, supermarkets)
- 43 custom category entries for non-Google sectors
- Category keywords map natural language queries to taxonomy IDs for the recommend API

## Competitive Landscape

| Approach | Who | Limitation |
|----------|-----|-----------|
| Platform-native MCP | Shopify | Shopify stores only |
| Universal Commerce Protocol | Google | Restricted access, Google-dependent |
| Stripe ACP | Stripe | Requires merchant-side Stripe integration |
| Our approach | shopy/brands | Platform-agnostic, works for any store, no merchant integration needed |

## Key Insight

Most competing approaches require the merchant to integrate something. Our scanner works *without* merchant cooperation — we evaluate their existing site and generate skills from what's publicly available. This means we can scale the catalog independently of merchant adoption.
