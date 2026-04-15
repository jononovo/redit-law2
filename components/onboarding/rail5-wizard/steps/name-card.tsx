"use client";

import { CreditCard, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { wt } from "@/lib/wizard-typography";
import { StepHeader } from "../step-header";

interface NameCardProps {
  cardName: string;
  setCardName: (name: string) => void;
  loading: boolean;
  onNext: () => void;
}

export function NameCard({ cardName, setCardName, loading, onNext }: NameCardProps) {
  return (
    <div className="space-y-6" data-testid="r5-step-name">
      <StepHeader icon={CreditCard} iconBg="bg-primary/10" iconColor="text-primary" title="Name Your Card" />

      <div className="mx-auto w-full max-w-xs">
        <Input
          value={cardName}
          onChange={(e) => setCardName(e.target.value.slice(0, 200))}
          placeholder="e.g. Titanium Claw"
          className="text-left text-lg"
          data-testid="input-card-name"
        />
      </div>

      <div className="mx-auto w-full max-w-xs">
        <Button
          onClick={onNext}
          disabled={loading || !cardName.trim()}
          className={`w-full ${wt.primaryButton} gap-2`}
          data-testid="button-r5-step1-next"
        >
          {loading ? "Setting up…" : "Next"} <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
