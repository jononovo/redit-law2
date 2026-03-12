"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Ban, Users, ExternalLink, Globe } from "lucide-react";

interface ShopData {
  business_name: string | null;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  banner_url: string | null;
  slug: string;
}

interface ShopProduct {
  checkout_page_id: string;
  title: string;
  description: string | null;
  amount_usd: number | null;
  amount_locked: boolean;
  page_type: "product" | "event" | "digital_product";
  image_url: string | null;
  collect_buyer_name: boolean;
  buyer_count: number;
  checkout_url: string;
}

type PageState = "loading" | "ready" | "not_found" | "error";

export default function PublicShopPage() {
  const { slug } = useParams<{ slug: string }>();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [shop, setShop] = useState<ShopData | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);

  useEffect(() => {
    if (!slug) return;

    const loadShop = async () => {
      try {
        const res = await fetch(`/api/v1/shop/${encodeURIComponent(slug)}`);
        if (res.status === 404) { setPageState("not_found"); return; }
        if (!res.ok) { setPageState("error"); return; }

        const data = await res.json();
        setShop(data.shop);
        setProducts(data.products);
        setPageState("ready");
      } catch {
        setPageState("error");
      }
    };

    loadShop();
  }, [slug]);

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3" data-testid="loading-shop">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          <p className="text-sm text-neutral-500 font-medium">Loading shop...</p>
        </div>
      </div>
    );
  }

  if (pageState === "not_found") {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6" data-testid="shop-not-found">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <Ban className="w-8 h-8 text-neutral-400" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Shop Not Found</h1>
          <p className="text-neutral-500 font-medium">This shop doesn&apos;t exist or is not published.</p>
        </div>
      </div>
    );
  }

  if (pageState === "error" || !shop) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6" data-testid="shop-error">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Something went wrong</h1>
          <p className="text-neutral-500 font-medium">We couldn&apos;t load this shop. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50" data-testid="shop-page">
      {shop.banner_url && (
        <div className="w-full h-48 md:h-64 relative bg-neutral-200">
          <Image src={shop.banner_url} alt="Shop banner" fill className="object-cover" data-testid="img-shop-banner" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start gap-4 mb-8">
          {shop.logo_url ? (
            <Image src={shop.logo_url} alt={shop.business_name || "Shop"} width={64} height={64} className="rounded-xl object-contain flex-shrink-0 border border-neutral-200" data-testid="img-shop-logo" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-white">
                {(shop.business_name || "S")[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900" data-testid="text-shop-name">
              {shop.business_name || "Shop"}
            </h1>
            {shop.description && (
              <p className="text-neutral-500 mt-1 text-sm md:text-base" data-testid="text-shop-description">
                {shop.description}
              </p>
            )}
            {shop.website_url && (
              <a href={shop.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-1" data-testid="link-shop-website">
                <Globe className="w-3.5 h-3.5" />
                {shop.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16" data-testid="shop-empty">
            <p className="text-neutral-400 font-medium">No products available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="shop-products-grid">
            {products.map((product) => (
              <Link
                key={product.checkout_page_id}
                href={product.checkout_url}
                className="group bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg hover:border-neutral-300 transition-all"
                data-testid={`card-product-${product.checkout_page_id}`}
              >
                {product.image_url ? (
                  <div className="aspect-[4/3] relative bg-neutral-100">
                    <Image src={product.image_url} alt={product.title} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-gradient-to-br from-neutral-100 to-neutral-50 flex items-center justify-center">
                    <span className="text-4xl font-bold text-neutral-200">
                      {product.title[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors line-clamp-2" data-testid={`text-product-title-${product.checkout_page_id}`}>
                      {product.title}
                    </h3>
                    {product.amount_usd && (
                      <span className="text-sm font-bold text-neutral-900 flex-shrink-0 bg-neutral-100 px-2 py-0.5 rounded-lg" data-testid={`text-product-price-${product.checkout_page_id}`}>
                        ${product.amount_usd.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {product.description && (
                    <p className="text-xs text-neutral-500 mt-1.5 line-clamp-2">{product.description}</p>
                  )}

                  {product.page_type === "event" && product.buyer_count > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-neutral-400" data-testid={`text-buyer-count-${product.checkout_page_id}`}>
                      <Users className="w-3.5 h-3.5" />
                      <span>{product.buyer_count} {product.buyer_count === 1 ? "person" : "people"} bought this</span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>{product.page_type === "event" ? "Get Ticket" : "Buy Now"}</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-xs text-neutral-300 font-medium" data-testid="text-shop-footer">
            Powered by CreditClaw
          </p>
        </div>
      </div>
    </div>
  );
}
