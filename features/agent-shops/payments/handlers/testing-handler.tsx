"use client";

import { useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { PaymentHandlerProps } from "../types";

type HandlerState = "form" | "submitting" | "success" | "error";

const MONTHS = [
  { value: "01", label: "01 - January" },
  { value: "02", label: "02 - February" },
  { value: "03", label: "03 - March" },
  { value: "04", label: "04 - April" },
  { value: "05", label: "05 - May" },
  { value: "06", label: "06 - June" },
  { value: "07", label: "07 - July" },
  { value: "08", label: "08 - August" },
  { value: "09", label: "09 - September" },
  { value: "10", label: "10 - October" },
  { value: "11", label: "11 - November" },
  { value: "12", label: "12 - December" },
];

function getYearOptions(): { value: string; label: string }[] {
  const currentYear = new Date().getFullYear();
  const years: { value: string; label: string }[] = [];
  for (let i = 0; i < 11; i++) {
    const year = currentYear + i;
    const short = String(year).slice(-2);
    years.push({ value: short, label: String(year) });
  }
  return years;
}

export function TestingHandler({ context, onSuccess, onError, onCancel }: PaymentHandlerProps) {
  const { toast } = useToast();
  const [state, setState] = useState<HandlerState>("form");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [billingZip, setBillingZip] = useState("");

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
    if (errors.cardNumber) setErrors((prev) => ({ ...prev, cardNumber: "" }));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCardCvv(digits);
    if (errors.cardCvv) setErrors((prev) => ({ ...prev, cardCvv: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!cardholderName.trim()) {
      newErrors.cardholderName = "Name is required";
    }

    const rawDigits = cardNumber.replace(/\s/g, "");
    if (!rawDigits || rawDigits.length < 13 || rawDigits.length > 16) {
      newErrors.cardNumber = "Enter a valid card number";
    }

    if (!expiryMonth) {
      newErrors.expiryMonth = "Select a month";
    }

    if (!expiryYear) {
      newErrors.expiryYear = "Select a year";
    }

    if (!cardCvv || cardCvv.length < 3 || cardCvv.length > 4) {
      newErrors.cardCvv = "Enter a valid CVV (3-4 digits)";
    }

    if (!billingZip.trim()) {
      newErrors.billingZip = "ZIP code is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setState("submitting");

    const cardExpiry = `${expiryMonth}/${expiryYear}`;

    try {
      const testPayUrl = context.testToken
        ? `/api/v1/checkout/${context.checkoutPageId}/pay/testing?t=${encodeURIComponent(context.testToken)}`
        : `/api/v1/checkout/${context.checkoutPageId}/pay/testing`;
      const res = await fetch(testPayUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_number: cardNumber.replace(/\s/g, ""),
          card_expiry: cardExpiry,
          card_cvv: cardCvv,
          cardholder_name: cardholderName.trim(),
          billing_zip: billingZip.trim(),
          buyer_name: context.buyerName,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Test payment failed");
      }

      const data = await res.json();

      setState("success");
      toast({
        title: "Test payment recorded",
        description: "Card details have been captured successfully.",
      });

      setTimeout(() => {
        onSuccess({
          method: "testing",
          status: "completed",
          saleId: data.sale_id,
        });
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Test payment failed";
      setState("error");
      onError(message);
    }
  };

  if (state === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4" data-testid="testing-handler-success">
        <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
        <p className="text-lg font-semibold text-neutral-900">Test payment recorded</p>
        <p className="text-sm text-neutral-500 mt-1">Card details captured successfully</p>
      </div>
    );
  }

  if (state === "submitting") {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4" data-testid="testing-handler-submitting">
        <Loader2 className="w-10 h-10 animate-spin text-neutral-600 mb-4" />
        <p className="text-lg font-semibold text-neutral-900">Recording test payment...</p>
      </div>
    );
  }

  const yearOptions = getYearOptions();

  return (
    <div className="w-full max-w-sm mx-auto" data-testid="testing-handler-form">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-lg">🧪</span>
        <h3 className="text-lg font-bold text-neutral-900">Test Card Payment</h3>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6">
        <p className="text-xs text-amber-700 font-medium">
          Testing mode — no real payment will be processed. Card details will be recorded for verification.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 mb-1 block">Cardholder Name</label>
          <Input
            type="text"
            placeholder="John Doe"
            value={cardholderName}
            onChange={(e) => {
              setCardholderName(e.target.value);
              if (errors.cardholderName) setErrors((prev) => ({ ...prev, cardholderName: "" }));
            }}
            className={errors.cardholderName ? "border-red-400" : ""}
            data-testid="input-test-cardholder-name"
          />
          {errors.cardholderName && (
            <p className="text-xs text-red-500 mt-1" data-testid="error-cardholder-name">{errors.cardholderName}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700 mb-1 block">Card Number</label>
          <Input
            type="text"
            placeholder="4242 4242 4242 4242"
            value={cardNumber}
            onChange={handleCardNumberChange}
            className={`font-mono ${errors.cardNumber ? "border-red-400" : ""}`}
            maxLength={19}
            data-testid="input-test-card-number"
          />
          {errors.cardNumber && (
            <p className="text-xs text-red-500 mt-1" data-testid="error-card-number">{errors.cardNumber}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-1 block">Expiry Month</label>
            <Select
              value={expiryMonth}
              onValueChange={(v) => {
                setExpiryMonth(v);
                if (errors.expiryMonth) setErrors((prev) => ({ ...prev, expiryMonth: "" }));
              }}
            >
              <SelectTrigger
                className={errors.expiryMonth ? "border-red-400" : ""}
                data-testid="select-test-expiry-month"
              >
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value} data-testid={`option-month-${m.value}`}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.expiryMonth && (
              <p className="text-xs text-red-500 mt-1" data-testid="error-expiry-month">{errors.expiryMonth}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-1 block">Expiry Year</label>
            <Select
              value={expiryYear}
              onValueChange={(v) => {
                setExpiryYear(v);
                if (errors.expiryYear) setErrors((prev) => ({ ...prev, expiryYear: "" }));
              }}
            >
              <SelectTrigger
                className={errors.expiryYear ? "border-red-400" : ""}
                data-testid="select-test-expiry-year"
              >
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y.value} value={y.value} data-testid={`option-year-${y.value}`}>
                    {y.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.expiryYear && (
              <p className="text-xs text-red-500 mt-1" data-testid="error-expiry-year">{errors.expiryYear}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-1 block">CVV</label>
            <Input
              type="text"
              placeholder="123"
              value={cardCvv}
              onChange={handleCvvChange}
              className={`font-mono ${errors.cardCvv ? "border-red-400" : ""}`}
              maxLength={4}
              data-testid="input-test-card-cvv"
            />
            {errors.cardCvv && (
              <p className="text-xs text-red-500 mt-1" data-testid="error-cvv">{errors.cardCvv}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-1 block">ZIP Code</label>
            <Input
              type="text"
              placeholder="10001"
              value={billingZip}
              onChange={(e) => {
                setBillingZip(e.target.value);
                if (errors.billingZip) setErrors((prev) => ({ ...prev, billingZip: "" }));
              }}
              className={errors.billingZip ? "border-red-400" : ""}
              data-testid="input-test-billing-zip"
            />
            {errors.billingZip && (
              <p className="text-xs text-red-500 mt-1" data-testid="error-billing-zip">{errors.billingZip}</p>
            )}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full h-12 flex items-center justify-center gap-2 text-base font-bold rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 transition-all cursor-pointer"
          data-testid="button-test-pay"
        >
          <span>🧪</span>
          Submit Test Payment
        </button>

        <button
          onClick={onCancel}
          className="w-full text-sm font-medium text-neutral-500 hover:text-neutral-700 cursor-pointer py-2"
          data-testid="button-test-cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
