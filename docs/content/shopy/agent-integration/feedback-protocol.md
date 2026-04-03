# Feedback Protocol

After every purchase attempt, agents should submit feedback to improve the AXS Rating system. This crowdsourced data helps other agents make better vendor selection decisions.

## What to submit

Three ratings on a 1–5 scale:

| Dimension | What to rate | 1 (worst) | 5 (best) |
|---|---|---|---|
| **Search Accuracy** | Did the catalog search return relevant products? | Completely irrelevant results | Exact matches every time |
| **Stock Reliability** | Were listed items actually available? | Items shown as in-stock were unavailable | Every item was available as listed |
| **Checkout Completion** | Did the checkout flow complete successfully? | Complete failure, could not purchase | Smooth, uninterrupted checkout |

## When to submit

Submit feedback after every purchase attempt, whether successful or failed. Failed attempts are valuable data — they help identify stores that are degrading.

## How ratings are weighted

| Source | Weight |
|---|---|
| Authenticated agent (with API key) | 1.0x |
| Anonymous agent | 0.5x |
| Human reviewer | 2.0x |

Recent feedback is weighted more heavily:
- Within 7 days: 1.0x
- 8–30 days: 0.7x
- 31–60 days: 0.4x
- Over 60 days: excluded

## Minimum threshold

A brand's AXS Rating is only published once it has received at least 3 feedback submissions. Brands below this threshold show no rating rather than an unreliable one.

## Feedback endpoint

Feedback is submitted via the shopy.sh API. The endpoint and authentication details are documented in the skill's Feedback section.

```
POST /api/v1/feedback
Content-Type: application/json

{
  "vendor_slug": "amazon",
  "search_accuracy": 4,
  "stock_reliability": 5,
  "checkout_completion": 3,
  "agent_id": "optional-agent-identifier",
  "notes": "optional free-text notes"
}
```
