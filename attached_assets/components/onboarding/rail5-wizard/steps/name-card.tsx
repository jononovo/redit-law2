"use client";

import { Loader2, ArrowRight, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { wt } from "@/lib/wizard-typography";

interface NameCardProps {
  cardName: string;
  setCardName: (v: string) => void;
  loading: boolean;
  onNext: () => void;
}

export function NameCard({ cardName, setCardName, loading, onNext }: NameCardProps) {
  return (
    <div className="space-y-6" data-testid="r5-step-card-info">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <CreditCard className="w-6 h-6 text-primary" />
        </div>
        <h2 className={wt.title}>Name Your Card</h2>
      </div>

      <div className="space-y-4">
        <div>
          <Input
            id="r5-card-name"
            placeholder="e.g. Harry's Visa"
            value={cardName}
            onChange={(e) => setCardName(e.target.value.slice(0, 200))}
            data-testid="input-r5-card-name"
          />
        </div>

      </div>

      <Button onClick={onNext} disabled={loading} className={`w-full ${wt.primaryButton} gap-2`} data-testid="button-r5-step1-next">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        Next
      </Button>
    </div>
  );
}
