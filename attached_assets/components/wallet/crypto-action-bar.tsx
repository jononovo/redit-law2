"use client";

import { DollarSign, Snowflake, Play, Settings2, ArrowUpRight } from "lucide-react";
import { WalletActionBar, type ActionItem } from "./wallet-action-bar";

export interface CryptoActionBarProps {
  walletId: number;
  status: string;
  onFund: () => void;
  onFreeze: () => void;
  onGuardrails: () => void;
  onActivity: () => void;
  fundLabel?: string;
  testIdPrefix?: string;
}

export function CryptoActionBar({
  walletId,
  status,
  onFund,
  onFreeze,
  onGuardrails,
  onActivity,
  fundLabel = "Fund",
  testIdPrefix = "stripe",
}: CryptoActionBarProps) {
  const isActive = status === "active";

  const actions: ActionItem[] = [
    {
      icon: DollarSign,
      label: fundLabel,
      onClick: onFund,
      className: "flex-1 text-xs gap-2 text-emerald-600 font-semibold cursor-pointer hover:bg-emerald-50 rounded-lg transition-colors",
      "data-testid": `button-fund-${walletId}`,
    },
    {
      icon: isActive ? Snowflake : Play,
      label: isActive ? "Freeze" : "Activate",
      onClick: onFreeze,
      className: "flex-1 text-xs gap-2 text-neutral-600 cursor-pointer hover:bg-neutral-100 rounded-lg transition-colors",
      "data-testid": `button-freeze-${walletId}`,
    },
    {
      icon: Settings2,
      label: "Guardrails",
      onClick: onGuardrails,
      className: "flex-1 text-xs gap-2 text-neutral-600 cursor-pointer hover:bg-neutral-100 rounded-lg transition-colors",
      "data-testid": `button-guardrails-${walletId}`,
    },
    {
      icon: ArrowUpRight,
      label: "Activity",
      onClick: onActivity,
      className: "flex-1 text-xs gap-2 text-neutral-600 cursor-pointer hover:bg-neutral-100 rounded-lg transition-colors",
      "data-testid": `button-activity-${walletId}`,
    },
  ];

  return (
    <WalletActionBar
      actions={actions}
    />
  );
}
