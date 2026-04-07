import { worldstoreSearch } from "./client";
import type { ProductVariant, ProductSearchResult } from "./types";

export async function searchShopifyProduct(
  productUrl: string
): Promise<ProductSearchResult> {
  const res = await worldstoreSearch(productUrl);

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    console.error(`[Procurement] Shopify search failed: ${res.status} ${errorText}`);

    if (res.status === 404) {
      throw Object.assign(
        new Error("Could not find product variants. Ensure the URL is a valid Shopify product page."),
        { code: "product_not_found" as const, httpStatus: 404 }
      );
    }

    throw Object.assign(
      new Error("Product search is temporarily unavailable. This API is in beta — please try again later."),
      { code: "search_failed" as const, httpStatus: 502 }
    );
  }

  const data = await res.json();

  const rawVariants = Array.isArray(data)
    ? data
    : Array.isArray(data.variants)
      ? data.variants
      : [];

  const variants: ProductVariant[] = rawVariants
    .map((v: Record<string, unknown>) => ({
      variant_id: String(v.variantId || v.variant_id || v.id || ""),
      title: String(v.title || v.name || "Unknown"),
      price: v.price != null ? Number(v.price) : null,
      currency: String(v.currency || "USD"),
      available: Boolean(v.available ?? v.in_stock ?? true),
      options: (v.options || v.attributes || {}) as Record<string, unknown>,
    }))
    .filter((v: any) => v.variant_id && v.variant_id !== "");

  const productName = data.title || data.name || data.product?.title || null;

  if (variants.length === 0) {
    return {
      product_url: productUrl,
      product_name: productName,
      variants: [],
      warning: "No usable variants found. The product may be out of stock or the URL format may not be supported.",
    };
  }

  return {
    product_url: productUrl,
    product_name: productName,
    variants,
    locator_format:
      "shopify:{product_url}:{variant_id} — use this as merchant='shopify' and product_id='{product_url}:{variant_id}' in the purchase endpoint",
  };
}
