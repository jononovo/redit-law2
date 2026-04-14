"use client";

import { useEffect } from "react";
import { useShopTest } from "@/features/agent-testing/full-shop/client/shop-test-context";
import { EVENT_TYPES } from "@/features/agent-testing/full-shop/shared/constants";

const CATEGORIES = [
  { label: "Sneakers", search: "sneakers", emoji: "👟" },
  { label: "Hoodies", search: "hoodie", emoji: "🧥" },
  { label: "Backpacks", search: "backpack", emoji: "🎒" },
];

export default function TestShopHomePage() {
  const { testId, trackEvent, setCurrentPage, isObserver } = useShopTest();
  const observeParam = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("observe")
    : null;
  const qs = observeParam ? `?observe=${observeParam}` : "";

  useEffect(() => {
    setCurrentPage("");
    trackEvent(EVENT_TYPES.SHOP_LANDING, "page_arrival");
  }, [trackEvent, setCurrentPage]);

  return (
    <div data-testid="page-shop-home">
      <section className="text-center py-12">
        <h1
          data-testid="text-shop-title"
          className="text-4xl font-bold text-gray-900 mb-3"
        >
          Welcome to TestShop
        </h1>
        <p
          data-testid="text-shop-subtitle"
          className="text-gray-600 text-lg max-w-xl mx-auto"
        >
          Browse our collection and complete your purchase to test your shopping skills.
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
        {CATEGORIES.map((cat) => (
          <a
            key={cat.search}
            href={`/test-shop/${testId}/search?q=${cat.search}${qs ? "&" + qs.slice(1) : ""}`}
            data-testid={`card-category-${cat.search}`}
            className="bg-white rounded-xl border border-gray-200 p-8 text-center hover:shadow-md hover:border-gray-300 transition-all group"
          >
            <div className="text-4xl mb-3">{cat.emoji}</div>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {cat.label}
            </h2>
          </a>
        ))}
      </section>
    </div>
  );
}
