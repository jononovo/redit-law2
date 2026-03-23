"use client";

import { Label } from "@/components/ui/label";

interface WalletOption {
  id: number;
  label: string;
}

interface WalletSelectorProps {
  wallets: WalletOption[];
  selectedId: number;
  onChange: (id: number) => void;
  label?: string;
  testId?: string;
}

export function WalletSelector({ wallets, selectedId, onChange, label = "Wallet:", testId = "select-wallet" }: WalletSelectorProps) {
  if (wallets.length === 0) return null;

  return (
    <div className="mb-4 flex items-center gap-3">
      <Label className="text-sm text-neutral-500">{label}</Label>
      <select
        className="border rounded-lg px-3 py-2 text-sm bg-white"
        value={selectedId}
        onChange={(e) => onChange(Number(e.target.value))}
        data-testid={testId}
      >
        {wallets.map((w) => (
          <option key={w.id} value={w.id}>{w.label}</option>
        ))}
      </select>
    </div>
  );
}
