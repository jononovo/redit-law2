"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useShopTest } from "@/features/agent-testing/full-shop/client/shop-test-context";
import { EVENT_TYPES } from "@/features/agent-testing/full-shop/shared/constants";
import {
  searchProducts,
  formatPrice,
} from "@/features/agent-testing/full-shop/shared/scenario-definitions";
import type { ShopProduct } from "@/features/agent-testing/full-shop/shared/types";
import Image from "next/image";

const CATEGORY_IMAGES: Record<string, string> = {
  sneakers: "/assets/images/shop/category-sneakers.png",
  hoodie: "/assets/images/shop/category-hoodies.png",
  backpack: "/assets/images/shop/category-backpacks.png",
};

export default function SearchPage() {
  const { testId, shopState, setShopState, trackEvent, advanceStage, setCurrentPage, isObserver } = useShopTest();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const observeParam = searchParams.get("observe");
  const qs = observeParam ? `?observe=${observeParam}` : "";

  const [query, setQuery] = useState(isObserver ? shopState.searchQuery || initialQuery : initialQuery);
  const [results, setResults] = useState<ShopProduct[]>([]);

  useEffect(() => {
    setCurrentPage("search");
    advanceStage("search");
  }, [setCurrentPage, advanceStage]);

  useEffect(() => {
    if (isObserver) {
      setQuery(shopState.searchQuery || initialQuery);
    } else {
      setQuery(initialQuery);
    }
  }, [isObserver, shopState.searchQuery, initialQuery]);

  useEffect(() => {
    const q = isObserver ? (shopState.searchQuery || initialQuery) : query;
    if (q) {
      setResults(searchProducts(q));
    } else {
      setResults([]);
    }
  }, [query, isObserver, shopState.searchQuery, initialQuery]);

  useEffect(() => {
    if (!isObserver && initialQuery) {
      setShopState((s) => ({ ...s, searchQuery: initialQuery }));
      trackEvent(EVENT_TYPES.SEARCH_INPUT, "search", "searchQuery", initialQuery, initialQuery.length);
      trackEvent(EVENT_TYPES.SEARCH_SUBMIT, "search", "searchQuery", initialQuery, initialQuery.length);
    }
  }, []);

  function handleSearchChange(value: string) {
    setQuery(value);
    setShopState((s) => ({ ...s, searchQuery: value }));
    trackEvent(EVENT_TYPES.SEARCH_INPUT, "search", "searchQuery", value, value.length);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    trackEvent(EVENT_TYPES.SEARCH_SUBMIT, "search", "searchQuery", query, query.length);
  }

  function handleProductClick(product: ShopProduct) {
    trackEvent(EVENT_TYPES.PRODUCT_CLICK, "product_select", "product", product.slug, product.slug.length);
    advanceStage("product_select");
  }

  return (
    <div data-testid="page-search">
      <form onSubmit={handleSearchSubmit} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            data-testid="input-search"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search products..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            readOnly={isObserver}
          />
          <button
            type="submit"
            data-testid="button-search-submit"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            disabled={isObserver}
          >
            Search
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((product) => (
            <a
              key={product.slug}
              href={`/test-shop/${testId}/product/${product.slug}${qs}`}
              data-testid={`card-product-${product.slug}`}
              onClick={() => handleProductClick(product)}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group"
            >
              <div className="relative bg-gray-50 h-48">
                <Image
                  src={CATEGORY_IMAGES[product.category] || CATEGORY_IMAGES.sneakers}
                  alt={product.name}
                  fill
                  data-testid={`img-product-${product.slug}`}
                  className="object-cover"
                />
              </div>
              <div className="p-4">
                <h3
                  data-testid={`text-product-name-${product.slug}`}
                  className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors"
                >
                  {product.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {product.description}
                </p>
                <p
                  data-testid={`text-product-price-${product.slug}`}
                  className="text-lg font-bold text-gray-900 mt-2"
                >
                  {formatPrice(product.price)}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}

      {query && results.length === 0 && (
        <div data-testid="text-no-results" className="text-center py-12 text-gray-500">
          No products found for "{query}"
        </div>
      )}
    </div>
  );
}
