# Skill Feedback Loop — Technical Spec

## The idea

Every agent that shops at a brand reads that brand's SKILL.md first. That's a guaranteed touchpoint. The skill file already tells the agent how to search, how to checkout, and how to track orders. We add one more step at the end: "tell us how it went."

The feedback endpoint is described directly in the skill markdown — no SDK, no special integration. The agent reads the instruction and POSTs three ratings. Same way it follows every other instruction in the skill.

For humans, the same data is collected via a prompt in the CreditClaw dashboard after a purchase completes.

Both sources feed into the brand's three-part rating (search accuracy, stock reliability, checkout completion) on the `brand_index` table.

---

## Agent feedback via SKILL.md

### What gets added to every generated skill

The `generateVendorSkill()` function in `lib/procurement-skills/generator.ts` appends a feedback section at the end of every SKILL.md:

```markdown
---

## Feedback

After your purchase attempt (successful or not), help improve this skill:

POST https://creditclaw.com/api/v1/bot/skills/{slug}/feedback
Authorization: Bearer <your-creditclaw-api-key>
Content-Type: application/json

{
  "search_accuracy": 4,
  "stock_reliability": 5,
  "checkout_completion": 3,
  "checkout_method": "browser_automation",
  "outcome": "success",
  "comment": "optional — what happened?"
}

Ratings are 1-5. Outcome is one of: success, checkout_failed, search_failed, out_of_stock, price_mismatch.
This is optional but helps other agents find reliable vendors.
```

This is plain text instructions. The agent reads it, decides whether to follow it (just like any other optional step), and submits a POST. Agents that use CreditClaw for payment already have an API key. Agents that don't can submit without auth — the endpoint accepts both authenticated and unauthenticated submissions, but authenticated ones carry more weight in the rating calculation.

### Why this works

Agents are instruction followers. A well-written skill file is a checklist: search → find product → add to cart → checkout → confirm. Adding "report back" as the final step is natural. The agent doesn't need to know about the rating system or the brand index — it just sees "POST these numbers to this URL" and does it.

The friction is near zero: three integers, a string, and an optional comment. An agent can construct this payload in one line. There's no form to fill out, no OAuth flow, no callback to register.

---

## API endpoint

### `POST /api/v1/bot/skills/{slug}/feedback`

**Auth:** Optional. If a valid CreditClaw bot API key is provided, the feedback is tagged as authenticated (higher weight). If not, it's accepted as anonymous (lower weight).

**Request body:**

```json
{
  "search_accuracy": 4,
  "stock_reliability": 5,
  "checkout_completion": 3,
  "checkout_method": "browser_automation",
  "outcome": "success",
  "comment": "Cart page took 30 seconds to load but checkout completed"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `search_accuracy` | integer 1-5 | yes | Did the agent find the right product at the right price? |
| `stock_reliability` | integer 1-5 | yes | Was the product actually in stock? |
| `checkout_completion` | integer 1-5 | yes | Did the purchase go through? |
| `checkout_method` | string | yes | Which method was used. Enum: `native_api`, `browser_automation`, `x402_protocol`, `acp`, `self_hosted_card` |
| `outcome` | string | yes | What happened. Enum: `success`, `checkout_failed`, `search_failed`, `out_of_stock`, `price_mismatch`, `flow_changed` |
| `comment` | string | no | Freeform, max 500 chars. |

**Response:**

```json
{
  "received": true,
  "brand_slug": "staples",
  "message": "Thanks — this feedback improves the skill for all agents."
}
```

**Validation:**
- All three ratings must be integers 1-5.
- `checkout_method` must match the enum.
- `outcome` must match the enum.
- `brand_slug` from the URL must exist in `brand_index`.
- Rate limited: max 1 feedback per brand per bot per hour (prevents spam from loops).

**What happens on receipt:**
1. Insert a row into `brand_feedback` table.
2. If the submission is authenticated (valid API key), extract `bot_id` from the key. If not, store as `anonymous`.
3. Do NOT recompute ratings synchronously — that's a periodic job.

---

## Database

### `brand_feedback` table

```sql
CREATE TABLE brand_feedback (
  id                    serial PRIMARY KEY,
  brand_slug            text NOT NULL,
  source                text NOT NULL DEFAULT 'agent',  -- agent, human
  authenticated         boolean NOT NULL DEFAULT false,  -- had a valid API key / was logged in
  bot_id                text,               -- null if anonymous or human
  reviewer_uid          text,               -- null if anonymous agent
  search_accuracy       integer NOT NULL,   -- 1-5
  stock_reliability     integer NOT NULL,   -- 1-5
  checkout_completion   integer NOT NULL,   -- 1-5
  checkout_method       text NOT NULL,
  outcome               text NOT NULL,
  comment               text,
  created_at            timestamp NOT NULL DEFAULT now()
);

