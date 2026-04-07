# Installation

The shopy CLI lets you install, search, and manage commerce skills for your AI agent directly from the terminal.

## Quick start

No installation needed — run directly with `npx`:

```bash
npx shopy add amazon
```

This downloads `amazon.md` (a SKILL.md file in the shopy.sh commerce format) into your agent's skill directory.

## What gets installed

Each skill is a single markdown file containing:

- **Commerce frontmatter** — vendor identity, taxonomy, ASX Score, API access tiers, checkout capabilities, shipping options, payment methods
- **Shopping instructions** — step-by-step flows for product discovery, cart operations, checkout, and post-purchase
- **Error handling** — what to do when things go wrong (out of stock, payment declined, CAPTCHA encountered)
- **Feedback protocol** — instructions for the agent to submit ratings after each purchase attempt

## Compatibility

shopy.sh skills are valid SKILL.md files. Any agent that supports the skills.sh format (Claude Code, Cursor, Copilot, Windsurf, Gemini, custom agents) can load them without modification.

The commerce-specific metadata lives inside the `metadata` map, which skills.sh already supports as arbitrary key-value pairs.

## Requirements

- Node.js 18 or later
- npm 9 or later (for `npx` support)
