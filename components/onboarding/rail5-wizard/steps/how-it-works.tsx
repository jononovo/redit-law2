"use client";

import { ArrowRight, ArrowLeft, Shield, Lock, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wt } from "@/lib/wizard-typography";
import { StepHeader } from "../step-header";

interface HowItWorksProps {
  onBack?: () => void;
  onNext: () => void;
}

export function HowItWorks({ onBack, onNext }: HowItWorksProps) {
  return (
    <div className="space-y-6" data-testid="r5-step-explanation">
      <StepHeader icon={Shield} iconBg="bg-emerald-50" iconColor="text-emerald-600" title="How It Works" />

      <div className="bg-emerald-50 rounded-xl p-5 space-y-3">
        <div className="space-y-4 text-lg md:text-xl text-neutral-600">
          <div className="flex items-start gap-2">
            <Lock className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>Card details are <strong>encrypted</strong> and delivered to your agent.</span>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>Agent requests approval before every transaction.</span>
          </div>
          <div className="flex items-start gap-2">
            <Bot className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>A disposable sub-agent decrypts, pays and is deleted.</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {onBack && (
          <Button variant="outline" onClick={onBack} className={`flex-1 ${wt.secondaryButton} gap-2`} data-testid="button-r5-step2-back">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        )}
        <Button onClick={onNext} className={`flex-1 ${wt.primaryButton} gap-2`} data-testid="button-r5-step2-next">
          Got It <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
