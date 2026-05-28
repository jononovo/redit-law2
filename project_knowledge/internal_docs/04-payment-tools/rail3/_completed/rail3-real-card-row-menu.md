---
status: planned
owner: agent
scope: rail3
last_updated: 2026-05-28
files_touched:
  - components/wallet/rail3/payment-methods-strip.tsx
---

# Rail 3 — Real Card Row: Trash Icon → 3-Dot Menu

## Goal

Replace the single trash-icon affordance on each "Real cards on file" tile with a 3-dot dropdown that exposes both:
- **Manage** → navigate to `/real-cards/[paymentMethodId]` (the existing detail page)
- **Delete** → opens the existing remove confirmation `AlertDialog`. Disabled when `virtual_card_count > 0`.

No new dialogs, no new endpoints, no new components beyond what `components/ui/dropdown-menu.tsx` already provides.

## Why this is a real problem (not invented)

Today the tile has two competing affordances baked into the same surface:
- The whole row is a `<Link href="/real-cards/[id]">` → click navigates to manage.
- A trash icon button sits inside that link, using `preventDefault + stopPropagation` to intercept clicks.

Result: the only visible action on the tile is "delete." There is no visual cue that the tile is also a link, and "manage" — the more common action — is undocumented and unrecognizable.

A 3-dot menu makes both actions discoverable and groups them where the user expects (top-right overflow), matching the existing `BotCard` pattern.

## Reuse — what already exists

| Need | Source |
|---|---|
| Dropdown primitives | `components/ui/dropdown-menu.tsx` (shadcn) |
| Reference implementation | `components/dashboard/bot-card.tsx` lines 59–75 |
| Icon | `lucide-react` `MoreVertical` (already used in bot-card) |
| Delete confirmation | Existing `AlertDialog` block in `payment-methods-strip.tsx` lines 158–179 — unchanged |
| Delete endpoint | Existing `DELETE /api/v1/rail3/payment-methods/[id]` with 409 guard — unchanged |

Nothing new to create.

## Implementation — one file

`components/wallet/rail3/payment-methods-strip.tsx`:

1. **Imports** — drop `Trash2`, add `MoreVertical`, add `Settings, Trash2` for menu-item icons, add dropdown primitives:
   ```ts
   import { CreditCard, Plus, MoreVertical, Settings, Trash2, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
   import {
     DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
   } from "@/components/ui/dropdown-menu";
   ```

2. **Replace lines 142–151** (the trash `<button>`) with:
   ```tsx
   <DropdownMenu>
     <DropdownMenuTrigger asChild>
       <button
         type="button"
         onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); }}
         className="ml-1 p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600"
         data-testid={`button-pm-menu-${pm.payment_method_id}`}
       >
         <MoreVertical className="w-4 h-4" />
       </button>
     </DropdownMenuTrigger>
     <DropdownMenuContent align="end" onClick={(ev) => ev.stopPropagation()}>
       <DropdownMenuItem
         onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); router.push(`/real-cards/${pm.payment_method_id}`); }}
         data-testid={`menu-manage-pm-${pm.payment_method_id}`}
       >
         <Settings className="w-4 h-4 mr-2" /> Manage
       </DropdownMenuItem>
       <DropdownMenuItem
         disabled={hasVirtuals}
         onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); setRemoveTarget(pm); }}
         data-testid={`menu-delete-pm-${pm.payment_method_id}`}
         className="text-red-600 focus:text-red-600"
       >
         <Trash2 className="w-4 h-4 mr-2" />
         Delete{hasVirtuals ? " (remove virtual cards first)" : ""}
       </DropdownMenuItem>
     </DropdownMenuContent>
   </DropdownMenu>
   ```

3. **Outer `<Link>`** — leave as-is. Tile still navigates to manage on bare-tile click. The dropdown's `preventDefault + stopPropagation` is the same defensive pattern the old trash button already used; portal-rendered menu content (Radix) doesn't bubble through the trigger.

That's the entire diff.

## Sanity check — what could break?

| Risk | Verdict |
|---|---|
| Click on dropdown trigger navigates the outer `<Link>` | Mitigated. `preventDefault + stopPropagation` on trigger button + `stopPropagation` on `DropdownMenuContent`. Same pattern as today's trash button (line 144). |
| Click on "Delete" menu item navigates via outer Link | Mitigated. `stopPropagation` on the item and on the content wrapper. `setRemoveTarget` is the only side effect. |
| Click on "Manage" menu item duplicates navigation (Link + router.push) | No. `preventDefault` cancels the Link nav; `router.push` does the only nav. Destination identical either way, so even if both fired the result would be the same URL — but only one fires. |
| Radix portal escapes the Link DOM tree | Yes — Radix portals to `document.body` by default, so the menu content is not nested inside the `<a>`. Eliminates the "interactive content inside `<a>`" HTML-validity concern for menu items. The trigger button itself is still inside the `<a>`, which is the same situation as today's trash button (browsers allow this). |
| Tests rely on `button-remove-pm-*` testid | `rg` clean across `tests/`, `app/`, `components/`. No external references. Safe to rename. |
| Keyboard accessibility | Improved. Radix dropdown handles arrow keys, Esc, focus return; trash button had none of that. |
| Mobile tap | Improved. 3-dot menu has a larger hit target and reveals both actions; today's tile silently navigates on tap with no way to delete except finding the tiny trash. |
| Visual regression elsewhere | Component is only consumed by `app/(dashboard)/virtual-cards/page.tsx` (verified). No other call sites. |
| Disabled "Delete" item still hides reason | Surfaced inline as suffix text `"(remove virtual cards first)"`. Matches the spirit of the old `title=` tooltip without adding a Tooltip dep. |

## What this does NOT touch

- Detail page (`/real-cards/[paymentMethodId]`) — already shipped.
- DELETE endpoint or its 409 guard.
- AlertDialog confirmation — same component, same `removeTarget` state.
- `virtual-cards` page or any other consumer.
- Schema, types, storage.

## Out of scope (call out, do not build)

- A "Set default" menu item — Crossmint controls `default` server-side and we have no PATCH route. Add later if needed.
- Toast on Manage click — navigation is its own feedback.
- Tooltip component for the disabled reason — handled with inline suffix.

## Acceptance

- 3-dot menu visible on each tile in `/virtual-cards` under "Real cards on file."
- Clicking the dots opens a menu without navigating.
- "Manage" navigates to `/real-cards/[paymentMethodId]`.
- "Delete" opens the existing remove dialog; confirming hits the existing DELETE endpoint.
- "Delete" is disabled (with explanatory suffix) when `virtual_card_count > 0`.
- Clicking the tile outside the menu still navigates to manage.
- No console errors, no LSP errors.

## Step order

1. Edit `components/wallet/rail3/payment-methods-strip.tsx` per above.
2. Manual smoke: open menu, click Manage, click Delete (with and without virtual cards), bare-tile click.
3. `npx tsc --noEmit`.
4. Architect review.
