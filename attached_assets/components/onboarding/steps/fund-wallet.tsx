"use client";

import { useState } from "react";
import { WizardStep } from "../wizard-step";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface FundWalletProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: (amountCents: number) => void;
}

const presets = [1000, 2500, 5000, 10000];

export function FundWallet({ currentStep, totalSteps, onBack, onNext }: FundWalletProps) {
  const [amountCents, setAmountCents] = useState(2500);
  const [customMode, setCustomMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleFund() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_cents: amountCents }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Payment failed. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => onNext(amountCents), 1500);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <WizardStep
        title="Wallet funded!"
        currentStep={currentStep}
        totalSteps={totalSteps}
        onBack={onBack}
        showBack={false}
      >
        <div className="flex flex-col items-center justify-center py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <p className="text-lg font-semibold text-neutral-900">
            ${(amountCents / 100).toFixed(2)} added to your wallet
          </p>
        </div>
      </WizardStep>
    );
  }

  return (
    <WizardStep
      title="How much should your bot start with?"
      subtitle="This is a prepaid wallet — your bot can only spend what you add. Top up anytime."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-2 gap-3">
          {presets.map((cents) => (
            <button
              key={cents}
              onClick={() => { setAmountCents(cents); setCustomMode(false); }}
              className={`p-4 rounded-xl border-2 text-center font-semibold cursor-pointer transition-all ${
                amountCents === cents && !customMode
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-neutral-200 bg-white hover:border-neutral-300 text-neutral-700"
              }`}
              data-testid={`preset-fund-${cents}`}
            >
              ${(cents / 100).toFixed(0)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCustomMode(true)}
            className={`px-4 py-2 rounded-xl border-2 text-sm cursor-pointer transition-all ${
              customMode ? "border-primary bg-primary/5 text-primary" : "border-neutral-200 text-neutral-500"
            }`}
          >
            Custom
          </button>
          {customMode && (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-neutral-500 font-medium">$</span>
              <Input
                type="number"
                min={1}
                max={1000}
                value={amountCents / 100}
                onChange={(e) => setAmountCents(Math.round(Number(e.target.value) * 100))}
                className="rounded-xl"
                data-testid="input-custom-fund"
                autoFocus
              />
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Button
          onClick={handleFund}
          disabled={loading || amountCents < 100}
          className="w-full rounded-xl h-12 md:h-14 text-base md:text-lg"
          data-testid="button-fund"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Add $${(amountCents / 100).toFixed(2)}`}
        </Button>
        <button
          onClick={() => onNext(0)}
          className="w-full text-sm text-neutral-400 hover:text-neutral-600 py-2 cursor-pointer"
          data-testid="button-skip-fund"
        >
          Skip — I&apos;ll fund later
        </button>
      </div>
    </WizardStep>
  );
}
