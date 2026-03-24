"use client";

import { useState } from "react";
import { WizardStep } from "../wizard-step";
import { Button } from "@/components/ui/button";
import { wt } from "@/lib/wizard-typography";
import { BotInstructionBlock } from "../bot-instruction-block";

interface RegisterBotProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
}

export function RegisterBot({ currentStep, totalSteps, onBack, onNext }: RegisterBotProps) {
  const [copied, setCopied] = useState(false);

  return (
    <WizardStep
      title="Register your bot"
      subtitle="Give these instructions to your bot."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      <div className="mb-8">
        <BotInstructionBlock onCopied={() => setCopied(true)} />
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
          onClick={onNext}
          className="w-full text-sm text-neutral-400 hover:text-neutral-600 py-2 cursor-pointer"
          data-testid="button-skip-already-registered"
        >
          Skip — My bot already registered
        </button>
      </div>
    </WizardStep>
  );
}
