# Submitting a Supplier

If you've found a vendor you'd like your bot to shop at but it's not in the Supplier Hub yet, you can submit it for review. The submission process is simple — just provide the vendor's URL and CreditClaw handles the rest.

## How to Submit

1. Navigate to **Skills → Submit** in the dashboard (or go to `/skill-builder/submit`)
2. Enter the vendor's website URL in the submission field
3. Click **Submit**

That's it. The system will automatically:

- Analyze the vendor's website
- Detect supported checkout methods and capabilities
- Generate a draft skill package
- Queue it for review

You'll see a confirmation with the vendor name once the submission is processed.

## Tracking Your Submissions

The submission page shows all your past submissions with their current status:

| Status | Meaning |
|--------|---------|
| **Under Review** | Your submission has been received and is being analyzed or awaiting reviewer attention |
| **Reviewed** | A reviewer has examined the generated skill and it's being finalized |
| **Published** | The skill is live in the Supplier Hub and available for all bots |
| **Rejected** | The submission couldn't be turned into a working skill (see below for common reasons) |

## Your Submission Profile

The submission page also shows your contributor stats:

- **Skills Submitted** — Total number of vendor URLs you've submitted
- **Skills Published** — How many of your submissions became published skills
- **Skills Rejected** — Submissions that didn't make it through review

## Why a Submission Might Be Rejected

Common reasons for rejection include:

- **Site blocks automated access** — The vendor's website actively prevents bot interactions
- **No viable checkout method** — The vendor doesn't support any checkout flow compatible with CreditClaw
- **Duplicate** — A skill for this vendor already exists in the catalog
- **Insufficient information** — The analysis couldn't extract enough data to create a useful skill

## Tips for Good Submissions

- **Submit the vendor's main homepage** — Not a specific product page
- **Check the Supplier Hub first** — Make sure the vendor isn't already listed at `/skills`
- **Choose established vendors** — Sites with well-structured product catalogs and standard checkout flows are more likely to produce good skills
- **Consider the checkout experience** — Vendors with guest checkout and clear product URLs tend to work best

## Submission vs. Skill Builder

There are two ways to add vendors to CreditClaw:

| | Submitting a Supplier | Skill Builder |
|---|---|---|
| **Who** | Any logged-in user | Reviewers and administrators |
| **Effort** | Just paste a URL | Review and verify the generated skill |
| **Control** | No editing — submit and wait | Full control over the skill package |
| **Best for** | Requesting a vendor you want supported | Building and fine-tuning skills |

If you just want to request a vendor, use the submission flow. If you want to create and manage skills directly, use the [Skill Builder](/docs/skills/skill-builder).

## Next Steps

- [What Are Skills](/docs/skills/what-are-skills) — Learn more about how procurement skills work
- [Browsing the Supplier Hub](/docs/skills/browsing-skills) — See the full catalog of available vendors
