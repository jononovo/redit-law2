"use client";

import { useState, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";
import type { CryptoGuardrailForm, CardGuardrailForm } from "@/components/wallet/dialogs/guardrail-dialog";

interface GuardrailDefaults {
  crypto: CryptoGuardrailForm;
  card: CardGuardrailForm;
}

const DEFAULTS: GuardrailDefaults = {
  crypto: {
    max_per_tx_usdc: 100,
    daily_budget_usdc: 1000,
    monthly_budget_usdc: 10000,
    require_approval_above: null,
  },
  card: {
    max_per_tx_usdc: 50,
    daily_budget_usdc: 250,
    monthly_budget_usdc: 1000,
    require_approval_above: 0,
    allowlisted_merchants: "",
    blocklisted_merchants: "",
    auto_pause_on_zero: true,
  },
};

export interface UseGuardrailsConfig {
  variant: "crypto" | "card";
  railPrefix: string;
  procurementScope?: string;
  microUsdcMultiplier?: boolean;
  onUpdate?: () => void;
}

export function useGuardrails<W extends { id: number; bot_name?: string; guardrails: any }>(config: UseGuardrailsConfig) {
  const { toast } = useToast();
  const [guardrailsDialogOpen, setGuardrailsDialogOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<W | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultForm = config.variant === "crypto" ? { ...DEFAULTS.crypto } : { ...DEFAULTS.card };
  const [form, setForm] = useState<CryptoGuardrailForm | CardGuardrailForm>(defaultForm);

  const openDialog = useCallback((wallet: W) => {
    setSelectedWallet(wallet);
    if (wallet.guardrails) {
      if (config.variant === "crypto") {
        setForm({
          max_per_tx_usdc: wallet.guardrails.max_per_tx_usdc,
          daily_budget_usdc: wallet.guardrails.daily_budget_usdc,
          monthly_budget_usdc: wallet.guardrails.monthly_budget_usdc,
          require_approval_above: wallet.guardrails.require_approval_above,
        });
      } else {
        const m = config.microUsdcMultiplier ? 1_000_000 : 1;
        setForm({
          max_per_tx_usdc: wallet.guardrails.max_per_tx_usdc / m,
          daily_budget_usdc: wallet.guardrails.daily_budget_usdc / m,
          monthly_budget_usdc: wallet.guardrails.monthly_budget_usdc / m,
          require_approval_above: (wallet.guardrails.require_approval_above || 0) / m,
          allowlisted_merchants: (wallet.guardrails.allowlisted_merchants || []).join(", "),
          blocklisted_merchants: (wallet.guardrails.blocklisted_merchants || []).join(", "),
          auto_pause_on_zero: wallet.guardrails.auto_pause_on_zero ?? true,
        } as CardGuardrailForm);
      }
    }
    setGuardrailsDialogOpen(true);
  }, [config.variant, config.microUsdcMultiplier]);

  const save = useCallback(async () => {
    if (!selectedWallet) return;
    setSaving(true);
    try {
      if (config.variant === "crypto") {
        const res = await authFetch(`/api/v1/${config.railPrefix}/guardrails`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet_id: selectedWallet.id,
            ...form,
          }),
        });
        if (res.ok) {
          toast({ title: "Guardrails updated" });
          setGuardrailsDialogOpen(false);
          config.onUpdate?.();
        }
      } else {
        const cardForm = form as CardGuardrailForm;
        const m = config.microUsdcMultiplier ? 1_000_000 : 1;
        const allowlisted = cardForm.allowlisted_merchants.split(",").map(s => s.trim()).filter(Boolean);
        const blocklisted = cardForm.blocklisted_merchants.split(",").map(s => s.trim()).filter(Boolean);

        const [guardrailRes, procRes] = await Promise.all([
          authFetch(`/api/v1/${config.railPrefix}/guardrails`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wallet_id: selectedWallet.id,
              max_per_tx_usdc: cardForm.max_per_tx_usdc * m,
              daily_budget_usdc: cardForm.daily_budget_usdc * m,
              monthly_budget_usdc: cardForm.monthly_budget_usdc * m,
              require_approval_above: cardForm.require_approval_above * m,
              auto_pause_on_zero: cardForm.auto_pause_on_zero,
            }),
          }),
          authFetch("/api/v1/procurement-controls", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scope: config.procurementScope || config.railPrefix,
              allowlisted_merchants: allowlisted.length > 0 ? allowlisted : [],
              blocklisted_merchants: blocklisted.length > 0 ? blocklisted : [],
            }),
          }),
        ]);
        if (guardrailRes.ok && procRes.ok) {
          toast({ title: "Guardrails updated" });
          setGuardrailsDialogOpen(false);
          config.onUpdate?.();
        } else {
          const data = await (guardrailRes.ok ? procRes : guardrailRes).json();
          toast({ title: "Error", description: data.error, variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Failed to save guardrails", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [selectedWallet, form, config, toast]);

  return {
    guardrailsDialogOpen,
    setGuardrailsDialogOpen,
    selectedWallet,
    form,
    setForm,
    saving,
    openDialog,
    save,
  };
}
