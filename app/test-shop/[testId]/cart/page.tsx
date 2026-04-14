"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useShopTest } from "@/features/agent-testing/full-shop/client/shop-test-context";
import { EVENT_TYPES, TAX_RATE } from "@/features/agent-testing/full-shop/shared/constants";
import { formatPrice } from "@/features/agent-testing/full-shop/shared/scenario-definitions";

export default function CartPage() {
  const searchParams = useSearchParams();
  const { testId, cart, trackEvent, advanceStage, setCurrentPage, isObserver } = useShopTest();
  const observeParam = searchParams.get("observe");
  const qs = observeParam ? `?observe=${observeParam}` : "";

  useEffect(() => {
    setCurrentPage("cart");
    advanceStage("cart_review");
    trackEvent(EVENT_TYPES.CART_PAGE_OPEN, "cart_review");
  }, [setCurrentPage, advanceStage, trackEvent]);

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  return (
    <div data-testid="page-cart" className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Cart</h1>

      {cart.length === 0 ? (
        <div data-testid="text-cart-empty" className="text-center py-12 text-gray-500">
          Your cart is empty
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {cart.map((item, i) => (
              <div
                key={`${item.productSlug}-${i}`}
                data-testid={`cart-item-${item.productSlug}`}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <h3 data-testid={`text-cart-item-name-${item.productSlug}`} className="font-semibold text-gray-900">
                    {item.productName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {item.color} / {item.size} — Qty: {item.quantity}
                  </p>
                </div>
                <p data-testid={`text-cart-item-total-${item.productSlug}`} className="font-semibold text-gray-900">
                  {formatPrice(item.unitPrice * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span data-testid="text-subtotal">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span data-testid="text-tax">{formatPrice(tax)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>Total</span>
              <span data-testid="text-total">{formatPrice(total)}</span>
            </div>
          </div>

          <a
            href={`/test-shop/${testId}/checkout${qs}`}
            data-testid="button-checkout"
            className="mt-6 block w-full py-3 bg-indigo-600 text-white text-center rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Proceed to Checkout
          </a>
        </>
      )}
    </div>
  );
}
