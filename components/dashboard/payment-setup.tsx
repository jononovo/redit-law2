"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, CheckCircle, Trash2, AlertCircle, Star, Plus } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentMethodInfo {
  id: number;
  card_last4: string | null;
  card_brand: string | null;
  is_default: boolean;
  label: string | null;
  created_at: string;
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
        className="w-full rounded-xl bg-primary hover:bg-primary/90 gap-2"
        data-testid="button-save-card"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        Save Card
      </Button>
    </form>
  );
}

function CardItem({
  pm,
  onRemove,
  onSetDefault,
}: {
  pm: PaymentMethodInfo;
  onRemove: (id: number) => void;
  onSetDefault: (id: number) => void;
}) {
  const [removing, setRemoving] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    onRemove(pm.id);
  }

  async function handleSetDefault() {
    if (pm.is_default) return;
    setSettingDefault(true);
    onSetDefault(pm.id);
  }

  const brandLabel = pm.card_brand
    ? pm.card_brand.charAt(0).toUpperCase() + pm.card_brand.slice(1)
    : "Card";

  return (
    <div
      className={`bg-neutral-50 rounded-xl p-4 flex items-center justify-between ${
        pm.is_default ? "ring-2 ring-primary/30" : ""
      }`}
      data-testid={`card-item-${pm.id}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-neutral-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-900">
            {brandLabel} ending in {pm.card_last4 || "****"}
          </p>
          <div className="flex items-center gap-2">
            {pm.is_default ? (
              <p className="text-xs text-primary flex items-center gap-1">
                <Star className="w-3 h-3 fill-primary" />
                Default
              </p>
            ) : (
              <button
                onClick={handleSetDefault}
                disabled={settingDefault}
                className="text-xs text-neutral-400 hover:text-primary flex items-center gap-1 cursor-pointer"
                data-testid={`button-set-default-${pm.id}`}
              >
                {settingDefault ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                Set as default
              </button>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRemove}
        disabled={removing}
        className="text-red-500 hover:text-red-700 hover:bg-red-50"
        data-testid={`button-remove-card-${pm.id}`}
      >
        {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </Button>
    </div>
  );
}

export function PaymentSetup() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  async function fetchPaymentMethods() {
    try {
      const res = await fetch("/api/v1/billing/payment-method");
      if (res.ok) {
        const data = await res.json();
        setPaymentMethods(data.payment_methods || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const [customerId, setCustomerId] = useState<string | null>(null);

  async function startSetup() {
    setSetupMode(true);
    try {
      const res = await fetch("/api/v1/billing/setup-intent", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setClientSecret(data.client_secret);
        setCustomerId(data.customer_id);
      }
    } catch {}
  }

  async function handleRemove(id: number) {
    try {
      await fetch(`/api/v1/billing/payment-method/${id}`, { method: "DELETE" });
      setPaymentMethods((prev) => prev.filter((pm) => pm.id !== id));
      fetchPaymentMethods();
    } catch {}
  }

  async function handleSetDefault(id: number) {
    try {
      await fetch(`/api/v1/billing/payment-method/${id}`, { method: "PUT" });
      fetchPaymentMethods();
    } catch {}
  }

  function handleSuccess() {
    setSetupMode(false);
    setClientSecret(null);
    setLoading(true);
    fetchPaymentMethods();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {paymentMethods.length > 0 && (
        <div className="space-y-3">
          {paymentMethods.map((pm) => (
            <CardItem
              key={pm.id}
              pm={pm}
              onRemove={handleRemove}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}

      {setupMode && clientSecret ? (
        <div className="space-y-4">
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
            <SetupForm onSuccess={handleSuccess} customerId={customerId} />
          </Elements>
          <Button
            variant="ghost"
            onClick={() => { setSetupMode(false); setClientSecret(null); }}
            className="text-sm text-neutral-500"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={startSetup}
          className="rounded-xl gap-2 text-sm"
          data-testid="button-add-card"
        >
          <Plus className="w-4 h-4" />
          {paymentMethods.length > 0 ? "Add Another Card" : "Add Payment Method"}
        </Button>
      )}

      {paymentMethods.length === 0 && !setupMode && (
        <div className="bg-neutral-50 rounded-xl p-6 text-center" data-testid="no-payment-method">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6 text-neutral-400" />
          </div>
          <p className="text-sm text-neutral-500">No payment method on file. Add a card to fund your bot&apos;s wallet.</p>
        </div>
      )}
    </div>
  );
}
