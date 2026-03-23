"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { WizardStep } from "../wizard-step";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, AlertCircle, ShieldCheck } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface AddPaymentProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: (added: boolean) => void;
}

function SetupForm({ onSuccess, customerId }: { onSuccess: () => void; customerId: string | null }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const result = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message || "Setup failed");
      setLoading(false);
      return;
    }

    if (result.setupIntent?.payment_method) {
      const pmId = typeof result.setupIntent.payment_method === "string"
        ? result.setupIntent.payment_method
        : result.setupIntent.payment_method.id;

      const res = await fetch("/api/v1/billing/payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_method_id: pmId,
          customer_id: customerId || "",
        }),
      });

      if (!res.ok) {
        setError("Failed to save payment method");
        setLoading(false);
        return;
      }

      onSuccess();
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full rounded-xl h-12 md:h-14 text-base md:text-lg gap-2"
        data-testid="button-save-card-wizard"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
        Save Card
      </Button>
    </form>
  );
}

export function AddPayment({ currentStep, totalSteps, onBack, onNext }: AddPaymentProps) {
  const [showForm, setShowForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loadingSetup, setLoadingSetup] = useState(false);

  async function startSetup() {
    setShowForm(true);
    setLoadingSetup(true);
    try {
      const res = await fetch("/api/v1/billing/setup-intent", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setClientSecret(data.client_secret);
        setCustomerId(data.customer_id);
      }
    } catch {} finally {
      setLoadingSetup(false);
    }
  }

  return (
    <WizardStep
      title="Add your credit card"
      subtitle="Your card is used to fund your bot's wallet. You set the limits — your bot can only spend what you allow."
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      {showForm ? (
        <div className="space-y-4 mb-6">
          {loadingSetup || !clientSecret ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
              <SetupForm
                onSuccess={() => onNext(true)}
                customerId={customerId}
              />
            </Elements>
          )}
          <Button
            variant="ghost"
            onClick={() => { setShowForm(false); setClientSecret(null); }}
            className="w-full text-sm text-neutral-500"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          <Button
            onClick={startSetup}
            className="w-full rounded-xl h-12 md:h-14 text-base md:text-lg gap-2"
            data-testid="button-add-card-wizard"
          >
            <CreditCard className="w-5 h-5" />
            Add a Card
          </Button>

          <button
            onClick={() => onNext(false)}
            className="w-full text-sm text-neutral-400 hover:text-neutral-600 py-2 cursor-pointer"
            data-testid="button-skip-payment"
          >
            Skip — I&apos;ll add one later
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-neutral-400 justify-center">
        <ShieldCheck className="w-3.5 h-3.5" />
        Your card details are handled by Stripe. CreditClaw never sees your card number.
      </div>
    </WizardStep>
  );
}
