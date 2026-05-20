---
name: Rail 3 — Per-User Agent Refactor (Bot-Optional Card Creation)
description: Move from one-Crossmint-agent-per-bot to one-Crossmint-agent-per-user. Make `bot_id` optional on virtual card creation. Forward-compatible foundation for the future "Master Agent" feature. Strip dead UI surfaces left over from the per-bot model.
created: 2026-05-20
status: planned — awaiting go
---

## Why this exists

Today every virtual card requires a bot, and every bot lazily provisions its own Crossmint agent. That coupling forces the user to set up a bot before they can vault a card, preview it, or configure permissions. That's bad UX, and the bot↔agent mapping is also wrong long-term: Crossmint docs explicitly recommend **one agent per user**, not per bot.

The fix is two changes that happen together:

1. **Backend model:** one Crossmint agent per **owner** (`ownerUid`), lazy-created on first card. Bot becomes an optional pointer on the card row, not a creation prerequisite.
2. **UX:** AddCardDialog no longer requires a bot. Card create flow tells the user "we issued you an agent" — internal name is currently `CreditClaw Agent — <email>` and represents *that user's* Crossmint agent. (Phase 2: this becomes the per-user alias on top of the shared Master Agent — see `internal_docs/04-payment-tools/master-agent-build.md`.)

The user-facing language ("we generated an agent for you") is forward-compatible with both today's per-user-real-agent model and tomorrow's shared-Master-Agent model. The DB shape supports both.

**Cross-rail impact:** zero. Rail 1 / Rail 2 / Rail 5 have no agent concept. They look up wallets/cards by `botId` and tolerate missing rows. They are not touched by this change.

**Crossmint constraint, called out explicitly:** `createOrderIntent` binds the orderIntent to an `agentId` at creation. There is no Crossmint API to reassign. So a card created today under "CreditClaw Agent for user X" stays under that agent forever — even if the user later links a real bot. The card↔bot link is a database-only relabel; the underlying Crossmint permission routes through the user's agent. This is fine and matches the Master Agent end-state.

---

## Scope

In:
- Schema reshape on `rail3_agents` + `rail3_cards`.
- Storage + POST route rewrite to use per-owner agent.
- `add-card-dialog.tsx` cleanup (bot picker optional, `noBots` block deleted, hand-rolled card preview replaced with `CardVisual`).
- Strip the broken `/bots` route reference (it 404s; nothing else points to it).
- Sibling endpoints audited for "bot is required" assumptions.

Out (separate follow-ups, noted but not built):
- "Link a bot to an existing botless card later" endpoint. UI affordance already exists in `credit-card-item.tsx`. Backend wire-up = ~30 lines of PATCH but not in this pass.
- Master Agent runtime / browser control / pool strategy. See its own doc.
- Backfill of any phantom historical data. Per user direction, no backward compatibility — destructive migration on staging is acceptable.

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
agentAlias: text("agent_alias"),           // forward-compat: per-user label
                                            // for the future shared Master Agent.
                                            // For now mirrors agentId.
createdAt: timestamp(...)
```

- PK changes from `bot_id` to `owner_uid`. One row per user, ever.
- `botId` column removed entirely (the link, if any, lives on `rail3_cards`).
- `agentAlias` added for Master Agent forward-compat. In Phase 1 it equals `agentId`; in Phase 2 the alias is a virtual ID we issue per user while `agentId` points at the shared Master Agent's Crossmint ID.

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

Drizzle migration in `drizzle/`. Two statements:
1. `DROP TABLE rail3_agents;` then re-create with new shape via `drizzle-kit generate`.
2. `ALTER TABLE rail3_cards ALTER COLUMN bot_id DROP NOT NULL;`

Existing `rail3_agents` rows and any `rail3_cards` rows (staging only) are wiped/relaxed. Confirmed acceptable per user direction.

---

## Storage layer (`server/storage/payment-rails/rail3-agents.ts`)

Replace the entire file. New interface:

```ts
type Rail3AgentMethods = Pick<IStorage,
  | "getRail3AgentByOwnerUid"
  | "getOrCreateRail3AgentForOwner"
>;
```

Implementation:

```ts
async getRail3AgentByOwnerUid(ownerUid: string): Promise<Rail3Agent | null> {
  const [row] = await db.select().from(rail3Agents)
    .where(eq(rail3Agents.ownerUid, ownerUid)).limit(1);
  return row || null;
}

async getOrCreateRail3AgentForOwner(
  ownerUid: string,
  ownerEmail: string,
): Promise<Rail3Agent> {
  const existing = await this.getRail3AgentByOwnerUid(ownerUid);
  if (existing) return existing;

  // Create on Crossmint.
  const created = await createAgent({
    userLocator: ownerUidToUserLocator(ownerUid),
    name: `CreditClaw Agent — ${ownerEmail}`,
  });

  // Insert. PK conflict on ownerUid = another concurrent request beat us;
  // re-read and orphan our just-created Crossmint agent. Same pattern we
  // already use for the per-bot agent path.
  try {
    const [row] = await db.insert(rail3Agents).values({
      ownerUid,
      agentId: created.agentId,
      agentAlias: created.agentId,  // Phase 1: alias == agentId
    }).returning();
    return row;
  } catch (err: any) {
    if (err?.code === "23505") {
      const winner = await this.getRail3AgentByOwnerUid(ownerUid);
      if (winner) {
        console.warn("[Rail3] orphaned Crossmint agent", created.agentId,
          "for owner", ownerUid, "(lost race)");
        return winner;
      }
    }
    throw err;
  }
}
```

The Crossmint API call lives inside storage to keep the route thin. Reasonable because there's exactly one caller and it's not worth a separate service layer. If a second caller appears, extract to `features/payment-rails/rail3/agent-provisioning.ts`.

Update `server/storage/types.ts` accordingly. Remove `getRail3AgentByBotId`, `createRail3Agent`, `deleteRail3AgentByBotId`.

---

## POST `/api/v1/rail3/cards` rewrite

Current handler has ~50 lines of per-bot agent provisioning + race handling. After the refactor that all collapses into one storage call.

```ts
// Validate body.
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
const agent = await storage.getOrCreateRail3AgentForOwner(user.uid, user.email!);

