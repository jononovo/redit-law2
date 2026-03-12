"use client";

import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TransferDestinationWallet } from "@/components/wallet/types";

interface TransferSourceInfo {
  address: string;
  balance_display: string;
  bot_name?: string;
}

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceWallet: TransferSourceInfo | null;
  amount: string;
  onAmountChange: (amount: string) => void;
  destType: "own" | "external";
  onDestTypeChange: (type: "own" | "external") => void;
  destWalletKey: string;
  onDestWalletKeyChange: (key: string) => void;
  destAddress: string;
  onDestAddressChange: (address: string) => void;
  availableWallets: TransferDestinationWallet[];
  submitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

export function TransferDialog({
  open,
  onOpenChange,
  sourceWallet,
  amount,
  onAmountChange,
  destType,
  onDestTypeChange,
  destWalletKey,
  onDestWalletKeyChange,
  destAddress,
  onDestAddressChange,
  availableWallets,
  submitting,
  onSubmit,
  onClose,
}: TransferDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-transfer">
        <DialogTitle className="flex items-center gap-2">
          <Send className="w-5 h-5 text-blue-500" />
          Transfer USDC
        </DialogTitle>
        <DialogDescription className="text-neutral-600">
          Send USDC from {sourceWallet?.bot_name ? `${sourceWallet.bot_name}` : "this wallet"} to another wallet or external address.
        </DialogDescription>
        {sourceWallet && (
          <div className="space-y-4 mt-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
              <p className="text-xs text-neutral-500 font-medium mb-1">Source Wallet</p>
              <p className="text-sm font-mono text-neutral-700">{sourceWallet.address.slice(0, 10)}...{sourceWallet.address.slice(-6)}</p>
              <p className="text-lg font-bold text-neutral-900 mt-1">{sourceWallet.balance_display}</p>
            </div>

            <div>
              <Label>Amount (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                data-testid="input-transfer-amount"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Destination</Label>
              <select
                className="w-full mt-1.5 border rounded-lg px-3 py-2 text-sm bg-white"
                value={destType}
                onChange={(e) => onDestTypeChange(e.target.value as "own" | "external")}
                data-testid="select-destination-type"
              >
                <option value="own">Own Wallet</option>
                <option value="external">External Address</option>
              </select>
            </div>

            {destType === "own" ? (
              <div>
                <Label>Destination Wallet</Label>
                <select
                  className="w-full mt-1.5 border rounded-lg px-3 py-2 text-sm bg-white"
                  value={destWalletKey}
                  onChange={(e) => onDestWalletKeyChange(e.target.value)}
                  data-testid="select-destination-wallet"
                >
                  <option value="">Choose a wallet...</option>
                  {availableWallets.map((w) => (
                    <option key={`${w.rail}:${w.id}`} value={`${w.rail}:${w.id}`}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <Label>Destination Address</Label>
                <Input
                  type="text"
                  placeholder="0x..."
                  value={destAddress}
                  onChange={(e) => onDestAddressChange(e.target.value)}
                  data-testid="input-destination-address"
                  className="mt-1.5 font-mono"
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={onSubmit}
                disabled={submitting}
                className="bg-primary hover:bg-primary/90"
                data-testid="button-submit-transfer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Send Transfer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
