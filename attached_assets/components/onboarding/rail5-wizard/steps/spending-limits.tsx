"use client";

import { Loader2, ArrowRight, ArrowLeft, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { wt } from "@/lib/wizard-typography";

interface SpendingLimitsProps {
  spendingLimit: string;
  setSpendingLimit: (v: string) => void;
  dailyLimit: string;
  setDailyLimit: (v: string) => void;
  monthlyLimit: string;
  setMonthlyLimit: (v: string) => void;
  approveAll: boolean;
  setApproveAll: (v: boolean) => void;
  approvalThreshold: string;
  setApprovalThreshold: (v: string) => void;
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function SpendingLimits({
  spendingLimit, setSpendingLimit,
  dailyLimit, setDailyLimit,
  monthlyLimit, setMonthlyLimit,
  approveAll, setApproveAll,
  approvalThreshold, setApprovalThreshold,
  loading, onBack, onNext,
}: SpendingLimitsProps) {
  return (
    <div className="space-y-6" data-testid="r5-step-limits">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6 text-orange-600" />
        </div>
        <h2 className={wt.title}>Spending Limits</h2>
        <p className={`${wt.subtitle} mt-1`}>Set hardened guardrails for how your bot can spend.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="r5-per-checkout">Per-Transaction Limit ($)</Label>
          <Input
            id="r5-per-checkout"
            type="number"
            min="1"
            step="0.01"
            value={spendingLimit}
            onChange={(e) => setSpendingLimit(e.target.value)}
            data-testid="input-r5-spending-limit"
          />
          <p className="text-xs text-neutral-400 mt-1">Max amount per individual purchase.</p>
        </div>

        <div>
          <Label htmlFor="r5-daily">Daily Limit ($)</Label>
          <Input
            id="r5-daily"
            type="number"
            min="1"
            step="0.01"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            data-testid="input-r5-daily-limit"
          />
        </div>

        <div>
          <Label htmlFor="r5-monthly">Monthly Limit ($)</Label>
          <Input
            id="r5-monthly"
            type="number"
            min="1"
            step="0.01"
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
            data-testid="input-r5-monthly-limit"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-neutral-900">Approve every transaction</p>
            <p className="text-xs text-neutral-400">You'll be asked to authorize each purchase.</p>
          </div>
          <Switch
            checked={approveAll}
            onCheckedChange={setApproveAll}
            className="data-[state=checked]:bg-success"
            data-testid="switch-r5-approve-all"
          />
        </div>

        {!approveAll && (
          <div>
            <Label htmlFor="r5-approval">Human Approval Above ($)</Label>
            <Input
              id="r5-approval"
              type="number"
              min="0"
              step="0.01"
              value={approvalThreshold}
              onChange={(e) => setApprovalThreshold(e.target.value)}
              data-testid="input-r5-approval-threshold"
            />
            <p className="text-xs text-neutral-400 mt-1">Purchases above this amount require your approval.</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className={`flex-1 ${wt.secondaryButton} gap-2`} data-testid="button-r5-step3-back">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={onNext} disabled={loading} className={`flex-1 ${wt.primaryButton} gap-2`} data-testid="button-r5-step3-next">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          Next
        </Button>
      </div>
    </div>
  );
}
