# Skill Builder

The Skill Builder is CreditClaw's tool for creating new procurement skills. It analyzes a vendor's website and automatically generates a skill package that teaches bots how to shop there. You can use it to add support for vendors that aren't yet in the Supplier Hub.

## Accessing the Skill Builder

You'll find the Skill Builder in the dashboard under **Skills → Review**. You need to be logged in as an owner to access it. Administrators and reviewers can use the builder to create, review, and publish new skills.

## How It Works

The Skill Builder uses a multi-step process:

1. **Submit a vendor URL** — Provide the homepage URL of the vendor you want to add
2. **Automated analysis** — The builder fetches the vendor's site, runs probes to detect checkout methods, capabilities, and search patterns
3. **Review the draft** — Examine the generated skill package and make corrections
4. **Publish** — Once the skill looks correct, publish it to the Supplier Hub

## The Analysis Process

When you submit a vendor URL, the Skill Builder:

- **Fetches the vendor's site** to understand its structure
- **Detects checkout methods** — Does the site have an API? Support guest checkout? Accept crypto?
- **Identifies capabilities** — Price lookup, stock checking, order tracking, returns handling, bulk pricing, and more
- **Maps search patterns** — How products are found and identified on the site
- **Generates shipping info** — Free shipping thresholds, estimated delivery windows
- **Produces tips** — Best practices specific to this vendor

The analysis assigns confidence scores to each detected feature, so reviewers know which parts of the skill may need manual verification.

## Reviewing a Draft

After analysis, the skill appears as a draft. The review interface shows:

- **Vendor details** — Name, URL, category, and basic info
- **Detected checkout methods** — With confidence scores and configuration notes
- **Capabilities** — Which features were detected, with review flags for low-confidence items
- **Generated files** — The full skill package including `skill.json`, `description.md`, and payment method documentation

### Review Flags

Items marked for review have lower confidence scores and should be manually verified. Common review flags include:

- Checkout methods that couldn't be fully confirmed
- Capabilities inferred from site structure but not tested
- Shipping information estimated from limited data

## Publishing a Skill

Once you've reviewed a draft and are satisfied with its accuracy:

1. Open the draft from the review queue
2. Verify all flagged items
3. Click **Publish** to make the skill available in the Supplier Hub

Published skills start at the **Community** maturity level. The CreditClaw team can later promote them to **Beta** or **Verified** after additional testing.

## Skill Versioning

Skills support versioning so they can be updated as vendors change their sites:

- Each update creates a new version with a diff showing what changed
- Previous versions are preserved for reference
- You can roll back to a previous version if an update causes issues

View version history and diffs from the skill's detail page in the review interface.

## Exporting Skills

Skills can be exported as downloadable packages for use outside of CreditClaw or for backup purposes. The export includes all files in the skill package — the JSON configuration, description, and payment method documentation.

## Next Steps

- [Submitting a Supplier](/docs/skills/submitting-a-supplier) — The simpler path: just submit a URL and let the community handle the rest
- [Browsing the Supplier Hub](/docs/skills/browsing-skills) — See what skills are already available
