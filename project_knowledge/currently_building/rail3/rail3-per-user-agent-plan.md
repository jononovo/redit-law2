---
name: Rail 3 — Per-User Agent Refactor (Bot-Optional Card Creation)
description: Move from one-Crossmint-agent-per-bot to one-Crossmint-agent-per-user. Make `bot_id` optional on virtual card creation. Strip dead UI surfaces left over from the per-bot model.
created: 2026-05-20
status: planned — awaiting go
---

## Why this exists

Today every virtual card requires a bot, and every bot lazily provisions its own Crossmint agent. That coupling forces the user to set up a bot before they can vault a card, preview it, or configure permissions. That's bad UX, and the bot↔agent mapping is also wrong long-term: **Crossmint docs explicitly say "you typically create one agent per user"** (`agents/payment-methods/cards/register-agent`).

The fix is two changes that happen together:

1. **Backend model:** one Crossmint agent per **owner** (`ownerUid`), lazy-created on first card. Bot becomes an optional pointer on the card row, not a creation prerequisite.
2. **UX:** AddCardDialog no longer requires a bot. Card create flow tells the user "we issued you an agent" — internally `CreditClaw Agent — <email>`.

**Cross-rail impact:** zero. Rail 1 / Rail 2 / Rail 5 have no agent concept. They look up wallets/cards by `botId` and tolerate missing rows.

**Crossmint constraint, called out explicitly:** `createOrderIntent` binds the orderIntent to an `agentId` at creation. There is no Crossmint API to reassign. So a card created today under the user's per-user agent stays under that agent forever — even if the user later links a real bot. The card↔bot link is a database-only relabel; the underlying Crossmint permission routes through the user's agent. This is fine.

**Forward link:** see `internal_docs/04-payment-tools/master-agent-build.md` for the future "in-house agent runtime" idea. That doc is a holding place — this refactor does **not** add speculative columns or interfaces for it. If/when Master Agent is built, schema changes happen then.

---

## Scope

In:
- Schema reshape on `rail3_agents` + nullable `rail3_cards.bot_id`.
- Storage + POST route rewrite to use per-owner agent.
- `add-card-dialog.tsx` cleanup (bot picker optional, `noBots` block deleted, hand-rolled card preview replaced with `CardVisual`).
- Strip the broken `/bots` route reference.
- Delete obsoleted open point #4 from `rail3-open-points.md` (per-user agents aren't tied to bot lifecycle).
- Update stale `agent_id`-on-PM mention in `rail3-crossmint-card-permissions.md`.

Out (separate follow-ups, noted but not built):
- "Link a bot to an existing botless card later" endpoint. UI affordance already exists in `credit-card-item.tsx`. Backend wire-up = ~30 lines of PATCH but not in this pass.
- Master Agent runtime / browser control / pool strategy. See its own doc.
- Backfill of any prior data. Per user direction, no backward compatibility — destructive migration on staging is acceptable.

---

## Data model changes

### `rail3_agents` (reshape — DROP & RECREATE on staging)

Today:
```ts
botId: text("bot_id").primaryKey(),     // 1 agent per bot
ownerUid: text("owner_uid").notNull(),
agentId: text("agent_id").notNull(),
createdAt: timestamp(...)
```

New:
```ts
ownerUid: text("owner_uid").primaryKey(),  // 1 agent per OWNER
agentId: text("agent_id").notNull(),
createdAt: timestamp(...)
```

- PK changes from `bot_id` to `owner_uid`. One row per user, ever.
- `botId` column removed (the link, if any, lives on `rail3_cards`).
- No speculative `agentAlias`/`metadata` columns. Add them only when an actual feature needs them.

### `rail3_cards.botId` (relax to nullable)

```ts
botId: text("bot_id"),  // was .notNull() — now optional. Card↔bot is an
                        // optional link, not a creation requirement.
```

No index change needed (`rail3_cards_bot_id_idx` already exists, nullable column is fine).

### `rail3CreateCardSchema` (`shared/schema.ts`)

```ts
bot_id: z.string().min(1).max(200).optional(),
```

### Migration

Drizzle migration. Two statements:
1. `DROP TABLE rail3_agents;` then re-create with new shape via `drizzle-kit generate`.
2. `ALTER TABLE rail3_cards ALTER COLUMN bot_id DROP NOT NULL;`

Existing `rail3_agents` rows wiped, `rail3_cards.bot_id` relaxed. Confirmed acceptable per user direction (staging only).

---

## Code layout — separation of concerns

Per project conventions (`replit.md`: "one file = one responsibility"), the Crossmint API call doesn't go inside storage. Three files, three jobs:

