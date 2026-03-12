"use client";

import { Plus, Unlink } from "lucide-react";
import { CryptoCardVisual, type CryptoMenuItem } from "./crypto-card-visual";
import { CryptoActionBar } from "./crypto-action-bar";
import type { Rail1WalletInfo, Rail2WalletInfo } from "./types";

type CryptoWallet = Rail1WalletInfo | Rail2WalletInfo;

interface CryptoWalletItemProps {
  wallet: CryptoWallet;
  color?: "primary" | "dark" | "blue" | "purple";
  onFund: () => void;
  onFreeze: () => void;
  onGuardrails: () => void;
  onActivity: () => void;
  onAddAgent?: () => void;
  onUnlinkBot?: () => void;
  onCopyAddress: () => void;
  onSyncBalance?: () => void;
  onTransfer?: () => void;
  syncingBalance?: boolean;
  fundLabel?: string;
  testIdPrefix?: string;
  basescanUrl?: string;
  guardrailValueFormatter?: (v: number) => string;
}

export function CryptoWalletItem({
  wallet,
  color = "blue",
  onFund,
  onFreeze,
  onGuardrails,
  onActivity,
  onAddAgent,
  onUnlinkBot,
  onCopyAddress,
  onSyncBalance,
  onTransfer,
  syncingBalance,
  fundLabel,
  testIdPrefix = "stripe",
  basescanUrl,
  guardrailValueFormatter,
}: CryptoWalletItemProps) {
  const isFrozen = wallet.status === "paused" || wallet.status === "frozen";
  const chain = "chain" in wallet ? wallet.chain : "Base";
  const fmt = guardrailValueFormatter ?? ((v: number) => `$${v}`);

  const guardrailLines: { label: string; value: string }[] = [];
  if (wallet.guardrails) {
    guardrailLines.push({ label: "Per-tx limit", value: fmt(wallet.guardrails.max_per_tx_usdc) });
    guardrailLines.push({ label: "Daily budget", value: fmt(wallet.guardrails.daily_budget_usdc) });
    if (wallet.guardrails.monthly_budget_usdc) {
      guardrailLines.push({ label: "Monthly budget", value: fmt(wallet.guardrails.monthly_budget_usdc) });
    }
  }

  const cardMenuItems: CryptoMenuItem[] = [];
  if (!wallet.bot_id && onAddAgent) {
    cardMenuItems.push({
      icon: Plus,
      label: "Add Agent",
      onClick: onAddAgent,
      "data-testid": `menu-add-agent-${wallet.id}`,
    });
  }
  if (wallet.bot_id && onUnlinkBot) {
    cardMenuItems.push({
      icon: Unlink,
      label: "Unlink Bot",
      onClick: onUnlinkBot,
      "data-testid": `menu-unlink-bot-${wallet.id}`,
    });
  }

  return (
    <div className="flex flex-col gap-4 min-w-[320px]" data-testid={`card-${testIdPrefix}-wallet-${wallet.id}`}>
      <CryptoCardVisual
        color={color}
        botName={wallet.bot_name || "Unlinked Wallet"}
        onAddAgent={!wallet.bot_id && onAddAgent ? onAddAgent : undefined}
        address={wallet.address}
        balance={wallet.balance_display}
        chain={chain}
        status={wallet.status}
        frozen={isFrozen}
        onCopyAddress={onCopyAddress}
        onSyncBalance={onSyncBalance}
        syncingBalance={syncingBalance}
        basescanUrl={basescanUrl}
        onTransfer={wallet.status === "active" ? onTransfer : undefined}
        guardrailLines={guardrailLines}
        menuItems={cardMenuItems}
      />

      <CryptoActionBar
        walletId={wallet.id}
        status={wallet.status}
        onFund={onFund}
        onFreeze={onFreeze}
        onGuardrails={onGuardrails}
        onActivity={onActivity}
        fundLabel={fundLabel}
        testIdPrefix={testIdPrefix}
      />
    </div>
  );
}
