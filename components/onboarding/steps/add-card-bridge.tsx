"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WizardStep } from "../wizard-step";
import { wt } from "@/lib/wizard-typography";

interface AddCardBridgeProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

export function AddCardBridge({ currentStep, totalSteps, onBack, onNext, onSkip }: AddCardBridgeProps) {
  return (
    <WizardStep
      title="Ready to add your card?"
      subtitle="Set up your encrypted card so your bot can make purchases."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      <div className="space-y-6">
        <Button
          onClick={onNext}
          className={`w-full ${wt.primaryButton} gap-2 cursor-pointer`}
          data-testid="button-add-card-yes"
        >
          Yes, let's add a card
          <ArrowRight className="w-4 h-4" />
        </Button>

        <div className="text-center">
          <button
            onClick={onSkip}
            className={`${wt.body} text-neutral-400 hover:text-neutral-600 py-2 cursor-pointer`}
            data-testid="button-add-card-skip"
          >
            Skip — I'll do this later
          </button>
        </div>
      </div>
    </WizardStep>
  );
}
