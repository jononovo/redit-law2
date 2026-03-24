"use client";

import { WizardStep } from "../wizard-step";
import { ShieldCheck, Zap, Tag } from "lucide-react";

export type ApprovalModeValue = "ask_for_everything" | "auto_approve_under_threshold" | "auto_approve_by_category";

interface ApprovalModeProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: (mode: ApprovalModeValue) => void;
  defaultMode: ApprovalModeValue;
  Wrapper?: React.ComponentType<any>;
}

const options: { value: ApprovalModeValue; label: string; subtitle: string; Icon: typeof ShieldCheck }[] = [
  { value: "ask_for_everything", label: "Ask me every time", subtitle: "Most secure. You approve every transaction.", Icon: ShieldCheck },
  { value: "auto_approve_under_threshold", label: "Auto-approve small purchases", subtitle: "You only get asked for bigger ones.", Icon: Zap },
  { value: "auto_approve_by_category", label: "Auto-approve by category", subtitle: "You pick what's okay, everything else needs approval.", Icon: Tag },
];

export function ApprovalMode({ currentStep, totalSteps, onBack, onNext, defaultMode, Wrapper }: ApprovalModeProps) {
  const Step = Wrapper || WizardStep;
  return (
    <Step
      title="How should your bot handle purchases?"
      subtitle="You can always change this later from the dashboard."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      <div className="space-y-3">
        {options.map(({ value, label, subtitle, Icon }) => (
          <button
            key={value}
            onClick={() => onNext(value)}
            className={`w-full p-5 rounded-2xl border-2 text-left cursor-pointer transition-all ${
              defaultMode === value
                ? "border-primary bg-primary/5"
                : "border-neutral-200 bg-white hover:border-primary hover:bg-primary/5"
            }`}
            data-testid={`option-${value}`}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-neutral-100">
                <Icon className="w-5 h-5 text-neutral-500" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900">{label}</p>
                <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </Step>
  );
}
