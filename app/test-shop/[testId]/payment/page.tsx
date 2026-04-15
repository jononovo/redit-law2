"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useShopTest } from "@/features/agent-testing/full-shop/client/shop-test-context";
import { EVENT_TYPES, TAX_RATE, PRIORITY_SHIPPING_COST } from "@/features/agent-testing/full-shop/shared/constants";
import { formatPrice } from "@/features/agent-testing/full-shop/shared/scenario-definitions";

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const YEARS = Array.from({ length: 8 }, (_, i) => String(new Date().getFullYear() + i).slice(-2));

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const { testId, shopState, cart, setShopState, trackEvent, advanceStage, setCurrentPage, flushEvents, isObserver } = useShopTest();
  const observeParam = searchParams.get("observe");
  const qs = observeParam ? `?observe=${observeParam}` : "";

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCurrentPage("payment");
    advanceStage("payment");
  }, [setCurrentPage, advanceStage]);

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shipping = shopState.shippingMethod === "priority" ? PRIORITY_SHIPPING_COST : 0;
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + shipping + tax;

  function handleCardChange(field: string, value: string) {
    setShopState((s) => ({
      ...s,
      card: { ...s.card, [field]: value },
    }));
    const snapshot = field === "cvv" ? "***" : value;
    trackEvent(EVENT_TYPES.CARD_FIELD_INPUT, "payment", field, snapshot, value.length);
  }

  function handleCardSelect(field: string, value: string) {
    setShopState((s) => ({
      ...s,
      card: { ...s.card, [field]: value },
    }));
    trackEvent(EVENT_TYPES.CARD_FIELD_SELECT, "payment", field, value, value.length);
  }

  function handleTermsChange(checked: boolean) {
    setShopState((s) => ({ ...s, termsChecked: checked }));
    trackEvent(
      checked ? EVENT_TYPES.TERMS_CHECK : EVENT_TYPES.TERMS_UNCHECK,
      "payment",
      "termsChecked",
      String(checked),
      1,
    );
  }

  async function handlePayNow(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    trackEvent(EVENT_TYPES.PAY_NOW_CLICK, "payment");

    await flushEvents();

    try {
      await fetch(`/api/v1/agent-testing/tests/${testId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      await fetch(`/api/v1/agent-testing/tests/${testId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch (err) {
      console.error("[payment] submit error:", err);
    }

    window.location.href = `/test-shop/${testId}/confirmation${qs}`;
  }

  const card = shopState.card;

  return (
    <div data-testid="page-payment" className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment</h1>

      <form onSubmit={handlePayNow} className="space-y-6">
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Card Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
              <input
                type="text"
                data-testid="input-card-cardholderName"
                value={card.cardholderName}
                onChange={(e) => handleCardChange("cardholderName", e.target.value)}
                readOnly={isObserver}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
              <input
                type="text"
                data-testid="input-card-cardNumber"
                value={card.cardNumber}
                onChange={(e) => handleCardChange("cardNumber", e.target.value)}
                readOnly={isObserver}
                maxLength={19}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-600 font-mono"
                required
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  data-testid="select-card-expiryMonth"
                  value={card.expiryMonth}
                  onChange={(e) => handleCardSelect("expiryMonth", e.target.value)}
                  disabled={isObserver}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  required
                >
                  <option value="">MM</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  data-testid="select-card-expiryYear"
                  value={card.expiryYear}
                  onChange={(e) => handleCardSelect("expiryYear", e.target.value)}
                  disabled={isObserver}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  required
                >
                  <option value="">YY</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                <input
                  type="password"
                  data-testid="input-card-cvv"
                  value={card.cvv}
                  onChange={(e) => handleCardChange("cvv", e.target.value)}
                  readOnly={isObserver}
                  maxLength={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-600 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing ZIP</label>
                <input
                  type="text"
                  data-testid="input-card-billingZip"
                  value={card.billingZip}
                  onChange={(e) => handleCardChange("billingZip", e.target.value)}
                  readOnly={isObserver}
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  required
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Order Summary</h2>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span data-testid="text-payment-subtotal">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span data-testid="text-payment-shipping">{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span data-testid="text-payment-tax">{formatPrice(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>Total</span>
              <span data-testid="text-payment-total">{formatPrice(total)}</span>
            </div>
          </div>
        </section>

        <label
          data-testid="checkbox-terms"
          className="flex items-start gap-3 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={shopState.termsChecked}
            onChange={(e) => handleTermsChange(e.target.checked)}
            disabled={isObserver}
            className="mt-1"
            required
          />
          <span className="text-sm text-gray-600">
            I agree to the Terms & Conditions and understand this is a simulated test transaction.
          </span>
        </label>

        <button
          type="submit"
          data-testid="button-pay-now"
          disabled={isObserver || submitting}
          className="w-full py-3 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800 transition-colors disabled:opacity-50"
        >
          {submitting ? "Processing..." : `Pay ${formatPrice(total)}`}
        </button>
      </form>
    </div>
  );
}
