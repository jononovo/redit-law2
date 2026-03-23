"use client";

import { useState } from "react";
import { WizardStep } from "../wizard-step";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface SpecialInstructionsProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: (notes: string) => void;
  defaultNotes: string;
  Wrapper?: React.ComponentType<any>;
}

export function SpecialInstructions({ currentStep, totalSteps, onBack, onNext, defaultNotes, Wrapper }: SpecialInstructionsProps) {
  const [notes, setNotes] = useState(defaultNotes);

  const Step = Wrapper || WizardStep;
  return (
    <Step
      title="Any special instructions for your bot?"
      subtitle="Optional guidelines your bot should follow when spending."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      <div className="mb-8">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Prefer free tiers before paying. Always check for discount codes. No annual plans without asking me first."
          className="rounded-xl min-h-[120px] text-base resize-none"
          maxLength={2000}
          data-testid="input-notes"
        />
        <p className="text-xs text-neutral-400 mt-2 text-right">{notes.length}/2000</p>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => onNext(notes)}
          className="w-full rounded-xl h-12 md:h-14 text-base md:text-lg"
          data-testid="button-continue"
        >
          {notes.trim() ? "Continue" : "Skip"}
        </Button>
      </div>
    </Step>
  );
}