// Build mandates + create orderIntent.
const mandates = buildMandates({ /* unchanged */ });
const intent = await createOrderIntent({
  userLocator: ownerUidToUserLocator(user.uid),
  agentId: agent.agentId,
  paymentMethodId: pm.paymentMethodId,
  mandates,
});

// Persist card. botId is nullable.
const card = await storage.createRail3Card({
  /* unchanged fields */
  botId: parsed.data.bot_id ?? null,
});

return NextResponse.json({ /* unchanged */ });
```

Net: ~40 lines removed, much easier to read.

---

## GET endpoints — audit & light touch

- `GET /api/v1/rail3/cards` — already handles `c.botId || null` defensively and only resolves names for non-null botIds. **No change.**
- `GET /api/v1/rail3/cards/[cardId]` — same. **No change.**
- `GET /api/v1/rail3/transactions` — transactions have their own `botId` (already nullable in the schema). **No change.**
- `PATCH /api/v1/rail3/cards/[cardId]` — already guards `updated?.botId` before firing the webhook. **No change.** Stale comment at top of the file ("bot_id intentionally NOT patchable... bound 1:1 to a bot") needs rewriting to reflect the new model. Update the comment, don't add patchability of `bot_id` to the schema in this pass (that's the follow-up endpoint).
- `DELETE /api/v1/rail3/cards/[cardId]` — already guards `if (card.botId)` before firing webhook. **No change.**
- `POST /api/v1/bot/rail3/checkout` — line 24 enforces `card.botId !== bot.botId → forbidden`. Cards with `botId === null` will be forbidden to every bot, which is correct: a botless card is owner-vault-only until linked. **No change.** Worth a one-line comment so future readers understand the null case.

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

Submit body: omit `bot_id` if empty string (don't send empty string to the optional schema).

Drop `useState<string>("")` initialization that auto-picks the first bot — pre-selecting biases the user toward linking when "none" is now the valid default.

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

This deletes ~40 lines of hand-rolled JSX and gets us correct chip, brand display, status badge, gradient, frozen-state behavior for free.

---

## Bot-list UI cross-checks (no changes expected, just verify)

These places call `/api/v1/bots/mine`. Confirm they still render correctly when a user has zero bots (which is now a valid first-class state):

- `app/(dashboard)/overview/page.tsx`
- `app/(dashboard)/settings/page.tsx`
- `components/wallet/orders-panel.tsx`
- `components/wallet/hooks/use-bot-linking.ts`
- `components/onboarding/rail5-wizard/use-rail5-wizard.ts`
- `components/rail3/add-card-dialog.tsx` (the one we just rewrote)

Expected outcome: each already handles empty `bots` arrays. No edits.

---

## Files touched

```
shared/schema.ts                                          # 2 table reshapes + zod
drizzle/<new-migration>.sql                               # drop+create rail3_agents, alter rail3_cards
server/storage/payment-rails/rail3-agents.ts              # rewrite
server/storage/types.ts                                   # interface update
app/api/v1/rail3/cards/route.ts                           # POST simplified
app/api/v1/rail3/cards/[cardId]/route.ts                  # comment refresh only
components/rail3/add-card-dialog.tsx                      # 3 edits described above
```

No new files. Net LOC change: negative (deletions > additions).

---

## Risk register

| # | Risk | Mitigation |
|---|------|------------|
| 1 | Concurrent first-card creates from the same owner double-provision Crossmint agents | PK on `ownerUid` + 23505 catch + orphan-and-recover pattern (same as today's per-bot code) |
| 2 | `user.email` is null at agent-create time | `getSessionUser` returns email for authenticated sessions; if absent, fall back to `ownerUid` in the agent name string. Cosmetic only. |
| 3 | Stale `/bots` UI references elsewhere | Confirmed only ref is in `add-card-dialog.tsx` which is being rewritten. Verified via `rg "/bots"`. |
| 4 | Crossmint `agentAlias` field unused in Phase 1 | Acceptable — exists for Phase 2 (Master Agent) so the schema doesn't change again. Costs one nullable column. |
| 5 | Production data | Per user direction: staging only, destructive migration acceptable. Re-verify before running migration in prod. |

---

## Validation steps after implementation

1. `npx drizzle-kit generate` — confirm migration is what we expect.
2. Apply migration on staging DB.
3. Sign in as a fresh user. Visit `/virtual-cards`. AddCardDialog opens with no bots in the list, default "— None —" selected.
4. Vault a card via passkey → confirm `rail3_agents` has one row for owner, `rail3_cards.bot_id IS NULL`.
5. Visit `/cards` and `/overview` — botless card renders, "Add Agent" affordance visible per existing `credit-card-item.tsx` logic.
6. Repeat with a user who already has a bot — pick the bot in the dropdown, verify `rail3_cards.bot_id` is populated and bot-side `/api/v1/bot/rail3/checkout` succeeds.
7. Concurrent submit (open dialog twice, submit both) — verify only one `rail3_agents` row, second request reuses winner.
8. `code_review` skill — architect pass.

---

## Forward link

The per-user `agentAlias` column is the seed for the Master Agent. See `project_knowledge/internal_docs/04-payment-tools/master-agent-build.md` for the larger product bet and how this refactor sets it up without throwaway work.
