"use client";

import { useEffect, useRef } from "react";
import { WizardStep } from "../wizard-step";
import { Button } from "@/components/ui/button";
import { CheckCircle, Bot, DollarSign, TrendingUp } from "lucide-react";
import Link from "next/link";

interface WizardState {
  botId: string | null;
  botName: string | null;
  botConnected: boolean;
  perTransactionCents: number;
  dailyCents: number;
  monthlyCents: number;
  fundedAmountCents: number;
}

interface CompleteProps {
  currentStep: number;
  totalSteps: number;
  state: WizardState;
}

export function Complete({ currentStep, totalSteps, state }: CompleteProps) {
  const hasSaved = useRef(false);

  useEffect(() => {
    if (hasSaved.current) return;
    hasSaved.current = true;

    fetch("/api/v1/master-guardrails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        max_per_tx_usdc: Math.round(state.perTransactionCents / 100),
        daily_budget_usdc: Math.round(state.dailyCents / 100),
        monthly_budget_usdc: Math.round(state.monthlyCents / 100),
        enabled: true,
      }),
    }).catch((err) => console.error("Failed to save master guardrails:", err));

    fetch("/api/v1/owners/onboarded", {
      method: "POST",
    }).catch((err) => console.error("Failed to stamp onboarded_at:", err));

    if (state.botId && state.botConnected) {
      fetch("/api/v1/stripe-wallet/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: state.botId }),
      }).catch((err) => console.error("Failed to auto-create Privy wallet:", err));
    }
  }, [state.perTransactionCents, state.dailyCents, state.monthlyCents, state.botId, state.botConnected]);

  return (
    <WizardStep
      title="You're all set!"
      currentStep={currentStep}
      totalSteps={totalSteps}
      showBack={false}
    >
      <div className="space-y-4 mb-8">
        <div className="bg-green-50 rounded-2xl p-6 flex items-center gap-4">
          <CheckCircle className="w-10 h-10 text-green-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-900">Setup complete</p>
            <p className="text-sm text-green-700">Your master spending limits are active. These apply across all payment methods you add.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100">
          <div className="p-4 flex items-center gap-3">
            <Bot className="w-5 h-5 text-neutral-500" />
            <div>
              <p className="text-xs text-neutral-500">Bot</p>
              <p className="font-medium text-neutral-900">
                {state.botConnected ? state.botName : "Not connected yet"}
              </p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-neutral-500" />
            <div>
              <p className="text-xs text-neutral-500">Master Spending Limits</p>
              <p className="font-medium text-neutral-900">
                ${(state.perTransactionCents / 100).toFixed(0)}/tx
                {" · "}${(state.dailyCents / 100).toFixed(0)}/day
                {" · "}${(state.monthlyCents / 100).toFixed(0)}/mo
              </p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-neutral-500" />
            <div>
              <p className="text-xs text-neutral-500">Wallet Balance</p>
              <p className="font-medium text-neutral-900">
                ${(state.fundedAmountCents / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Link href="/overview">
        <Button className="w-full rounded-xl h-12 md:h-14 text-base md:text-lg" data-testid="button-go-to-dashboard">
          Go to Dashboard
        </Button>
      </Link>
    </WizardStep>
  );
}
