"use client";

import { DollarSign, Snowflake, Play, Settings2, ArrowUpRight } from "lucide-react";
import { WalletActionBar, type ActionItem } from "./wallet-action-bar";

export interface CryptoActionBarProps {
  walletId: number;
  isFrozen: boolean;
  onFund: () => void;
  onFreeze: () => void;
  onGuardrails?: () => void;
  onActivity?: () => void;
  fundLabel?: string;
  testIdPrefix?: string;
}

export function CryptoActionBar({
  walletId,
  isFrozen,
  onFund,
  onFreeze,
  onGuardrails,
  onActivity,
  fundLabel = "Fund",
  testIdPrefix = "stripe",
}: CryptoActionBarProps) {
  const actions: ActionItem[] = [
    {
      icon: DollarSign,
      label: fundLabel,
      onClick: onFund,
      className: "flex-1 text-xs gap-2 text-emerald-600 font-semibold cursor-pointer hover:bg-emerald-50 rounded-lg transition-colors",
      "data-testid": `button-fund-${walletId}`,
    },
    {
      icon: isFrozen ? Play : Snowflake,
      label: isFrozen ? "Unfreeze" : "Freeze",
      onClick: onFreeze,
      className: "flex-1 text-xs gap-2 text-neutral-600 cursor-pointer hover:bg-neutral-100 rounded-lg transition-colors",
      "data-testid": `button-freeze-${walletId}`,
    },
    {
      icon: Settings2,
      label: "Guardrails",
      onClick: onGuardrails ?? (() => {}),
      className: "flex-1 text-xs gap-2 text-neutral-600 cursor-pointer hover:bg-neutral-100 rounded-lg transition-colors",
      "data-testid": `button-guardrails-${walletId}`,
      hidden: !onGuardrails,
    },
    {
      icon: ArrowUpRight,
      label: "Activity",
      onClick: onActivity ?? (() => {}),
      className: "flex-1 text-xs gap-2 text-neutral-600 cursor-pointer hover:bg-neutral-100 rounded-lg transition-colors",
      "data-testid": `button-activity-${walletId}`,
      hidden: !onActivity,
    },
  ];

  return (
    <WalletActionBar
      actions={actions}
    />
  );
}
