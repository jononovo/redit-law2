"use client";

import { useState } from "react";
import { WizardStep } from "../wizard-step";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";

interface BlockedCategoriesProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: (blocked: string[]) => void;
  defaultBlocked: string[];
  Wrapper?: React.ComponentType<any>;
}

const SAFETY_CATEGORIES = [
  { value: "gambling", label: "Gambling" },
  { value: "adult_content", label: "Adult content" },
  { value: "cryptocurrency", label: "Cryptocurrency" },
  { value: "cash_advances", label: "Cash advances" },
];

export function BlockedCategories({ currentStep, totalSteps, onBack, onNext, defaultBlocked, Wrapper }: BlockedCategoriesProps) {
  const [blocked, setBlocked] = useState<string[]>(defaultBlocked);

  function toggle(value: string) {
    setBlocked((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  const removedDefaults = SAFETY_CATEGORIES
    .filter(c => !blocked.includes(c.value))
    .filter(c => ["gambling", "adult_content", "cryptocurrency", "cash_advances"].includes(c.value));

  const Step = Wrapper || WizardStep;
  return (
    <Step
      title="What should your bot never spend on?"
      subtitle="These categories are blocked by default for safety."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      <div className="space-y-3 mb-6">
        {SAFETY_CATEGORIES.map(({ value, label }) => (
          <label
            key={value}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-neutral-200 cursor-pointer hover:border-neutral-300"
          >
            <Checkbox
              checked={blocked.includes(value)}
              onCheckedChange={() => toggle(value)}
              data-testid={`checkbox-${value}`}
            />
            <span className="text-neutral-900 font-medium">{label}</span>
          </label>
        ))}
      </div>

      {removedDefaults.length > 0 && (
        <div className="flex items-start gap-2 text-amber-600 text-sm mb-6 bg-amber-50 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>You&apos;ve unblocked categories that are blocked by default for safety. Make sure this is intentional.</span>
        </div>
      )}

      <Button
        onClick={() => onNext(blocked)}
        className="w-full rounded-xl h-12 md:h-14 text-base md:text-lg"
        data-testid="button-continue"
      >
        Continue
      </Button>
    </Step>
  );
}
