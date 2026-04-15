"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useShopTest } from "@/features/agent-testing/full-shop/client/shop-test-context";
import { EVENT_TYPES } from "@/features/agent-testing/full-shop/shared/constants";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const { testId, shopState, setShopState, trackEvent, flushEvents, advanceStage, setCurrentPage, isObserver } = useShopTest();
  const observeParam = searchParams.get("observe");
  const qs = observeParam ? `?observe=${observeParam}` : "";

  useEffect(() => {
    setCurrentPage("checkout");
    advanceStage("checkout_options");
  }, [setCurrentPage, advanceStage]);

  function handleAddressChange(field: string, value: string) {
    setShopState((s) => ({
      ...s,
      address: { ...s.address, [field]: value },
    }));
    trackEvent(EVENT_TYPES.ADDRESS_FIELD_INPUT, "checkout_options", field, value, value.length);
  }

  function handleShippingMethodChange(method: string) {
    setShopState((s) => ({ ...s, shippingMethod: method }));
    trackEvent(EVENT_TYPES.SHIPPING_METHOD_SELECT, "checkout_options", "shippingMethod", method, method.length);
  }

  function handlePaymentMethodChange(method: string) {
    setShopState((s) => ({ ...s, paymentMethod: method }));
    trackEvent(EVENT_TYPES.PAYMENT_METHOD_SELECT, "checkout_options", "paymentMethod", method, method.length);
  }

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    trackEvent(EVENT_TYPES.CONTINUE_TO_PAYMENT_CLICK, "checkout_options");
    await flushEvents();
    window.location.href = `/test-shop/${testId}/payment${qs}`;
  }

  const addr = isObserver ? shopState.address : shopState.address;

  return (
    <div data-testid="page-checkout" className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

      <form onSubmit={handleContinue} className="space-y-8">
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                data-testid="input-address-fullName"
                value={addr.fullName}
                onChange={(e) => handleAddressChange("fullName", e.target.value)}
                readOnly={isObserver}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input
                type="text"
                data-testid="input-address-street"
                value={addr.street}
                onChange={(e) => handleAddressChange("street", e.target.value)}
                readOnly={isObserver}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  data-testid="input-address-city"
                  value={addr.city}
                  onChange={(e) => handleAddressChange("city", e.target.value)}
                  readOnly={isObserver}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <select
                  data-testid="select-address-state"
                  value={addr.state}
                  onChange={(e) => handleAddressChange("state", e.target.value)}
                  disabled={isObserver}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">—</option>
                  {US_STATES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                <input
                  type="text"
                  data-testid="input-address-zip"
                  value={addr.zip}
                  onChange={(e) => handleAddressChange("zip", e.target.value)}
                  readOnly={isObserver}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Method</h2>
          <div className="space-y-3">
            <label
              data-testid="radio-shipping-standard"
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                shopState.shippingMethod === "standard" ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="shipping"
                value="standard"
                checked={shopState.shippingMethod === "standard"}
                onChange={() => handleShippingMethodChange("standard")}
                disabled={isObserver}
                className="mr-3"
              />
              <div>
                <span className="font-medium text-gray-900">Standard Shipping</span>
                <span className="text-gray-500 ml-2">— Free</span>
              </div>
            </label>
            <label
              data-testid="radio-shipping-priority"
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                shopState.shippingMethod === "priority" ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="shipping"
                value="priority"
                checked={shopState.shippingMethod === "priority"}
                onChange={() => handleShippingMethodChange("priority")}
                disabled={isObserver}
                className="mr-3"
              />
              <div>
                <span className="font-medium text-gray-900">Priority Shipping</span>
                <span className="text-gray-500 ml-2">— $12.99</span>
              </div>
            </label>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
          <div className="space-y-3">
            <label
              data-testid="radio-payment-credit_card"
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                shopState.paymentMethod === "credit_card" ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="credit_card"
                checked={shopState.paymentMethod === "credit_card"}
                onChange={() => handlePaymentMethodChange("credit_card")}
                disabled={isObserver}
                className="mr-3"
              />
              <span className="font-medium text-gray-900">Credit Card</span>
            </label>
            <label
              data-testid="radio-payment-ach"
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                shopState.paymentMethod === "ach" ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
              } opacity-50`}
            >
              <input
                type="radio"
                name="payment"
                value="ach"
                checked={shopState.paymentMethod === "ach"}
                onChange={() => handlePaymentMethodChange("ach")}
                disabled={isObserver}
                className="mr-3"
              />
              <span className="font-medium text-gray-900">ACH Bank Transfer</span>
              <span className="text-xs text-gray-400 ml-2">(decoy)</span>
            </label>
          </div>
        </section>

        <button
          type="submit"
          data-testid="button-continue-to-payment"
          disabled={isObserver}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          Continue to Payment
        </button>
      </form>
    </div>
  );
}
