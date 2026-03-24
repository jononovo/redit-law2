"use client";

import { useState } from "react";
import { WizardStep } from "../wizard-step";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ApprovalThresholdProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: (thresholdCents: number) => void;
  defaultCents: number;
  Wrapper?: React.ComponentType<any>;
}

const presets = [500, 1000, 2500, 5000];

export function ApprovalThreshold({ currentStep, totalSteps, onBack, onNext, defaultCents, Wrapper }: ApprovalThresholdProps) {
  const [amountCents, setAmountCents] = useState(defaultCents);
  const [customMode, setCustomMode] = useState(!presets.includes(defaultCents));

  function handlePreset(cents: number) {
    setAmountCents(cents);
    setCustomMode(false);
  }

  const Step = Wrapper || WizardStep;
  return (
    <Step
      title="Auto-approve purchases under..."
      subtitle="Anything above this amount will need your approval."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-2 gap-3">
          {presets.map((cents) => (
            <button
              key={cents}
              onClick={() => handlePreset(cents)}
              className={`p-4 rounded-xl border-2 text-center font-semibold cursor-pointer transition-all ${
                amountCents === cents && !customMode
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-neutral-200 bg-white hover:border-neutral-300 text-neutral-700"
              }`}
              data-testid={`preset-${cents}`}
            >
              ${(cents / 100).toFixed(0)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCustomMode(true)}
            className={`px-4 py-2 rounded-xl border-2 text-sm cursor-pointer transition-all ${
              customMode ? "border-primary bg-primary/5 text-primary" : "border-neutral-200 text-neutral-500"
            }`}
          >
            Custom
          </button>
          {customMode && (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-neutral-500 font-medium">$</span>
              <Input
                type="number"
                min={1}
                max={10000}
                value={amountCents / 100}
                onChange={(e) => setAmountCents(Math.round(Number(e.target.value) * 100))}
                className="rounded-xl"
                data-testid="input-custom-threshold"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={() => onNext(amountCents)}
        disabled={amountCents < 100}
        className="w-full rounded-xl h-12 md:h-14 text-base md:text-lg"
        data-testid="button-continue"
      >
        Continue
      </Button>
    </Step>
  );
}
