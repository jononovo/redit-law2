"use client";

import { useState } from "react";
import { WizardStep } from "../wizard-step";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { wt } from "@/lib/wizard-typography";
import { Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { BotInstructionBlock } from "../bot-instruction-block";

interface ClaimTokenProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: (botId: string, botName: string) => void;
  onSkip?: () => void;
}

export function ClaimToken({ currentStep, totalSteps, onBack, onNext, onSkip }: ClaimTokenProps) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

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
        setError(data.error || "Invalid claim token. Please check and try again.");
        setLoading(false);
        return;
      }

      onNext(data.bot_id, data.bot_name);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <WizardStep
      title="Enter your bot's claim token"
      subtitle="This was provided when your bot registered. Check your email if you're not sure."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      <div className="space-y-4 mb-8">
        <Input
          value={token}
          onChange={(e) => { setToken(e.target.value); setError(null); }}
          placeholder="e.g. coral-X9K2"
          className="rounded-xl h-12 md:h-14 text-base md:text-lg"
          data-testid="input-claim-token"
          autoFocus
        />

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={() => setHelpOpen(!helpOpen)}
          className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-600 cursor-pointer"
          data-testid="button-help-claim-token"
        >
          {helpOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Not sure where to find your claim token?
        </button>

        {helpOpen && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500">
              Give this instruction to your OpenClaw bot. It will return with the claim token.
            </p>
            <BotInstructionBlock />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Button
          onClick={handleClaim}
          disabled={!token.trim() || loading}
          className={`w-full ${wt.primaryButton} cursor-pointer`}
          data-testid="button-claim"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Claim Bot"}
        </Button>
        {onSkip && (
          <button
            onClick={onSkip}
            className="w-full text-sm text-neutral-400 hover:text-neutral-600 py-2 cursor-pointer"
            data-testid="button-skip-claim"
          >
            Skip — I&apos;ll add my bot later
          </button>
        )}
      </div>
    </WizardStep>
  );
}
