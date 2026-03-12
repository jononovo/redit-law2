"use client";

import { cn } from "@/lib/utils";
import { Wallet, Copy, RefreshCw, ExternalLink, Send, Snowflake, MoreVertical, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { LucideIcon } from "lucide-react";

export interface CryptoMenuItem {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  "data-testid"?: string;
}

interface CryptoCardVisualProps {
  color?: "primary" | "dark" | "blue" | "purple";
  botName: string;
  address: string;
  balance: string;
  chain: string;
  status: string;
  frozen?: boolean;
  className?: string;
  onAddAgent?: () => void;
  onCopyAddress?: () => void;
  onSyncBalance?: () => void;
  syncingBalance?: boolean;
  basescanUrl?: string;
  onTransfer?: () => void;
  guardrailLines?: { label: string; value: string }[];
  menuItems?: CryptoMenuItem[];
}

export function CryptoCardVisual({
  color = "blue",
  botName,
  address,
  balance,
  chain,
  status,
  frozen = false,
  className,
  onAddAgent,
  onCopyAddress,
  onSyncBalance,
  syncingBalance,
  basescanUrl,
  onTransfer,
  guardrailLines = [],
  menuItems = [],
}: CryptoCardVisualProps) {
  const gradients = {
    primary: "bg-gradient-to-br from-orange-500 via-primary to-rose-600",
    dark: "bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-800",
    blue: "bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600",
    purple: "bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600",
  };

  const statusColors: Record<string, string> = {
    active: "bg-white/15 text-emerald-200 border-emerald-300/30",
    pending_setup: "bg-white/15 text-amber-200 border-amber-300/30",
    pending_delivery: "bg-white/15 text-orange-200 border-orange-300/30",
    confirmed: "bg-white/15 text-teal-200 border-teal-300/30",
    awaiting_bot: "bg-white/15 text-violet-200 border-violet-300/30",
    frozen: "bg-white/15 text-blue-200 border-blue-300/30",
    paused: "bg-white/15 text-blue-200 border-blue-300/30",
  };

  const statusLabels: Record<string, string> = {
    active: "active",
    pending_setup: "pending",
    pending_delivery: "ready to test",
    confirmed: "confirmed",
    awaiting_bot: "awaiting bot",
    frozen: "frozen",
    paused: "paused",
  };

  const displayStatus = frozen ? "frozen" : status;
  const statusStyle = statusColors[displayStatus] || "bg-white/15 text-white/90 border-white/30";
  const statusLabel = statusLabels[displayStatus] || displayStatus;

  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div
      className={cn(
        "relative rounded-2xl p-6 pb-5 text-white shadow-xl overflow-hidden flex flex-col gap-4 select-none transition-all",
        gradients[color],
        frozen && "grayscale opacity-70",
        !frozen && "hover:shadow-2xl",
        className
      )}
      data-testid="crypto-card-visual"
    >
      <div className="absolute top-[-20%] right-[-20%] w-[45%] h-[60%] rounded-full bg-white/[0.07] pointer-events-none" />
      <div className="absolute bottom-[-25%] left-[-10%] w-[45%] h-[55%] rounded-full bg-white/[0.04] pointer-events-none" />
      <div className="absolute top-[40%] right-[5%] w-[30%] h-[40%] rounded-full bg-white/[0.03] pointer-events-none" />

      {frozen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 bg-white/90 text-neutral-800 px-4 py-2 rounded-full shadow-lg font-bold text-sm">
            <Snowflake className="w-4 h-4 text-blue-500" />
            FROZEN
          </div>
        </div>
      )}

      <div className="relative z-10 flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-black/25 backdrop-blur-sm flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white/90" />
          </div>
          <div>
            {onAddAgent ? (
              <button
                onClick={(e) => { e.stopPropagation(); onAddAgent(); }}
                className="text-base font-semibold text-emerald-300 hover:text-emerald-200 flex items-center gap-1.5 cursor-pointer transition-colors leading-tight"
                data-testid="button-add-agent"
              >
                <Plus className="w-4 h-4" />
                Add Agent
              </button>
            ) : (
              <span className="text-base font-bold block leading-tight" data-testid="text-wallet-bot-name">{botName}</span>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              <code className="text-xs text-white/55 font-mono" data-testid="text-wallet-address">{truncatedAddress}</code>
              {onCopyAddress && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCopyAddress(); }}
                  className="text-white/40 hover:text-white/90 transition-colors"
                  data-testid="button-copy-address"
                >
                  <Copy className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-[11px] font-medium tracking-wide px-3 py-1 rounded-full border backdrop-blur-sm",
              statusStyle
            )}
            data-testid="text-wallet-status"
          >
            {statusLabel}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="text-white/50 hover:text-white/90 transition-colors p-0.5"
                data-testid="button-wallet-card-menu"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menuItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={idx} onClick={item.onClick} data-testid={item["data-testid"]}>
                    <Icon className="w-4 h-4 mr-2" /> {item.label}
                  </DropdownMenuItem>
                );
              })}
              {onCopyAddress && (
                <DropdownMenuItem onClick={onCopyAddress} data-testid="menu-copy-address">
                  <Copy className="w-4 h-4 mr-2" /> Copy Address
                </DropdownMenuItem>
              )}
              {onSyncBalance && (
                <DropdownMenuItem onClick={onSyncBalance} data-testid="menu-sync-balance">
                  <RefreshCw className="w-4 h-4 mr-2" /> Sync Balance
                </DropdownMenuItem>
              )}
              {basescanUrl && (
                <DropdownMenuItem onClick={() => window.open(basescanUrl, "_blank")} data-testid="menu-basescan">
                  <ExternalLink className="w-4 h-4 mr-2" /> View on Basescan
                </DropdownMenuItem>
              )}
              {onTransfer && (
                <DropdownMenuItem onClick={onTransfer} data-testid="menu-transfer">
                  <Send className="w-4 h-4 mr-2" /> Transfer USDC
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="relative z-10 mt-1">
        <span className="text-4xl font-bold tracking-tight block" data-testid="text-wallet-balance">{balance}</span>
        <div className="flex items-center gap-2.5 mt-1.5">
          <span className="text-xs font-semibold text-white/60 uppercase tracking-widest" data-testid="text-wallet-chain-label">
            USDC on {chain}
          </span>
          <div className="flex items-center gap-2">
            {onSyncBalance && (
              <button
                onClick={(e) => { e.stopPropagation(); onSyncBalance(); }}
                className="text-white/45 hover:text-white/90 transition-colors"
                title="Sync balance"
                data-testid="button-sync-balance"
              >
                <RefreshCw className={cn("w-4 h-4", syncingBalance && "animate-spin")} />
              </button>
            )}
            {basescanUrl && (
              <button
                onClick={(e) => { e.stopPropagation(); window.open(basescanUrl, "_blank"); }}
                className="text-white/45 hover:text-white/90 transition-colors"
                title="View on Basescan"
                data-testid="button-basescan"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
            {onTransfer && (
              <button
                onClick={(e) => { e.stopPropagation(); onTransfer(); }}
                className="text-white/45 hover:text-white/90 transition-colors"
                title="Transfer"
                data-testid="button-transfer-inline"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {guardrailLines.length > 0 && (
        <div className="relative z-10 mt-1 bg-white/[0.08] backdrop-blur-sm border border-white/[0.12] rounded-xl px-4 py-2.5 space-y-1" data-testid="wallet-guardrails-panel">
          {guardrailLines.map((line, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-xs text-white/70">{line.label}</span>
              <span className="text-xs font-semibold text-white/85 font-mono">{line.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
