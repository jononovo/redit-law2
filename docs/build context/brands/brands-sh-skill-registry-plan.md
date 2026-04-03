# brands.sh — Skill Registry Redesign Plan

## Context

brands.sh is currently rendering as a score directory — showing brand names, sectors, tiers, and ASX scores in a table. This is wrong. brands.sh should be a **skill registry** — think ClawHub or npm — oriented around the SKILL.md files that the scanner generates.

The `/skills/[vendor]` detail page already exists and is well-built (checkout methods, capabilities, search discovery, SKILL.md preview, install command). But:
1. The landing page surfaces score data instead of skill data
2. The landing links to `/skills/${slug}` which is correct, but the detail page crashes on brands with empty `brandData`
3. The overall framing is "find a brand" instead of "find and install a skill"

### Reference: ClawHub.ai

ClawHub is the skill registry for OpenClaw (the "npm for AI agents"). Key UI patterns worth adopting:

| Element | ClawHub | brands.sh Target |
|---|---|---|
| **Homepage hero** | Search bar + "npm for AI agents" messaging | Search bar + "skills for shopping agents" messaging |
| **Browse/list** | Skill cards with name, author, description, downloads, stars | Skill rows with name, domain, capabilities, checkout method, maturity |
| **Detail page** | Header → stats → security panel → rendered SKILL.md → install command → related skills | Already built at `/skills/[vendor]` — needs crash fix only |
| **Install command** | `clawhub install skill-name` | `npx shopy add brand-slug` (from existing CLI plan) |
| **Aesthetic** | Dark, minimal, utilitarian — like npm/crates.io | Already dark (`bg-neutral-950`), matches shopy design system |

---

## Scope

### Task 1: Fix scanner pipeline — `brandData` is never saved

**Files:** `app/api/v1/scan/route.ts` (line 297), `lib/scan-queue/process-next.ts` (line 227)

**Problem (verified by running a fresh scan):** The scanner builds a full `VendorSkill` object via `buildVendorSkillDraft()` — with name, url, sector, checkoutMethods, capabilities, search config, checkout flags, shipping, tips — but **never saves it to `brandData`**. Both the scan API route and the queue processor do:

```tsx
const draft = buildVendorSkillDraft(slug, domain, resolvedName, resolvedSector, agentFindings);
skillMd = generateVendorSkill(draft);  // draft used only for SKILL.md text
// ...
brandData: existing?.brandData ?? {},  // draft is thrown away!
```

This means every scan produces a SKILL.md file but stores `brandData: {}`. The structured data powering the `/skills/[vendor]` detail page is never populated.

**Verified by scanning staples.com in dev:**

| Field | Result |
|---|---|
| overallScore | 36 |
| skillMd | 1975 chars (populated) |
| brandData | `{}` (empty — bug) |
| capabilities | `[]` (empty — bug) |
| checkoutMethods | `[]` (empty — bug) |

The `draft` object had all this data — it just wasn't saved.

**Verified DB state for existing brands:**

| Brand | brandData | skillMd | /skills/[slug] |
|---|---|---|---|
| home-depot | 20 keys, name="Home Depot" | 2677 chars | 200 |
| bombas | 0 keys (empty `{}`) | 2409 chars | 500 |
| allbirds | 0 keys (empty `{}`) | 1985 chars | 500 |
| rei | 0 keys (empty `{}`) | 1935 chars | 500 |
| target | 0 keys (empty `{}`) | 1967 chars | 500 |
| zappos | 0 keys (empty `{}`) | 1967 chars | 500 |
| staples | 0 keys (empty `{}`) | 1975 chars | 500 (new scan) |

Home Depot's `brandData` was likely populated manually or by an earlier version of the scanner.

**Fix:** Save the draft to `brandData` and extract `checkoutMethods` from it. In both files, change the upsert block:

```tsx
let skillMd: string | null = null;
let draft: VendorSkill | null = null;  // <-- keep reference
try {
  draft = buildVendorSkillDraft(slug, domain, resolvedName, resolvedSector, agentFindings);
  skillMd = generateVendorSkill(draft);
} catch {
  // non-critical
}

// In the upsert:
brandData: draft ?? existing?.brandData ?? {},
checkoutMethods: draft?.checkoutMethods ?? existing?.checkoutMethods ?? [],
```

**Note:** This touches the scan route and queue processor files. The `generateVendorSkill` function and `buildVendorSkillDraft` function themselves are NOT modified — only how their output is used.

**Acceptance:** After re-scanning staples.com, `brandData` has 15+ keys, `checkoutMethods` is populated, and `/skills/staples` returns 200.

---

### Task 2: Add null guards to `/skills/[vendor]` detail page

**File:** `app/skills/[vendor]/page.tsx`

Even after fixing the scanner, existing brands with empty `brandData` will still crash until re-scanned. The detail page needs defensive coding so it never 500s regardless of data state.

**Fix:** Fall back to `brand.*` top-level fields when `vendor.*` (brandData) properties are missing:

