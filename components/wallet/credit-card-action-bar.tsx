"use client";

import { Eye, Snowflake, Play, Plus, Bot, Copy, Unlink, Trash2 } from "lucide-react";
import { WalletActionBar, type ActionItem, type BadgeItem, type MenuItem } from "./wallet-action-bar";
import type { NormalizedCard } from "./types";

export interface CreditCardActionBarProps {
  card: NormalizedCard;
  onManage: () => void;
  onFreeze: () => void;
  onAddAgent?: () => void;
  onUnlinkBot?: () => void;
  onCopyCardId: () => void;
  onDelete: () => void;
}

export function CreditCardActionBar({
  card,
  onManage,
  onFreeze,
  onAddAgent,
  onUnlinkBot,
  onCopyCardId,
  onDelete,
}: CreditCardActionBarProps) {
  const isFrozen = card.is_frozen;
  const canFreeze = card.status === "active" || card.status === "confirmed";
  const hasBot = !!card.bot_id;

  const actions: ActionItem[] = [
    {
      icon: Eye,
      label: "Manage",
      onClick: onManage,
      "data-testid": `button-manage-${card.card_id}`,
    },
    {
      icon: isFrozen ? Play : Snowflake,
      label: isFrozen ? "Unfreeze" : "Freeze",
      onClick: onFreeze,
      className: `flex-1 text-xs gap-2 cursor-pointer hover:bg-neutral-100 rounded-lg transition-colors ${isFrozen ? "text-blue-600" : "text-neutral-600"}`,
      "data-testid": `button-freeze-${card.card_id}`,
      hidden: !canFreeze,
    },
    {
      icon: Plus,
      label: "Add Agent",
      onClick: onAddAgent ?? (() => {}),
      className: "flex-1 text-xs gap-2 text-emerald-600 font-semibold cursor-pointer hover:bg-emerald-50 rounded-lg transition-colors",
      "data-testid": `button-add-agent-${card.card_id}`,
      hidden: hasBot || !onAddAgent,
    },
  ];

  const badge: BadgeItem | null = hasBot
    ? {
        icon: Bot,
        label: card.bot_name || "Linked",
        "data-testid": `badge-bot-${card.card_id}`,
      }
    : null;

  const menuItems: MenuItem[] = [
    {
      icon: Plus,
      label: "Link Agent",
      onClick: onAddAgent ?? (() => {}),
      "data-testid": `menu-link-${card.card_id}`,
      hidden: hasBot || !onAddAgent,
    },
    {
      icon: Unlink,
      label: "Unlink Bot",
      onClick: onUnlinkBot ?? (() => {}),
      "data-testid": `menu-unlink-${card.card_id}`,
      hidden: !hasBot || !onUnlinkBot,
    },
    {
      icon: Copy,
      label: "Copy Card ID",
      onClick: onCopyCardId,
      "data-testid": `menu-copy-${card.card_id}`,
    },
    {
      icon: Eye,
      label: "View Details",
      onClick: onManage,
      "data-testid": `menu-details-${card.card_id}`,
    },
    {
      icon: Trash2,
      label: "Remove Card",
      onClick: onDelete,
      className: "text-red-600 focus:text-red-600",
      "data-testid": `menu-delete-${card.card_id}`,
    },
  ];

  return (
    <WalletActionBar
      actions={actions}
      badge={badge}
      menuItems={menuItems}
      menuTestId={`button-more-${card.card_id}`}
    />
  );
}
