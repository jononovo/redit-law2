"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WizardStep } from "../wizard-step";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, Check, AlertCircle } from "lucide-react";

interface ConnectBotProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: (botId: string, botName: string) => void;
  onSkip: () => void;
  pairingCode: string | null;
}

export function ConnectBot({ currentStep, totalSteps, onBack, onNext, onSkip, pairingCode }: ConnectBotProps) {
  const [tab, setTab] = useState<"pairing" | "token">(pairingCode ? "pairing" : "token");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const advancedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkPairingStatus = useCallback(async () => {
    if (!pairingCode || advancedRef.current) return;
    try {
      const res = await fetch(`/api/v1/pairing-codes/status?code=${pairingCode}`);
      const data = await res.json();
      if (data.status === "paired" && !advancedRef.current) {
        advancedRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        onNext(data.bot_id, data.bot_name || "Your bot");
      }
    } catch {}
  }, [pairingCode, onNext]);

  useEffect(() => {
    if (tab !== "pairing" || !pairingCode) return;
    intervalRef.current = setInterval(checkPairingStatus, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tab, pairingCode, checkPairingStatus]);

  async function handleClaim() {
    if (!token.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/bots/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_token: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid claim token.");
        setLoading(false);
        return;
      }
      onNext(data.bot_id, data.bot_name);
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <WizardStep
      title="Connect your bot to finish setup"
      subtitle="Link a bot to save your spending preferences."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      {pairingCode && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("pairing")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer ${
              tab === "pairing" ? "bg-primary text-white" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            Pairing Code
          </button>
          <button
            onClick={() => setTab("token")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer ${
              tab === "token" ? "bg-primary text-white" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            Claim Token
          </button>
        </div>
      )}

      {tab === "pairing" && pairingCode ? (
        <div className="space-y-4 mb-8">
          <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              {pairingCode.split("").map((digit, i) => (
                <span key={i} className="text-3xl font-mono font-bold text-neutral-900">{digit}</span>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="text-neutral-500 gap-2">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-neutral-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Waiting for your bot...
          </div>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          <Input
            value={token}
            onChange={(e) => { setToken(e.target.value); setError(null); }}
            placeholder="e.g. coral-X9K2"
            className="rounded-xl h-12 md:h-14 text-base md:text-lg"
            data-testid="input-claim-token-fallback"
          />
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {tab === "token" && (
          <Button
            onClick={handleClaim}
            disabled={!token.trim() || loading}
            className="w-full rounded-xl h-12 md:h-14 text-base md:text-lg"
            data-testid="button-claim-fallback"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Claim Bot"}
          </Button>
        )}
        <button
          onClick={onSkip}
          className="w-full text-sm text-neutral-400 hover:text-neutral-600 py-2 cursor-pointer"
          data-testid="button-skip-connect"
        >
          Skip — I&apos;ll connect later
        </button>
      </div>
    </WizardStep>
  );
}