```tsx
const vendorName = vendor?.name ?? brand.name;
const vendorUrl = vendor?.url ?? `https://${brand.domain}`;
const vendorSector = vendor?.sector ?? brand.sector;
```

Conditionally render sections (checkout methods, search discovery, buying config) only when their source data exists. The page should always render — showing the SKILL.md content and whatever top-level data exists, even when `brandData` is empty.

**Acceptance:** All `/skills/[slug]` URLs return 200. Brands with empty `brandData` show a clean page with the SKILL.md content, name, domain, and whatever capabilities/maturity data exists at the `brand.*` level.

---

### Task 3: Redesign the brands.sh landing page (main work)

**File:** `components/tenants/brands/landing.tsx`

**Goal:** Transform from a score table into a skill registry listing. Every element should say "find a skill" not "find a brand score."

#### 2a. Hero section

**Current:**
- Title: "Find the shopping skill for any brand."
- Subtitle: "Every skill an AI agent needs to shop at a real store."
- CTA: "Create a shopping skill for your brand with a single click"

**Change to:**
- Title: "The skill registry for agentic shopping." (or similar — skill-first framing)
- Subtitle: Short line about what a skill is — e.g. "SKILL.md files that teach AI agents how to search, browse, and buy from real stores."
- Stats bar below search: `{total} skills indexed` · `{sectors} sectors` · show the install command hint: `npx shopy add <slug>`
- CTA link stays but reword: "Submit a new skill" → links to `/agentic-shopping-score`

#### 2b. Table columns

**Current columns:** Brand | Sector | Tier | Score | →

**New columns:** Skill | Domain | Capabilities | Checkout | Maturity | →

| Column | Source | Display |
|---|---|---|
| **Skill** | `brand.name` | Name + small domain text below (like npm package name) |
| **Capabilities** | `brand.capabilities[]` | Show as compact pills/tags — first 3, then "+N more" |
| **Checkout** | `brand.checkoutMethods[]` | Show preferred method label (first in array) |
| **Maturity** | `brand.maturity` | Badge: verified (green), official (emerald), beta (yellow), community (blue), draft (gray) |
| **→** | Link arrow | Links to `/skills/${brand.slug}` |

Drop the Score and Tier columns entirely — those belong on shopy.sh.

#### 2c. API data requirements

The current `lite=true` API response includes `capabilities` and `checkoutMethods` arrays — good, we have what we need. The `maturity` field is also returned. No API changes required.

Current lite response shape:
```json
{
  "slug": "bombas",
  "name": "Bombas",
  "domain": "bombas.com",
  "sector": "apparel",
  "maturity": "community",
  "overallScore": 56,
  "capabilities": ["price_lookup", "stock_check", "account_creation", "order_tracking", "returns"],
  "checkoutMethods": []
}
```

#### 2d. Row links

**Current:** `href={/skills/${brand.slug}}` — this is CORRECT for brands.sh. Keep it.

(This is the link that was crashing because the detail page had the `vendor.name[0]` bug. Task 1 fixes that.)

#### 2e. Design rules

Follow the established shopy/brands dark design system:
- No `rounded-xl/2xl/lg` on cards — use `rounded-none`
- No shadows
- Cards: `border border-neutral-800 p-8` (dark variant)
- Section labels: `text-sm font-mono text-neutral-400 tracking-wide` uppercase
- Dark sections: `bg-neutral-950`
- Table header: `bg-neutral-900 border-b border-neutral-800`

---

### Task 4: Update BrandRow type and remove score-centric components (5 min)

**File:** `components/tenants/brands/landing.tsx`

- Update the `BrandRow` type to include `capabilities`, `checkoutMethods`, and `maturity`
- Remove the `ScoreBadge` component (score display belongs on shopy, not brands)
- Remove `overallScore` and `tier` from the type and display
- Add capability and checkout display helpers

---

## Files Changed

| File | Change |
|---|---|
| `app/api/v1/scan/route.ts` | Save `draft` to `brandData` instead of `{}` |
| `lib/scan-queue/process-next.ts` | Same fix — save `draft` to `brandData` |
| `app/skills/[vendor]/page.tsx` | Null guards on `vendor.*` access for graceful degradation |
| `components/tenants/brands/landing.tsx` | Full redesign — skill registry layout |

## Files NOT Changed

| File | Reason |
|---|---|
| `app/api/v1/brands/route.ts` | API already returns capabilities, checkoutMethods, maturity |
| `components/tenants/shopy/landing.tsx` | Shopy stays score-oriented — different tenant |
| `app/brands/[slug]/page.tsx` | This is the shopy score detail page — unrelated |
| `lib/procurement-skills/generator.ts` | DO NOT MODIFY — skill generation logic itself is correct |
| `shared/schema.ts` | No schema changes needed |

## Out of Scope (Future)

- **Skill submission flow** — allow non-admin users to submit a SKILL.md for review
- **Skill versioning** — track SKILL.md versions over time (like ClawHub)
- **Download/install counts** — track `npx shopy add` usage per skill
- **Stars/ratings** — community engagement on skills
- **Security assessment panel** — ClawHub-style automated skill audit
- **Semantic search** — vector-based skill search (currently keyword-based)
- **CLI integration** — `npx shopy add` command (covered in separate CLI plan)