### `features/payment-rails/rail3/per-user-agent.ts` (new)

Owns the Crossmint side.

```ts
export async function provisionAgentForOwner(
  ownerUid: string,
  ownerEmail: string,
): Promise<{ agentId: string }> {
  const created = await createAgent({
    userLocator: ownerUidToUserLocator(ownerUid),
    name: `CreditClaw Agent — ${ownerEmail}`,
  });
  return { agentId: created.agentId };
}
```

### `server/storage/payment-rails/rail3-agents.ts` (rewrite)

Pure DB. Race handled at insert via `ON CONFLICT DO NOTHING ... RETURNING`.

```ts
type Rail3AgentMethods = Pick<IStorage,
  | "getRail3AgentByOwnerUid"
  | "insertRail3AgentIfAbsent"
>;

async getRail3AgentByOwnerUid(ownerUid: string): Promise<Rail3Agent | null> {
  const [row] = await db.select().from(rail3Agents)
    .where(eq(rail3Agents.ownerUid, ownerUid)).limit(1);
  return row || null;
}

// Insert. If a row already exists (race), return null — caller re-reads.
async insertRail3AgentIfAbsent(data: InsertRail3Agent): Promise<Rail3Agent | null> {
  const [row] = await db.insert(rail3Agents).values(data)
    .onConflictDoNothing()
    .returning();
  return row || null;
}
```

