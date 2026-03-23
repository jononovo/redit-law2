"use client";

import { useState, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";
import type { TransferDestinationWallet } from "@/components/wallet/types";

export type SourceRail = "privy" | "crossmint";

export interface UseTransferConfig {
  sourceRail: SourceRail;
  onUpdate?: () => void;
  onTransactionsRefresh?: () => void;
}

export function useTransfer(config: UseTransferConfig) {
  const { toast } = useToast();

  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferSourceWallet, setTransferSourceWallet] = useState<{ id: number; address: string; balance_usdc: number; balance_display: string; bot_name?: string } | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDestType, setTransferDestType] = useState<"own" | "external">("own");
  const [transferDestWalletKey, setTransferDestWalletKey] = useState("");
  const [transferDestAddress, setTransferDestAddress] = useState("");
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [allWalletsForTransfer, setAllWalletsForTransfer] = useState<TransferDestinationWallet[]>([]);

  const openTransferDialog = useCallback(async (wallet: { id: number; address: string; balance_usdc: number; balance_display: string; bot_name?: string }) => {
    setTransferSourceWallet(wallet);
    setTransferAmount("");
    setTransferDestType("own");
    setTransferDestWalletKey("");
    setTransferDestAddress("");
    setTransferDialogOpen(true);

    try {
      const [stripeRes, cardRes] = await Promise.all([
        authFetch("/api/v1/stripe-wallet/list"),
        authFetch("/api/v1/card-wallet/list"),
      ]);

      const combined: TransferDestinationWallet[] = [];

      if (stripeRes.ok) {
        const data = await stripeRes.json();
        (data.wallets || []).forEach((w: any) => {
          if (!(w.id === wallet.id && config.sourceRail === "privy")) {
            combined.push({
              id: w.id,
              rail: "privy" as const,
              address: w.address,
              label: `${w.bot_name || "Stripe Wallet"} (${w.address.slice(0, 6)}...${w.address.slice(-4)}) — Stripe/Privy`,
            });
          }
        });
      }

      if (cardRes.ok) {
        const data = await cardRes.json();
        (data.wallets || []).forEach((w: any) => {
          if (!(w.id === wallet.id && config.sourceRail === "crossmint")) {
            combined.push({
              id: w.id,
              rail: "crossmint" as const,
              address: w.address,
              label: `${w.bot_name || "Card Wallet"} (${w.address.slice(0, 6)}...${w.address.slice(-4)}) — Card/Crossmint`,
            });
          }
        });
      }

      setAllWalletsForTransfer(combined);
    } catch {
      setAllWalletsForTransfer([]);
    }
  }, [config.sourceRail]);

  const closeTransferDialog = useCallback(() => {
    setTransferDialogOpen(false);
    setTransferSourceWallet(null);
  }, []);

  const handleTransfer = useCallback(async () => {
    if (!transferSourceWallet) return;

    const amountFloat = parseFloat(transferAmount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    const amountMicroUsdc = Math.round(amountFloat * 1_000_000);

    let destination: { wallet_id?: number; rail?: SourceRail; address?: string } = {};

    if (transferDestType === "own") {
      if (!transferDestWalletKey) {
        toast({ title: "Select a destination wallet", variant: "destructive" });
        return;
      }
      const [rail, idStr] = transferDestWalletKey.split(":");
      destination = { wallet_id: Number(idStr), rail: rail as SourceRail };
    } else {
      if (!transferDestAddress || !/^0x[a-fA-F0-9]{40}$/.test(transferDestAddress)) {
        toast({ title: "Enter a valid 0x address", variant: "destructive" });
        return;
      }
      destination = { address: transferDestAddress };
    }

    setTransferSubmitting(true);
    try {
      const res = await authFetch("/api/v1/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_wallet_id: transferSourceWallet.id,
          source_rail: config.sourceRail,
          amount_usdc: amountMicroUsdc,
          destination,
        }),
      });

      if (res.ok) {
        toast({ title: "Transfer complete" });
        setTransferDialogOpen(false);
        setTransferSourceWallet(null);
        config.onUpdate?.();
        config.onTransactionsRefresh?.();
      } else {
        const err = await res.json();
        if (err.error === "guardrail_violation" || err.error === "approval_required") {
          toast({
            title: err.error === "guardrail_violation" ? "Guardrail Violation" : "Approval Required",
            description: err.reason,
            variant: "destructive",
          });
        } else {
          toast({ title: "Transfer failed", description: err.error || "Unknown error", variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setTransferSubmitting(false);
    }
  }, [transferSourceWallet, transferAmount, transferDestType, transferDestWalletKey, transferDestAddress, config, toast]);

  return {
    transferDialogOpen,
    transferSourceWallet,
    transferAmount,
    setTransferAmount,
    transferDestType,
    setTransferDestType,
    transferDestWalletKey,
    setTransferDestWalletKey,
    transferDestAddress,
    setTransferDestAddress,
    transferSubmitting,
    allWalletsForTransfer,
    openTransferDialog,
    closeTransferDialog,
    handleTransfer,
  };
}
