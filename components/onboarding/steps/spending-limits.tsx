"use client";

import { useState } from "react";
import { WizardStep } from "../wizard-step";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

interface SpendingLimitsProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: (perTx: number, daily: number, monthly: number) => void;
  defaultPerTx: number;
  defaultDaily: number;
  defaultMonthly: number;
}

function LimitRow({ label, valueCents, onChange, min, max, step = 500 }: {
  label: string;
  valueCents: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4">
      <label className="text-sm font-medium text-neutral-700 mb-3 block">{label}</label>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, valueCents - step))}
          className="w-10 h-10 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 cursor-pointer"
          data-testid={`button-decrease-${label.toLowerCase().replace(/\s/g, "-")}`}
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="flex-1 flex items-center gap-1">
          <span className="text-neutral-500">$</span>
          <Input
            type="number"
            min={min / 100}
            max={max / 100}
            value={valueCents / 100}
            onChange={(e) => onChange(Math.round(Number(e.target.value) * 100))}
            className="rounded-lg text-center font-semibold"
          />
        </div>
        <button
          onClick={() => onChange(Math.min(max, valueCents + step))}
          className="w-10 h-10 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 cursor-pointer"
          data-testid={`button-increase-${label.toLowerCase().replace(/\s/g, "-")}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function SpendingLimits({ currentStep, totalSteps, onBack, onNext, defaultPerTx, defaultDaily, defaultMonthly }: SpendingLimitsProps) {
  const [perTx, setPerTx] = useState(defaultPerTx);
  const [daily, setDaily] = useState(defaultDaily);
  const [monthly, setMonthly] = useState(defaultMonthly);

  return (
    <WizardStep
      title="Set your master spending limits"
      subtitle="These limits apply across all payment methods you add."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      <div className="space-y-4 mb-8">
        <LimitRow label="Per transaction max" valueCents={perTx} onChange={setPerTx} min={100} max={10000000} step={500} />
        <LimitRow label="Daily max" valueCents={daily} onChange={setDaily} min={100} max={10000000} step={1000} />
        <LimitRow label="Monthly max" valueCents={monthly} onChange={setMonthly} min={100} max={100000000} step={5000} />
      </div>

      <Button
        onClick={() => onNext(perTx, daily, monthly)}
        className="w-full rounded-xl h-12 md:h-14 text-base md:text-lg"
        data-testid="button-continue"
      >
        Continue
      </Button>
    </WizardStep>
  );
}
