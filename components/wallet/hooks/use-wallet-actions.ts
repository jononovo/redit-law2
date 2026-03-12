"use client";

import { useState, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";

export interface UseWalletActionsConfig {
  railPrefix: string;
  entityType: "wallet" | "card";
  entityIdField: "wallet_id" | "card_id";
  freezeEndpoint?: string;
  syncEndpoint?: string;
  approvalsDecideEndpoint?: string;
  onUpdate?: () => void;
  onTransactionsRefresh?: (entityId: number | string) => void;
}

export interface FreezeTarget {
  id: number | string;
  name: string;
  status: string;
}

export function useWalletActions(config: UseWalletActionsConfig) {
  const { toast } = useToast();
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncCooldowns, setSyncCooldowns] = useState<Record<number, number>>({});

  const handleFreeze = useCallback(async (target: FreezeTarget) => {
    const isFrozen = target.status === "frozen" || target.status === "paused";
    const freeze = !isFrozen;
    const label = config.entityType === "wallet" ? "Wallet" : "Card";
    try {
      const endpoint = config.freezeEndpoint || `/api/v1/${config.railPrefix}/freeze`;
      const res = await authFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [config.entityIdField]: target.id, frozen: freeze }),
      });
      if (res.ok) {
        toast({ title: freeze ? `${label} paused` : `${label} activated` });
        config.onUpdate?.();
      } else {
        toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  }, [config, toast]);

  const handleFreezeCard = useCallback(async (
    cardId: string,
    currentStatus: string,
    setCards: React.Dispatch<React.SetStateAction<any[]>>,
    setFreezeLoading: (v: boolean) => void,
    setFreezeTarget: (v: null) => void,
  ) => {
    const isFrozen = currentStatus === "frozen";
    const newStatus = isFrozen ? "active" : "frozen";

    setFreezeLoading(true);
    setCards((prev: any[]) => prev.map((c: any) => c.card_id === cardId ? { ...c, status: newStatus } : c));

    try {
      const endpoint = config.freezeEndpoint || `/api/v1/${config.railPrefix}/freeze`;
      const body = config.railPrefix === "rail5"
        ? { status: newStatus }
        : { card_id: cardId, frozen: !isFrozen };

      const url = config.railPrefix === "rail5"
        ? `/api/v1/rail5/cards/${cardId}`
        : endpoint;
      const method = config.railPrefix === "rail5" ? "PATCH" : "POST";

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setCards((prev: any[]) => prev.map((c: any) => c.card_id === cardId ? { ...c, status: currentStatus } : c));
        toast({ title: "Error", description: "Failed to update card status.", variant: "destructive" });
      } else {
        toast({
          title: newStatus === "frozen" ? "Card frozen" : "Card unfrozen",
          description: newStatus === "frozen" ? "All transactions on this card are paused." : "Transactions on this card are resumed.",
        });
      }
    } catch {
      setCards((prev: any[]) => prev.map((c: any) => c.card_id === cardId ? { ...c, status: currentStatus } : c));
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setFreezeLoading(false);
      setFreezeTarget(null);
    }
  }, [config, toast]);

  const syncBalance = useCallback(async (walletId: number) => {
    const cooldownEnd = syncCooldowns[walletId];
    if (cooldownEnd && Date.now() < cooldownEnd) {
      toast({ title: "Please wait 30 seconds between balance checks." });
      return;
    }

    const endpoint = config.syncEndpoint || `/api/v1/${config.railPrefix}/balance/sync`;
    setSyncingId(walletId);
    try {
      const res = await authFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_id: walletId }),
      });

      if (res.status === 429) {
        const data = await res.json();
        const retryAfter = data.retry_after || 30;
        setSyncCooldowns(prev => ({ ...prev, [walletId]: Date.now() + retryAfter * 1000 }));
        toast({ title: "Please wait 30 seconds between balance checks." });
        return { changed: false, balance_usdc: 0, balance_display: "" };
      }

      if (res.ok) {
        const data = await res.json();
        setSyncCooldowns(prev => ({ ...prev, [walletId]: Date.now() + 30 * 1000 }));
        if (data.changed) {
          toast({ title: `Balance updated to ${data.balance_display}` });
          config.onTransactionsRefresh?.(walletId);
        } else {
          toast({ title: "Balance confirmed — up to date" });
        }
        return { changed: data.changed, balance_usdc: data.balance_usdc, balance_display: data.balance_display };
      } else {
        toast({ title: "Could not reach the blockchain. You can try again in 30 seconds.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not reach the blockchain. You can try again in 30 seconds.", variant: "destructive" });
    } finally {
      setSyncingId(null);
    }
    return null;
  }, [syncCooldowns, toast, config]);

  const copyAddress = useCallback((address: string) => {
    navigator.clipboard.writeText(address);
    toast({ title: "Copied", description: "Wallet address copied." });
  }, [toast]);

  const copyCardId = useCallback((cardId: string) => {
    navigator.clipboard.writeText(cardId);
    toast({ title: "Copied", description: "Card ID copied to clipboard." });
  }, [toast]);

  const handleApprovalDecision = useCallback(async (
    approvalId: number | string,
    decision: "approve" | "reject",
    opts?: { onSuccess?: () => void },
  ) => {
    try {
      const endpoint = config.approvalsDecideEndpoint || `/api/v1/${config.railPrefix}/approvals/decide`;
      const res = await authFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval_id: approvalId, decision }),
      });
      if (res.ok) {
        toast({ title: decision === "approve" ? "Approved" : "Rejected" });
        opts?.onSuccess?.();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to process decision", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  }, [config.approvalsDecideEndpoint, config.railPrefix, toast]);

  const handleSyncAndPatch = useCallback(async <W extends { id: number; balance_usdc: number; balance_display: string }>(
    walletId: number,
    setWallets: React.Dispatch<React.SetStateAction<W[]>>,
  ) => {
    const result = await syncBalance(walletId);
    if (result) {
      setWallets(prev => prev.map(w =>
        w.id === walletId ? { ...w, balance_usdc: result.balance_usdc, balance_display: result.balance_display } : w
      ));
    }
  }, [syncBalance]);

  return {
    syncingId,
    syncCooldowns,
    handleFreeze,
    handleFreezeCard,
    syncBalance,
    handleSyncAndPatch,
    copyAddress,
    copyCardId,
    handleApprovalDecision,
  };
}
