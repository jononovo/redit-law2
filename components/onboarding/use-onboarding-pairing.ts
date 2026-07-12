"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { useToast } from "@/hooks/use-toast";

const PAIRING_CODE_STORAGE_KEY = "creditclaw_onboarding_pairing_code";

interface UseOnboardingPairingOptions {
  claimEligible: boolean;
  onAgentLinked: (botId: string, botName: string) => void;
  onCodeAdopted: () => void;
  onClaimFallback: () => void;
}

export function useOnboardingPairing({
  claimEligible,
  onAgentLinked,
  onCodeAdopted,
  onClaimFallback,
}: UseOnboardingPairingOptions) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [pairingCode, setPairingCode] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(PAIRING_CODE_STORAGE_KEY);
  });
  const [claiming, setClaiming] = useState(false);
  const claimAttemptedRef = useRef(false);

  const handleCodeGenerated = useCallback((code: string) => {
    sessionStorage.setItem(PAIRING_CODE_STORAGE_KEY, code);
    setPairingCode(code);
  }, []);

  const clearPairingCode = useCallback(() => {
    sessionStorage.removeItem(PAIRING_CODE_STORAGE_KEY);
    setPairingCode(null);
  }, []);

  const runClaim = useCallback(async (code: string) => {
    setClaiming(true);
    try {
      const { authFetch } = await import("@/features/platform-management/auth-fetch");
      const res = await authFetch("/api/v1/pairing-codes/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (res.ok && data.status === "claimed") {
        sessionStorage.removeItem(PAIRING_CODE_STORAGE_KEY);
        toast({ title: `${data.bot_name} connected`, description: "Your agent is linked to your account." });
        onAgentLinked(data.bot_id, data.bot_name);
        return;
      }

      if (res.ok && data.status === "adopted") {
        sessionStorage.removeItem(PAIRING_CODE_STORAGE_KEY);
        toast({ title: "Code linked", description: "Your agent will connect automatically when it registers." });
        onCodeAdopted();
        return;
      }

      toast({
        title: "Couldn't link your agent",
        description: data.error || "Enter your agent's claim token instead.",
        variant: "destructive",
      });
      onClaimFallback();
    } catch {
      toast({
        title: "Couldn't link your agent",
        description: "Enter your agent's claim token instead.",
        variant: "destructive",
      });
      onClaimFallback();
    } finally {
      setClaiming(false);
    }
  }, [toast, onAgentLinked, onCodeAdopted, onClaimFallback]);

  useEffect(() => {
    if (!user || !pairingCode || !claimEligible || claimAttemptedRef.current) return;
    claimAttemptedRef.current = true;
    runClaim(pairingCode);
  }, [user, pairingCode, claimEligible, runClaim]);

  return { pairingCode, claiming, handleCodeGenerated, clearPairingCode };
}
