"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useShopTest } from "@/features/agent-testing/full-shop/client/shop-test-context";
import { EVENT_TYPES } from "@/features/agent-testing/full-shop/shared/constants";
import Image from "next/image";
import { getProductBySlug, formatPrice } from "@/features/agent-testing/full-shop/shared/scenario-definitions";

const CATEGORY_IMAGES: Record<string, string> = {
  sneakers: "/assets/images/shop/category-sneakers.png",
  hoodie: "/assets/images/shop/category-hoodies.png",
  backpack: "/assets/images/shop/category-backpacks.png",
};

export default function ProductDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const observeParam = searchParams.get("observe");
  const qs = observeParam ? `?observe=${observeParam}` : "";

  const { testId, shopState, setShopState, setCart, trackEvent, flushEvents, advanceStage, setCurrentPage, isObserver } = useShopTest();

  const product = getProductBySlug(slug);
  const [selectedColor, setSelectedColor] = useState(isObserver ? shopState.selectedColor ?? "" : "");
  const [selectedSize, setSelectedSize] = useState(isObserver ? shopState.selectedSize ?? "" : "");
  const [quantity, setQuantity] = useState(isObserver ? shopState.quantity : 1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setCurrentPage("product");
    setShopState((s) => ({ ...s, selectedProductSlug: slug }));
  }, [slug, setCurrentPage, setShopState]);

  useEffect(() => {
    if (isObserver) {
      setSelectedColor(shopState.selectedColor ?? "");
      setSelectedSize(shopState.selectedSize ?? "");
      setQuantity(shopState.quantity);
    }
  }, [isObserver, shopState.selectedColor, shopState.selectedSize, shopState.quantity]);

  if (!product) {
    return (
      <div data-testid="text-product-not-found" className="text-center py-12 text-gray-500">
        Product not found
      </div>
    );
  }

  function handleColorSelect(color: string) {
    setSelectedColor(color);
    setShopState((s) => ({ ...s, selectedColor: color }));
    trackEvent(EVENT_TYPES.COLOR_SELECT, "variant_config", "color", color, color.length);
    advanceStage("variant_config");
  }

  function handleSizeSelect(size: string) {
    setSelectedSize(size);
    setShopState((s) => ({ ...s, selectedSize: size }));
    trackEvent(EVENT_TYPES.SIZE_SELECT, "variant_config", "size", size, size.length);
    advanceStage("variant_config");
  }

  function handleQuantityChange(newQty: number) {
    if (newQty < 1 || newQty > 10) return;
    const eventType = newQty > quantity ? EVENT_TYPES.QUANTITY_INCREMENT : EVENT_TYPES.QUANTITY_DECREMENT;
    setQuantity(newQty);
    setShopState((s) => ({ ...s, quantity: newQty }));
    trackEvent(eventType, "variant_config", "quantity", String(newQty), String(newQty).length);
  }

  async function handleAddToCart() {
    if (!selectedColor || !selectedSize) return;
    trackEvent(EVENT_TYPES.QUANTITY_INCREMENT, "variant_config", "quantity", String(quantity), String(quantity).length);
    trackEvent(EVENT_TYPES.ADD_TO_CART_CLICK, "add_to_cart", "product", product!.slug, product!.slug.length);
    advanceStage("add_to_cart");

    setCart(() => [{
      productSlug: product!.slug,
      productName: product!.name,
      color: selectedColor,
      size: selectedSize,
      quantity,
      unitPrice: product!.price,
    }]);

    setAdded(true);
    await flushEvents();
    window.location.href = `/test-shop/${testId}/cart${qs}`;
  }

  return (
    <div data-testid="page-product-detail" className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative bg-gray-50 rounded-xl h-80 overflow-hidden">
          <Image
            src={CATEGORY_IMAGES[product.category] || CATEGORY_IMAGES.sneakers}
            alt={product.name}
            fill
            data-testid="img-product-detail"
            className="object-cover"
          />
        </div>

        <div>
          <h1 data-testid="text-product-name" className="text-2xl font-bold text-gray-900 mb-2">
            {product.name}
          </h1>
          <p data-testid="text-product-price" className="text-2xl font-bold text-indigo-600 mb-4">
            {formatPrice(product.price)}
          </p>
          <p data-testid="text-product-description" className="text-gray-600 mb-6">
            {product.description}
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {product.colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  data-testid={`button-color-${color.toLowerCase()}`}
                  onClick={() => handleColorSelect(color)}
                  disabled={isObserver}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    selectedColor === color
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-md"
                      : "border-gray-300 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
            <div className="flex gap-2 flex-wrap">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  data-testid={`button-size-${size.toLowerCase()}`}
                  onClick={() => handleSizeSelect(size)}
                  disabled={isObserver}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    selectedSize === size
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-md"
                      : "border-gray-300 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                data-testid="button-quantity-decrement"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={isObserver || quantity <= 1}
                className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                −
              </button>
              <span data-testid="text-quantity" className="text-lg font-semibold w-8 text-center text-gray-900">
                {quantity}
              </span>
              <button
                type="button"
                data-testid="button-quantity-increment"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={isObserver || quantity >= 10}
                className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            data-testid="button-add-to-cart"
            onClick={handleAddToCart}
            disabled={isObserver || !selectedColor || !selectedSize || added}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
              added
                ? "bg-green-500"
                : !selectedColor || !selectedSize
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {added ? "✓ Added to Cart" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