Update `server/storage/types.ts` accordingly. Remove `getRail3AgentByBotId`, `createRail3Agent`, `deleteRail3AgentByBotId` (the delete method is unused — confirmed in `rail3-open-points.md` open point #4, which becomes obsolete with this change).

### `app/api/v1/rail3/cards/route.ts` (POST handler — composition)

4-line orchestration replaces the old ~50-line per-bot block:

```ts
async function getOrProvisionAgent(ownerUid: string, ownerEmail: string) {
  const existing = await storage.getRail3AgentByOwnerUid(ownerUid);
  if (existing) return existing;

  const { agentId } = await provisionAgentForOwner(ownerUid, ownerEmail);
  const inserted = await storage.insertRail3AgentIfAbsent({ ownerUid, agentId });
  if (inserted) return inserted;

  // Race: another request inserted first. Re-read winner; orphan our Crossmint agent.
  const winner = await storage.getRail3AgentByOwnerUid(ownerUid);
  if (!winner) throw new Error("rail3_agent_race_unresolved");
  console.warn("[Rail3] orphaned Crossmint agent", agentId, "for owner", ownerUid);
  return winner;
}
```

---

## POST `/api/v1/rail3/cards` rewrite

```ts
const parsed = rail3CreateCardSchema.safeParse(body);
// ...validate PM ownership...

// Optional: validate bot ownership if bot_id was supplied.
if (parsed.data.bot_id) {
  const bot = await storage.getBotByBotId(parsed.data.bot_id);
  if (!bot || bot.ownerUid !== user.uid) {
    return NextResponse.json({ error: "bot_not_found_or_forbidden" }, { status: 404 });
  }
}

// Always use the per-owner Crossmint agent. Lazy-creates on first card.
const agent = await getOrProvisionAgent(user.uid, user.email!);

// Build mandates + create orderIntent.
const intent = await createOrderIntent({
  userLocator: ownerUidToUserLocator(user.uid),
  agentId: agent.agentId,
  paymentMethodId: pm.paymentMethodId,
  mandates: buildMandates({ /* unchanged */ }),
});

// Persist card. botId is nullable.
const card = await storage.createRail3Card({
  /* unchanged fields */
  botId: parsed.data.bot_id ?? null,
});

return NextResponse.json({ /* unchanged */ });
```

Net: ~40 lines removed.

---

## Sibling endpoints — audit summary

All sibling endpoints already null-safe on `card.botId`. No code edits required.

- `GET /api/v1/rail3/cards` and `GET /api/v1/rail3/cards/[cardId]` use `c.botId || null` and only resolve bot names for non-null IDs.
- `PATCH /api/v1/rail3/cards/[cardId]` guards `updated?.botId` before firing webhook. **Stale comment at top** of the file claims "bot_id intentionally NOT patchable… bound 1:1 to a bot" — needs rewriting to reflect the new model (do not add `bot_id` patchability in this pass — that's the follow-up endpoint).
- `DELETE /api/v1/rail3/cards/[cardId]` guards `if (card.botId)` before firing webhook.
- `POST /api/v1/bot/rail3/checkout` line 24 enforces `card.botId !== bot.botId → forbidden`. A card with `botId === null` is forbidden to every bot — correct: vault-only until linked. Worth a one-line comment so future readers understand.
- `GET /api/v1/rail3/transactions` already uses nullable `botId`.

Bot-list UIs (`/api/v1/bots/mine` consumers: overview, settings, orders-panel, link-bot hook, rail5 wizard, AddCardDialog) all already handle empty `bots` arrays as a first-class state. No edits expected — verify during validation.

---

## UI changes — `components/rail3/add-card-dialog.tsx`

Three edits, all in this one file.

### 1. Delete the `noBots` branch entirely

Lines around 152, 173–195. The whole `noBots ? ... : ...` ternary collapses. The `/bots` route doesn't exist anyway — this fixes a latent 404.

### 2. Make bot picker optional

```tsx
<Label>Link an agent (optional)</Label>
<Select value={botId} onValueChange={setBotId}>
  <SelectTrigger><SelectValue placeholder="— No agent yet — vault only —" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="">— None —</SelectItem>
    {bots.map((b) => (
      <SelectItem key={b.bot_id} value={b.bot_id} data-testid={`option-bot-${b.bot_id}`}>
        {b.bot_name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
<p className="text-xs text-neutral-500 mt-1">
  We've issued you an agent. Link a bot now or later — your card works either way.
</p>
```

Submit button: `disabled={submitting || !pmId}` (drop `!botId`).

Submit body: omit `bot_id` when empty string.

Drop the auto-pick-first-bot `useState` initialization — pre-selecting biases the user toward linking when "none" is now the valid default.

### 3. Replace hand-rolled card preview with `CardVisual`

The dialog currently renders a custom preview block. Replace with the canonical component (already used by `cards/page.tsx`, `overview/page.tsx`, `sub-agent-cards/[cardId]/page.tsx`, `credit-card-item.tsx`):

```tsx
import { CardVisual } from "@/components/wallet/card-visual";
// ...
<CardVisual
  color={cardColor}
  last4={selectedPm?.cardLast4 || "••••"}
  holder={(cardName || "New Virtual Card").toUpperCase()}
  line1={category || undefined}
  balance={mode === "limited" && maxAmount ? `$${maxAmount}` : "No limit"}
  balanceLabel={mode === "limited" && period ? `Limit · ${period}` : "Spending"}
  brand={selectedPm?.cardBrand || undefined}
  status="pending_setup"
/>
```

Deletes ~40 lines of hand-rolled JSX; gets correct chip, brand display, status badge, gradient, frozen-state behavior for free.

---

## Files touched

```
shared/schema.ts                                          # 2 table reshapes + zod
drizzle/<new-migration>.sql                               # drop+recreate rail3_agents, alter rail3_cards
features/payment-rails/rail3/per-user-agent.ts            # NEW — Crossmint-side helper
server/storage/payment-rails/rail3-agents.ts              # rewrite (pure DB only)
server/storage/types.ts                                   # interface update
app/api/v1/rail3/cards/route.ts                           # POST simplified; getOrProvisionAgent helper
app/api/v1/rail3/cards/[cardId]/route.ts                  # PATCH comment refresh only
components/rail3/add-card-dialog.tsx                      # 3 edits described above
project_knowledge/currently_building/rail3/rail3-open-points.md            # delete obsoleted open point #4
project_knowledge/currently_building/rail3/rail3-crossmint-card-permissions.md  # fix stale `agent_id` on PM mention
```

Net LOC change: negative.

---

## Risks

| # | Risk | Mitigation |
|---|------|------------|
| 1 | Concurrent first-card creates from the same owner double-provision Crossmint agents | PK on `ownerUid` + `onConflictDoNothing` + re-read winner. Orphans the loser's Crossmint agent (warn-logged). |
| 2 | Stale `/bots` UI references elsewhere | Confirmed only ref is in `add-card-dialog.tsx` (being rewritten). |
| 3 | Production data | Per user direction: staging only, destructive migration acceptable. Re-verify before any prod migration. |

---

## Validation steps after implementation

1. `npx drizzle-kit generate` — confirm migration matches expectations.
2. Apply migration on staging DB.
3. Sign in as a fresh user. Visit `/virtual-cards`. AddCardDialog opens with no bots in the list, "— None —" selected by default.
4. Vault a card via passkey → confirm `rail3_agents` has one row for owner, `rail3_cards.bot_id IS NULL`.
5. Visit `/cards` and `/overview` — botless card renders, "Add Agent" affordance visible per existing `credit-card-item.tsx` logic.
6. Repeat with a user who already has a bot — pick the bot in the dropdown, verify `rail3_cards.bot_id` is populated and bot-side `/api/v1/bot/rail3/checkout` succeeds.
7. `code_review` skill — architect pass.
