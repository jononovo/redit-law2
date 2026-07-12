"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WizardStep } from "../wizard-step";
import { Button } from "@/components/ui/button";
import { wt } from "@/lib/wizard-typography";
import { BotInstructionBlock } from "../bot-instruction-block";
import { formatPairingCodeForDisplay } from "@/features/platform-management/agent-management/pairing-code-format";
import { Loader2, RefreshCw } from "lucide-react";

interface RegisterAgentWithCodeProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onAgentRegistered: (botId: string, botName: string) => void;
  pairingCode: string | null;
  onCodeGenerated: (code: string) => void;
}

export function RegisterAgentWithCode({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSkip,
  onAgentRegistered,
  pairingCode,
  onCodeGenerated,
}: RegisterAgentWithCodeProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const registeredRef = useRef(false);
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
    if (!pairingCode || registeredRef.current) return;
    try {
      const res = await fetch(`/api/v1/pairing-codes/status?code=${pairingCode}`);
      const data = await res.json();
      if (data.status === "registered" && !registeredRef.current) {
        registeredRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        onAgentRegistered(data.bot_id, data.bot_name || "Your agent");
      }
    } catch {}
  }, [pairingCode, onAgentRegistered]);

  useEffect(() => {
    if (!pairingCode) return;
    intervalRef.current = setInterval(checkStatus, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pairingCode, checkStatus]);

  return (
    <WizardStep
      title="Register your agent"
      subtitle="Give these instructions to your agent."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      <div className="mb-8 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 text-sm mb-4" data-testid="text-code-error">{error}</p>
            <Button variant="outline" onClick={generateCode} className="rounded-xl gap-2" data-testid="button-retry-code">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        ) : (
          <>
            <BotInstructionBlock
              code={pairingCode ? formatPairingCodeForDisplay(pairingCode) : undefined}
              onCopied={() => setCopied(true)}
            />
            {copied && (
              <div className="flex items-center justify-center gap-2 text-sm text-neutral-500" data-testid="status-waiting-registration">
                <Loader2 className="w-4 h-4 animate-spin" />
                Waiting for your agent to register — you can continue in the meantime.
              </div>
            )}
          </>
        )}
      </div>

      <div className="space-y-3">
        <Button
          onClick={onNext}
          disabled={!copied}
          variant={copied ? "default" : "outline"}
          className={`w-full ${wt.primaryButton} cursor-pointer`}
          data-testid="button-register-continue"
        >
          Continue
        </Button>
        <button
          onClick={onSkip}
          className="w-full text-sm text-neutral-400 hover:text-neutral-600 py-2 cursor-pointer"
          data-testid="button-skip-already-registered"
        >
          Skip — My agent already registered
        </button>
      </div>
    </WizardStep>
  );
}
