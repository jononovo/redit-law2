"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useShopTest } from "@/features/agent-testing/full-shop/client/shop-test-context";
import { EVENT_TYPES } from "@/features/agent-testing/full-shop/shared/constants";

const CATEGORIES = [
  { label: "Sneakers", search: "sneakers", image: "/assets/images/shop/category-sneakers.png" },
  { label: "Hoodies", search: "hoodie", image: "/assets/images/shop/category-hoodies.png" },
  { label: "Backpacks", search: "backpack", image: "/assets/images/shop/category-backpacks.png" },
];

export default function TestShopHomePage() {
  const { testId, trackEvent, setCurrentPage } = useShopTest();
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
          Welcome to TestTopia
        </h1>
        <p
          data-testid="text-shop-subtitle"
          className="text-gray-600 text-lg max-w-xl mx-auto mb-8"
        >
          Browse our collection and complete your purchase to test your shopping skills.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">Shop by Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {CATEGORIES.map((cat) => (
            <a
              key={cat.search}
              href={`/test-shop/${testId}/search?q=${cat.search}${qs ? "&" + qs.slice(1) : ""}`}
              data-testid={`card-category-${cat.search}`}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group"
            >
              <div className="relative h-48 bg-gray-50">
                <Image
                  src={cat.image}
                  alt={cat.label}
                  fill
                  data-testid={`img-category-${cat.search}`}
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 text-center">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                  {cat.label}
                </h3>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
