"use client";

import { useState } from "react";
import { WizardStep } from "../wizard-step";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface ApprovedCategoriesProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: (approved: string[]) => void;
  defaultApproved: string[];
  Wrapper?: React.ComponentType<any>;
}

const CATEGORIES = [
  { value: "api_services", label: "API services & SaaS" },
  { value: "cloud_compute", label: "Cloud compute & hosting" },
  { value: "research_data", label: "Research & data access" },
  { value: "physical_goods", label: "Physical goods & shipping" },
  { value: "advertising", label: "Advertising & marketing" },
  { value: "entertainment", label: "Entertainment & media" },
];

export function ApprovedCategories({ currentStep, totalSteps, onBack, onNext, defaultApproved, Wrapper }: ApprovedCategoriesProps) {
  const [approved, setApproved] = useState<string[]>(defaultApproved);

  function toggle(value: string) {
    setApproved((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  const Step = Wrapper || WizardStep;
  return (
    <Step
      title="What can your bot spend on without asking?"
      subtitle="Purchases in these categories will be auto-approved."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      <div className="space-y-3 mb-8">
        {CATEGORIES.map(({ value, label }) => (
          <label
            key={value}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-neutral-200 cursor-pointer hover:border-neutral-300"
          >
            <Checkbox
              checked={approved.includes(value)}
              onCheckedChange={() => toggle(value)}
              data-testid={`checkbox-${value}`}
            />
            <span className="text-neutral-900 font-medium">{label}</span>
          </label>
        ))}
      </div>

      <Button
        onClick={() => onNext(approved)}
        className="w-full rounded-xl h-12 md:h-14 text-base md:text-lg"
        data-testid="button-continue"
      >
        Continue
      </Button>
    </Step>
  );
}
