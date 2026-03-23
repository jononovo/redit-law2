"use client";

import { WizardStep } from "../wizard-step";
import { Button } from "@/components/ui/button";
import { CreditCard, ShieldCheck } from "lucide-react";

interface AddCardPromptProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

export function AddCardPrompt({ currentStep, totalSteps, onBack, onNext, onSkip }: AddCardPromptProps) {
  return (
    <WizardStep
      title="Add your credit card"
      subtitle="Your card is used to fund your bot's wallet. You set the limits — your bot can only spend what you allow."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      <div className="space-y-4 mb-6">
        <Button
          onClick={onNext}
          className="w-full rounded-xl h-12 md:h-14 text-base md:text-lg gap-2"
          data-testid="button-add-card-wizard"
        >
          <CreditCard className="w-5 h-5" />
          Add a Card
        </Button>

        <button
          onClick={onSkip}
          className="w-full text-sm text-neutral-400 hover:text-neutral-600 py-2 cursor-pointer"
          data-testid="button-skip-card"
        >
          Skip — I&apos;ll add one later
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-400 justify-center">
        <ShieldCheck className="w-3.5 h-3.5" />
        Your card details are encrypted and handled securely. CreditClaw never sees your card number.
      </div>
    </WizardStep>
  );
}
