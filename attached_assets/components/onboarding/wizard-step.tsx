"use client";

import { ArrowLeft } from "lucide-react";
import { wt } from "@/lib/wizard-typography";

interface WizardStepProps {
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  showBack?: boolean;
  children: React.ReactNode;
}

export function WizardStep({ title, subtitle, currentStep, totalSteps, onBack, showBack = true, children }: WizardStepProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <div className="w-full bg-neutral-200 h-1.5 sticky top-0 z-10">
        <div
          className="h-full bg-primary rounded-r-full"
          style={{ width: `${progress}%`, transition: "width 0.4s ease" }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {showBack && onBack && (
            <button
              onClick={onBack}
              className={`flex items-center gap-2 text-neutral-400 hover:text-neutral-600 mb-8 ${wt.body} cursor-pointer`}
              data-testid="button-wizard-back"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          <h1 className={`${wt.title} mb-2 font-[var(--font-plus-jakarta)]`}>
            {title}
          </h1>
          {subtitle && (
            <p className={`${wt.subtitle} mb-8`}>{subtitle}</p>
          )}
          {!subtitle && <div className="mb-8" />}

          {children}
        </div>
      </div>
    </div>
  );
}
