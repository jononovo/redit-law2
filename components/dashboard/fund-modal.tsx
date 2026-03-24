"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Loader2, CheckCircle, AlertCircle, CreditCard, Star } from "lucide-react";

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000];

interface PaymentMethodOption {
  id: number;
  card_last4: string | null;
  card_brand: string | null;
  is_default: boolean;
}

interface FundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function FundModal({ open, onOpenChange, onSuccess }: FundModalProps) {
  const [amountCents, setAmountCents] = useState<number>(2500);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string; balance?: string } | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [selectedPmId, setSelectedPmId] = useState<string>("default");
  const [loadingCards, setLoadingCards] = useState(false);

  useEffect(() => {
    if (open) {
      setLoadingCards(true);
      fetch("/api/v1/billing/payment-method")
        .then((res) => res.json())
        .then((data) => {
          const methods = data.payment_methods || [];
          setPaymentMethods(methods);
          const defaultCard = methods.find((m: PaymentMethodOption) => m.is_default);
          setSelectedPmId(defaultCard ? String(defaultCard.id) : methods.length > 0 ? String(methods[0].id) : "default");
        })
        .catch(() => {})
        .finally(() => setLoadingCards(false));
    }
  }, [open]);

  function getAmountCents(): number {
    if (useCustom) {
      const parsed = parseFloat(customAmount);
      if (isNaN(parsed) || parsed < 1 || parsed > 1000) return 0;
      return Math.round(parsed * 100);
    }
    return amountCents;
  }

  async function handleFund() {
    const cents = getAmountCents();
    if (cents < 100) return;

    setLoading(true);
    setResult(null);

    try {
      const body: any = { amount_cents: cents };
      if (selectedPmId !== "default") {
        body.payment_method_id = parseInt(selectedPmId, 10);
      }

      const res = await fetch("/api/v1/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, message: data.message, balance: data.balance });
        onSuccess();
      } else {
        setResult({ success: false, error: data.error });
      }
    } catch {
      setResult({ success: false, error: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setResult(null);
    setUseCustom(false);
    setCustomAmount("");
    setAmountCents(2500);
    onOpenChange(false);
  }

  const currentCents = getAmountCents();
  const displayAmount = currentCents > 0 ? `$${(currentCents / 100).toFixed(2)}` : "$0.00";

  function formatCardLabel(pm: PaymentMethodOption) {
    const brand = pm.card_brand
      ? pm.card_brand.charAt(0).toUpperCase() + pm.card_brand.slice(1)
      : "Card";
    return `${brand} ending in ${pm.card_last4 || "****"}`;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Funds</DialogTitle>
          <DialogDescription>Top up your bot&apos;s wallet balance.</DialogDescription>
        </DialogHeader>

        {result?.success ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
            <h3 className="font-bold text-lg text-neutral-900">Funds Added!</h3>
            <p className="text-sm text-neutral-500">{result.message}</p>
            <p className="text-lg font-bold text-green-600">Balance: {result.balance}</p>
            <Button onClick={handleClose} className="rounded-xl" data-testid="button-fund-done">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {paymentMethods.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Payment method</label>
                <Select value={selectedPmId} onValueChange={setSelectedPmId}>
                  <SelectTrigger className="rounded-xl" data-testid="select-payment-method">
                    <SelectValue placeholder="Select a card" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={String(pm.id)} data-testid={`option-card-${pm.id}`}>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-neutral-500" />
                          <span>{formatCardLabel(pm)}</span>
                          {pm.is_default && <Star className="w-3 h-3 fill-primary text-primary" />}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {paymentMethods.length === 1 && (
              <div className="flex items-center gap-2 text-sm text-neutral-600 bg-neutral-50 rounded-xl p-3">
                <CreditCard className="w-4 h-4 text-neutral-400" />
                <span>{formatCardLabel(paymentMethods[0])}</span>
              </div>
            )}

            {loadingCards && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {PRESET_AMOUNTS.map((cents) => (
                <button
                  key={cents}
                  onClick={() => { setAmountCents(cents); setUseCustom(false); }}
                  className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
                    !useCustom && amountCents === cents
                      ? "border-primary bg-primary/5 text-primary font-bold"
                      : "border-neutral-200 hover:border-neutral-300 text-neutral-700"
                  }`}
                  data-testid={`button-amount-${cents}`}
                >
                  <span className="text-lg font-bold">${(cents / 100).toFixed(0)}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setUseCustom(true)}
                className={`text-sm font-medium cursor-pointer ${useCustom ? "text-primary" : "text-neutral-500 hover:text-neutral-700"}`}
              >
                Custom amount
              </button>
              {useCustom && (
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-8 rounded-xl"
                    data-testid="input-custom-amount"
                  />
                </div>
              )}
            </div>

            {result && !result.success && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2" data-testid="fund-error">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{result.error}</p>
              </div>
            )}

            <div className="border-t border-neutral-100 pt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-neutral-500">Amount to charge</span>
                <span className="text-lg font-bold text-neutral-900" data-testid="text-charge-amount">{displayAmount}</span>
              </div>
              <Button
                onClick={handleFund}
                disabled={loading || currentCents < 100 || paymentMethods.length === 0}
                className="w-full rounded-xl bg-primary hover:bg-primary/90 gap-2 shadow-md shadow-primary/20"
                data-testid="button-confirm-fund"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <>Charge {displayAmount}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
