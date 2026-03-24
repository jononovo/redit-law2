"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WizardStep } from "../wizard-step";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, RefreshCw } from "lucide-react";

interface PairingCodeProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: (botId: string, botName: string) => void;
  onSkip: () => void;
  pairingCode: string | null;
  onCodeGenerated: (code: string) => void;
}

export function PairingCode({ currentStep, totalSteps, onBack, onNext, onSkip, pairingCode, onCodeGenerated }: PairingCodeProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const advancedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const generateCode = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/pairing-codes", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate code");
        return;
      }
      onCodeGenerated(data.code);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [onCodeGenerated]);

  useEffect(() => {
    if (!pairingCode) {
      generateCode();
    }
  }, [pairingCode, generateCode]);

  const checkStatus = useCallback(async () => {
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
    if (!pairingCode) return;
    setPolling(true);
    intervalRef.current = setInterval(checkStatus, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pairingCode, checkStatus]);

  function handleCopy() {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleManualCheck() {
    setPolling(true);
    await checkStatus();
  }

  const codeDigits = pairingCode ? pairingCode.split("") : [];

  return (
    <WizardStep
      title="Give this code to your bot"
      subtitle="Tell your bot to register at creditclaw.com with this pairing code."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      <div className="space-y-6 mb-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <Button variant="outline" onClick={generateCode} className="rounded-xl gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border-2 border-neutral-200 p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                {codeDigits.map((digit, i) => (
                  <span key={i} className="text-4xl md:text-5xl font-mono font-bold text-neutral-900 tracking-wider">
                    {digit}
                  </span>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-neutral-500 gap-2"
                data-testid="button-copy-code"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy code"}
              </Button>
            </div>

            {polling && (
              <div className="flex items-center justify-center gap-2 text-sm text-neutral-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Waiting for your bot to register...
              </div>
            )}
          </>
        )}
      </div>

      <div className="space-y-3">
        <Button
          onClick={handleManualCheck}
          disabled={!pairingCode}
          className="w-full rounded-xl h-12 md:h-14 text-base md:text-lg"
          data-testid="button-check-pairing"
        >
          My bot has registered
        </Button>
        <button
          onClick={onSkip}
          className="w-full text-sm text-neutral-400 hover:text-neutral-600 py-2 cursor-pointer"
          data-testid="button-skip-pairing"
        >
          Skip — I&apos;ll connect later
        </button>
      </div>
    </WizardStep>
  );
}
