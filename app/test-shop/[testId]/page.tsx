"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useShopTest } from "@/features/agent-testing/full-shop/client/shop-test-context";
import { EVENT_TYPES } from "@/features/agent-testing/full-shop/shared/constants";

const CATEGORIES = [
  { label: "Sneakers", search: "sneakers", image: "/assets/images/shop/category-sneakers.png" },
  { label: "Hoodies", search: "hoodie", image: "/assets/images/shop/category-hoodies.png" },
  { label: "Backpacks", search: "backpack", image: "/assets/images/shop/category-backpacks.png" },
];

export default function TestShopHomePage() {
  const { testId, trackEvent, setCurrentPage, isObserver } = useShopTest();
  const router = useRouter();
  const observeParam = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("observe")
    : null;
  const qs = observeParam ? `?observe=${observeParam}` : "";

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setCurrentPage("");
    trackEvent(EVENT_TYPES.SHOP_LANDING, "page_arrival");
  }, [trackEvent, setCurrentPage]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim() || isObserver) return;
    router.push(`/test-shop/${testId}/search?q=${encodeURIComponent(searchQuery.trim())}${qs ? "&" + qs.slice(1) : ""}`);
  }

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

        <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-12">
          <div className="flex gap-3">
            <input
              type="text"
              data-testid="input-home-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for sneakers, hoodies, backpacks..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
              readOnly={isObserver}
            />
            <button
              type="submit"
              data-testid="button-home-search"
              disabled={isObserver}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              Search
            </button>
          </div>
        </form>
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
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
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
