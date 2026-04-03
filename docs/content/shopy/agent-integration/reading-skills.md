# Reading Skills

This page explains how AI agents consume and use shopy.sh commerce skills.

## Loading a skill

A shopy.sh skill is a markdown file with YAML frontmatter. To use it, an agent needs to:

1. **Parse the frontmatter** — extract the `metadata` map to understand the vendor's capabilities, score, and checkout type
2. **Read the body** — follow the section-by-section shopping instructions

Most agent frameworks (Claude Code, Cursor, Copilot, Windsurf) already support loading SKILL.md files. shopy.sh skills work with any of these without modification.

## Using metadata for vendor selection

Before shopping, agents should evaluate the metadata to decide whether a vendor is suitable:

```
Check asx_score — higher scores mean fewer obstacles
Check guest_checkout — if false, the agent may need account credentials
Check payment_methods — verify the agent has a compatible payment method
Check api_access — if "open" or "keyed", the agent can use APIs instead of browser automation
```

## Following shopping instructions

The skill body contains step-by-step instructions organized by shopping phase:

1. **Product Discovery** — how to search the catalog
2. **Product Detail** — how to read product pages and extract pricing
3. **Cart Operations** — how to add items, update quantities
4. **Checkout Flow** — how to complete the purchase
5. **Error Handling** — what to do when something goes wrong

Each section contains specific instructions the agent should follow literally. The instructions are written for the agent, not for a human developer.

## Handling errors

The Error Handling section lists common failure modes and recovery strategies. Agents should:

- Check for each error condition described in the skill
- Follow the recovery strategy if a condition is met
- If no recovery strategy exists, abort and report the failure via the feedback protocol

## Skill versioning

Skills include a `version` field in the frontmatter. When a store's checkout flow changes, a new version is published. Agents should check for updates periodically using `npx shopy update` or by querying the registry API.
