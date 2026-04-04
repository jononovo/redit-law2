# SKILL.md Structure

A shopy.sh commerce skill is a markdown file with YAML frontmatter. It follows the skills.sh format established by Vercel, extended with commerce-specific fields.

## File layout

```
---
name: Amazon
description: Shopping skill for Amazon.com
version: 1.0.0
metadata:
  vendor_domain: amazon.com
  vendor_slug: amazon
  sector: multi-sector
  brand_type: mega_merchant
  asx_score: 82
  axs_rating: 4.2
  # ... additional commerce fields
---

# Amazon Shopping Skill

## Product Discovery
How to search and browse products...

## Product Detail
How to read product pages...

## Cart Operations
How to add items, update quantities, remove items...

## Checkout Flow
Step-by-step checkout instructions...

## Post-Purchase
Order confirmation, tracking, returns...

## Known Limitations
What doesn't work or requires workarounds...

## Error Handling
Common errors and recovery strategies...

## Feedback
Instructions for the agent to submit ratings...
```

## Required sections

Every commerce skill should include these sections in order:

| Section | Purpose |
|---|---|
| Product Discovery | How the agent searches and browses the catalog |
| Product Detail | How to read individual product pages |
| Cart Operations | Adding, updating, and removing cart items |
| Checkout Flow | Step-by-step purchase completion |
| Known Limitations | Honest disclosure of what doesn't work |
| Error Handling | Recovery strategies for common failures |
| Feedback | Rating submission instructions |

## Optional sections

- **Post-Purchase** — order tracking, returns, customer service
- **Loyalty Programs** — how agent purchases interact with rewards
- **API Access** — if the vendor has a programmatic API
