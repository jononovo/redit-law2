# UCP & Google Product Taxonomy — Research Notes

**Date:** April 3, 2026
**Context:** Before implementing Step 6 (UCP Taxonomy), researched how Google Product Taxonomy actually works in merchant feeds, how UCP handles product discovery, and whether our skill.json category schema is overengineered.

---

## Key Findings

### 1. Google Product Taxonomy — It's Just "ID - Path"

The actual Google taxonomy file (`taxonomy-with-ids.en-US.txt`) is dead simple. Every line is:

```
{numericId} - {Level1} > {Level2} > ... > {LeafCategory}
```

Examples:
```
1 - Animals & Pet Supplies
3237 - Animals & Pet Supplies > Live Animals
222 - Electronics
278 - Electronics > Computers
331 - Electronics > Computers > Computer Components
```

That's it. An ID and a path string. No separate `depth` field, no `name` field split from the path — those are derivable. The leaf name is just the last segment of the path.

**In Google Merchant Center feeds**, merchants submit the `google_product_category` attribute as **either** the numeric ID **or** the full path, never both:

```xml
<g:google_product_category>222</g:google_product_category>
<!-- or -->
<g:google_product_category>Electronics > Computers > Laptops</g:google_product_category>
```

**Industry best practice:** Use the numeric ID for programmatic feeds (shorter, locale-independent, stable). The path is for human readability.

### 2. Our skill.json Schema IS Overengineered

Our current spec in `skill-json-schema.md` defines each category as:

```json
{
  "gptId": 141,
  "name": "Cameras & Optics",
  "path": "Cameras & Optics",
  "depth": 1,
  "primary": true
}
```

Five fields per category. But Google itself just uses `ID` or `path`. The `name` is redundant (it's the last segment of path). The `depth` is redundant (count the `>` separators). The `primary` flag adds complexity that agents don't need for discovery.

**A simpler approach — just the ID:**

```json
"taxonomy": {
  "sector": "electronics",
  "tier": "mid-range",
  "googleProductCategories": [141, 149, 152, 223, 278]
}
```

The agent looks up what `141` means from the shared taxonomy tree (which we host). This matches how Google Merchant Center works — the ID is the reference, the path is looked up from the canonical tree.

**Or, if we want human readability without a lookup:**

```json
"taxonomy": {
  "sector": "electronics",
  "tier": "mid-range",
  "googleProductCategories": [
    "141 - Cameras & Optics",
    "149 - Cameras & Optics > Camera Lenses",
    "223 - Electronics > Audio",
    "278 - Electronics > Computers"
  ]
}
```

This mirrors Google's own file format exactly. Each entry is self-describing. An agent can parse the ID (split on ` - `) or use the path for display. No separate fields needed.

### 3. UCP (Universal Commerce Protocol) — Google's New Standard

UCP launched January 2026, backed by Google, Shopify, Target, Walmart, Stripe, Visa, and 20+ others. It's the emerging standard for agent-to-merchant commerce.

**Key facts:**
- Merchants publish a `/.well-known/ucp` manifest declaring capabilities (checkout, catalog, orders)
- The **Catalog capability** allows agents to search/browse merchant product catalogs
- Products have `id`, `title`, `description`, `media`, and `variants` (with price + availability)
- Transport-agnostic: REST, MCP, or A2A

**What UCP does NOT do:** UCP doesn't define a merchant-level taxonomy. It's a transaction protocol — it tells agents how to search, add to cart, and checkout. The question "what categories does this merchant sell?" is answered by the merchant's product feed or metadata, not by UCP itself.

**What this means for us:** UCP and our skill system are complementary, not competing:
- **Our skill.json** = "here's what this merchant sells, how to find products, and how agent-friendly they are" (merchant-level metadata)
- **UCP** = "here's how to actually transact with this merchant" (transaction protocol)

An agent would use our taxonomy to *find* the right merchant, then use UCP to *shop* at that merchant.

### 4. How Agents Actually Navigate Product Categories

The emerging pattern from 2026 agent commerce:

1. **Intent → Sector** — Agent determines broad category from user intent ("I need running shoes" → fashion/sports)
2. **Sector → Merchants** — Query a registry for merchants in that sector
3. **Merchant → Catalog** — Use the merchant's catalog API (or UCP Catalog capability) to search for specific products
4. **Compare** — Get pricing/availability across multiple merchants
5. **Transact** — Use UCP checkout or the merchant's native checkout

The taxonomy is a **routing layer** — it helps the agent narrow from 10,000 merchants to 5-10 relevant ones. Once the agent has picked a merchant, it uses that merchant's own catalog/search to find specific products.

This means our taxonomy needs to be:
- **Broad enough** to route (L1-L3 Google categories are perfect)
- **Simple enough** to query (just IDs or comma-separated values)
- **Standard enough** to interoperate (Google Product Taxonomy IDs are the lingua franca)

### 5. Shopify's Approach (For Reference)

Shopify maintains their own open-source taxonomy (10,000+ categories, 2,000+ attributes) with mappings to Google Product Taxonomy. Categories use breadcrumb format:

```
Home & Garden > Decor > Clocks > Alarm Clocks
```

Or category ID: `hg-3-17-1`

They process 30M+ predictions daily to auto-categorize products. They publish `.txt` and `.json` format taxonomy files on GitHub with mappings between their system and Google's.

---

## Recommendation for skill.json `taxonomy.categories`

**Option A: ID-only array (simplest)**
```json
"googleProductCategories": [141, 149, 223, 278]
```
Pros: Tiny payload, standard IDs, agent looks up from our taxonomy tree.
Cons: Not human-readable without lookup.

**Option B: Google-format strings (balanced)**
```json
"googleProductCategories": [
  "141 - Cameras & Optics",
  "223 - Electronics > Audio",
  "278 - Electronics > Computers"
]
```
Pros: Self-describing, matches Google's own file format, parseable (split on ` - `), human-readable.
Cons: Slightly larger payload.

**Option C: Keep current schema (richest)**
```json
"categories": [
  { "gptId": 141, "name": "Cameras & Optics", "path": "...", "depth": 1, "primary": true }
]
```
Pros: Most data available without lookup.
Cons: Verbose, redundant fields, not how anyone else does it.

**Recommendation:** Option B. It's how Google's own taxonomy file works. It's self-describing so agents and humans can both read it. It's a single field with a simple array of strings. And if an agent needs just the ID, it's `parseInt(entry.split(" - ")[0])`.

---

## Does the /standard Page Need Updating?

The `/standard` page renders `agentic-commerce-standard.md`. If that document references the skill.json taxonomy format, then yes — it should reflect whatever format we actually implement. But the standard is about the overall skill file format and scoring rubric, not the taxonomy schema specifically. The taxonomy schema lives in `skill-json-schema.md`.

**What needs updating:**
1. `docs/build context/Shopy/skill-json-schema.md` — update the `taxonomy.categories` section to match the simpler format
2. `lib/procurement-skills/skill-json.ts` — update the serializer to output the new format
3. The `/standard` page — only if it currently references the verbose category object format (needs checking)

---

## UCP vs. CreditClaw's "UCP Categories" — Naming Collision

Important: Google's **Universal Commerce Protocol** (UCP) is a transaction protocol. Our internal naming uses "UCP" for "Universal Category Protocol" (from `product-index-taxonomy-plan.md`). These are different things. We should either:
- Rename ours to avoid confusion (e.g., just call them "Google Product Categories" or "GPT Categories")
- Or keep the internal name but never surface "UCP" to agents/users — always say "Google Product Taxonomy" externally

Given that Google's UCP is now a major industry standard, renaming our internal concept would avoid confusion.
