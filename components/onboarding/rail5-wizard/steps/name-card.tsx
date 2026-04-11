"use client";

import { CreditCard, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { wt } from "@/lib/wizard-typography";

interface NameCardProps {
  cardName: string;
  setCardName: (name: string) => void;
  loading: boolean;
  onNext: () => void;
}

export function NameCard({ cardName, setCardName, loading, onNext }: NameCardProps) {
  return (
    <div className="space-y-6" data-testid="r5-step-name">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <CreditCard className="w-6 h-6 text-primary" />
        </div>
        <h2 className={wt.title}>Name Your Card</h2>
      </div>

      <div>
        <Input
          value={cardName}
          onChange={(e) => setCardName(e.target.value.slice(0, 200))}
          placeholder="e.g. Titanium Claw"
          className="text-center text-lg"
          data-testid="input-card-name"
        />
      </div>

      <Button
        onClick={onNext}
        disabled={loading || !cardName.trim()}
        className={`w-full ${wt.primaryButton} gap-2`}
        data-testid="button-r5-step1-next"
      >
        {loading ? "Setting up…" : "Next"} <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