CREATE INDEX brand_feedback_slug_idx ON brand_feedback (brand_slug);
CREATE INDEX brand_feedback_created_idx ON brand_feedback (created_at);
CREATE INDEX brand_feedback_slug_recent_idx ON brand_feedback (brand_slug, created_at DESC);
```

This replaces the previously planned `brand_reviews` table (for human reviews) and `skill_feedback` table (for agent events). One table, both sources, same schema. The `source` column distinguishes agent from human. The `authenticated` column distinguishes verified from anonymous.

---

## Human feedback via dashboard

### After a purchase completes

When a checkout session completes through CreditClaw (any rail), the owner's dashboard shows a feedback prompt. This could be:

**Option A — inline prompt on the transactions page.** Next to the completed transaction, a small "Rate this purchase" link. Clicking it expands three star rating rows + an optional comment field. Submits to the same `/api/v1/bot/skills/{slug}/feedback` endpoint with `source: "human"`.

**Option B — post-purchase modal.** After the agent reports a successful checkout, the next time the owner visits the dashboard, a small non-blocking prompt appears: "Your agent bought from Staples. How did it go?" Three quick star rows, submit, done. Dismissable, doesn't block anything.

Either way, the data shape is identical to agent feedback. Same three ratings, same checkout method, same optional comment. The only difference is `source: "human"` and `reviewer_uid` is set instead of `bot_id`.

Human reviews carry slightly more weight in the aggregation (a human confirming the full end-to-end experience is a stronger signal than a single automated event).

---

## Rating aggregation

A periodic job (hourly or daily) recomputes brand ratings from the `brand_feedback` table.

### For each brand:

1. Pull all feedback rows from the last 90 days.
2. Apply recency weighting — feedback from this week counts more than feedback from two months ago.
3. Apply source weighting:
   - Authenticated agent feedback: weight 1.0
   - Anonymous agent feedback: weight 0.5
   - Human feedback: weight 2.0
4. For each sub-rating, compute the weighted average.
5. `rating_overall` = average of the three sub-ratings.
6. `rating_count` = total feedback events (raw count, not weighted).
7. Update the `brand_index` row:

```sql
UPDATE brand_index SET
  rating_search_accuracy = $1,
  rating_stock_reliability = $2,
  rating_checkout_completion = $3,
  rating_overall = $4,
  rating_count = $5,
  updated_at = now()
WHERE slug = $6;
```

### Minimum threshold

Ratings are only displayed (non-null) once a brand has at least 5 weighted feedback events. Below that, the columns stay null and the brand shows "Not yet rated." This prevents a single 1-star review from tanking a brand's score.

---

## How the comment field becomes valuable

Agent comments are terse and specific: "Price shown was $24.99, actual cart price was $29.99" or "Checkout button selector changed, automation failed." These are actionable for skill maintainers — they tell you exactly what broke.

Human comments provide context agents can't: "Ordered Monday, didn't ship until Friday even though it said 2-day delivery" or "The product arrived but was a different model than listed."

Over time, the comments on a brand become a changelog of real-world issues. A brand owner looking at their score can read the comments to understand *why* their stock reliability is 2.8 — not just that it's low.

---

## What this enables

### For agents choosing where to shop
Filter and sort by real-world performance, not just static capabilities. "Show me office supply brands with checkout completion above 4.0" is a query that only works if agents are reporting back.

### For brand owners
A clear dashboard showing exactly what's working and what isn't. "Your search accuracy is 4.7 but your stock reliability is 2.3 — agents keep finding products that aren't actually in stock." That's specific enough to act on.

### For CreditClaw
The feedback data reveals which brands need skill updates (low search accuracy = the skill's search instructions might be wrong), which checkout methods are unreliable (browser automation failing more than API), and which brands are improving or degrading over time.

### For the skill files themselves
If a brand's `checkout_completion` drops below a threshold, the skill generator could automatically add a warning: "Note: recent agents have reported checkout difficulties with this vendor. Consider using an alternative." The skill becomes self-aware of its own reliability.

---

## Implementation order

1. **`brand_feedback` table** — schema + migration.
2. **`POST /api/v1/bot/skills/{slug}/feedback` endpoint** — accepts feedback from agents and humans.
3. **Feedback section in `generateVendorSkill()`** — appends the feedback instructions to every SKILL.md. Pre-generated `skill_md` in `brand_index` gets regenerated.
4. **Rating columns on `brand_index`** — add the nullable columns (they stay null until step 5).
5. **Aggregation job** — periodic recomputation of ratings from feedback data.
6. **Human feedback UI** — dashboard prompt after completed purchases.
7. **Rating display** — show ratings on the catalog (requires Phase 5 catalog switchover to DB).
