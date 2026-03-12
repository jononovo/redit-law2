"use client";

import { useRouter } from "next/navigation";
import { Eye, Snowflake, Play, Plus, Bot, Copy, Unlink, MoreHorizontal, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CardVisual } from "./card-visual";
import type { NormalizedCard } from "./types";
import { CARD_COLORS } from "./types";

interface CreditCardItemProps {
  card: NormalizedCard;
  index: number;
  onFreeze: () => void;
  onAddAgent?: () => void;
  onUnlinkBot?: () => void;
  onCopyCardId: () => void;
}

export function CreditCardItem({
  card,
  index,
  onFreeze,
  onAddAgent,
  onUnlinkBot,
  onCopyCardId,
}: CreditCardItemProps) {
  const router = useRouter();
  const isFrozen = card.status === "frozen";
  const canFreeze = card.status === "active" || card.status === "frozen";

  return (
    <div className="flex flex-col gap-4 min-w-[320px]" data-testid={`card-item-${card.card_id}`}>
      <CardVisual
        color={CARD_COLORS[index % CARD_COLORS.length]}
        balance={card.balance}
        balanceLabel={card.balanceLabel}
        balanceTooltip={card.balanceTooltip || undefined}
        last4={card.last4}
        holder={card.card_name.toUpperCase()}
        frozen={isFrozen}
        expiry="••/••"
        line1={card.line1 || undefined}
        line2={card.line2 || undefined}
        status={card.status}
        brand={card.brand || undefined}
      />

      <div className="bg-white rounded-xl border border-neutral-100 p-2 flex items-center" data-testid={`action-bar-${card.card_id}`}>
        <Button
          variant="ghost"
          className="flex-1 text-xs gap-2 text-neutral-600 cursor-pointer hover:bg-neutral-100 rounded-lg transition-colors"
          onClick={() => router.push(card.detailPath)}
          data-testid={`button-manage-${card.card_id}`}
        >
          <Eye className="w-4 h-4" /> Manage
        </Button>

        <div className="w-px h-6 bg-neutral-100" />

        {canFreeze && (
          <>
            <Button
              variant="ghost"
              className={`flex-1 text-xs gap-2 cursor-pointer hover:bg-neutral-100 rounded-lg transition-colors ${isFrozen ? "text-blue-600" : "text-neutral-600"}`}
              onClick={onFreeze}
              data-testid={`button-freeze-${card.card_id}`}
            >
              {isFrozen ? <Play className="w-4 h-4" /> : <Snowflake className="w-4 h-4" />}
              {isFrozen ? "Unfreeze" : "Freeze"}
            </Button>
            <div className="w-px h-6 bg-neutral-100" />
          </>
        )}

        {!card.bot_id && onAddAgent && (
          <>
            <Button
              variant="ghost"
              className="flex-1 text-xs gap-2 text-emerald-600 font-semibold cursor-pointer hover:bg-emerald-50 rounded-lg transition-colors"
              onClick={onAddAgent}
              data-testid={`button-add-agent-${card.card_id}`}
            >
              <Plus className="w-4 h-4" /> Add Agent
            </Button>
            <div className="w-px h-6 bg-neutral-100" />
          </>
        )}

        {card.bot_id && (
          <>
            <div
              className="flex-1 flex items-center justify-center gap-2 text-xs text-blue-600 font-medium"
              data-testid={`badge-bot-${card.card_id}`}
            >
              <Bot className="w-4 h-4" /> {card.bot_name || "Linked"}
            </div>
            <div className="w-px h-6 bg-neutral-100" />
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="text-xs gap-2 text-neutral-600 cursor-pointer hover:bg-neutral-100 rounded-lg transition-colors px-3"
              data-testid={`button-more-${card.card_id}`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!card.bot_id && onAddAgent && (
              <DropdownMenuItem onClick={onAddAgent} data-testid={`menu-link-${card.card_id}`}>
                <Plus className="w-4 h-4 mr-2" /> Link Agent
              </DropdownMenuItem>
            )}
            {card.bot_id && onUnlinkBot && (
              <DropdownMenuItem onClick={onUnlinkBot} data-testid={`menu-unlink-${card.card_id}`}>
                <Unlink className="w-4 h-4 mr-2" /> Unlink Bot
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onCopyCardId} data-testid={`menu-copy-${card.card_id}`}>
              <Copy className="w-4 h-4 mr-2" /> Copy Card ID
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(card.detailPath)} data-testid={`menu-details-${card.card_id}`}>
              <Eye className="w-4 h-4 mr-2" /> View Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
