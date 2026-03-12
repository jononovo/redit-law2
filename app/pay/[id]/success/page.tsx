"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, ExternalLink, Mail, Download } from "lucide-react";
import Image from "next/image";

interface SuccessData {
  checkout_page_id: string;
  title: string;
  description: string | null;
  page_type: string;
  amount_usdc: number | null;
  success_url: string | null;
  success_message: string | null;
  seller_name: string | null;
  seller_logo_url: string | null;
  seller_email: string | null;
  sale_verified: boolean;
  amount_paid_usdc: number | null;
  digital_product_url: string | null;
}

function formatUsd(amountUsdc: number): string {
  return (amountUsdc / 1_000_000).toFixed(2);
}

function SuccessContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const saleId = searchParams.get("sale_id");
  const [data, setData] = useState<SuccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const url = saleId
      ? `/api/v1/checkout/${id}/success?sale_id=${saleId}`
      : `/api/v1/checkout/${id}/success`;

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d) setData(d);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id, saleId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" data-testid="loading-spinner" />
      </div>
    );
  }

  const amountDisplay = data?.sale_verified && data.amount_paid_usdc
    ? formatUsd(data.amount_paid_usdc)
    : data?.amount_usdc
      ? formatUsd(data.amount_usdc)
      : null;

  const isDigitalProduct = data?.page_type === "digital_product" && data?.digital_product_url;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-100 p-10 max-w-md w-full text-center" data-testid="checkout-success-card">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6" data-testid="icon-success-check">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-neutral-900 mb-2" data-testid="text-payment-successful">
            Payment Successful
          </h1>

          {amountDisplay && (
            <p className="text-3xl font-bold text-neutral-900 mt-2" data-testid="text-amount-paid">
              ${amountDisplay} <span className="text-base font-medium text-neutral-400">USD</span>
            </p>
          )}

          {data?.success_message ? (
            <p className="text-neutral-600 font-medium mt-4 leading-relaxed" data-testid="text-success-message">
              {data.success_message}
            </p>
          ) : (
            <p className="text-neutral-500 mt-4" data-testid="text-default-message">
              Your payment has been received and is being processed.
            </p>
          )}

          {data?.title && (
            <div className="mt-6 p-4 rounded-xl bg-neutral-50 border border-neutral-100" data-testid="checkout-details">
              {data.seller_name && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  {data.seller_logo_url && (
                    <img
                      src={data.seller_logo_url}
                      alt={data.seller_name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  )}
                  <p className="text-xs text-neutral-400" data-testid="text-seller-name">{data.seller_name}</p>
                </div>
              )}
              <p className="font-semibold text-neutral-900" data-testid="text-checkout-title">{data.title}</p>
              {data.description && (
                <p className="text-sm text-neutral-500 mt-1" data-testid="text-checkout-description">{data.description}</p>
              )}
            </div>
          )}

          <div className="mt-8 space-y-3">
            {isDigitalProduct && (
              <a
                href={data.digital_product_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors text-base"
                data-testid="link-digital-product"
              >
                <Download size={18} />
                Access your product
              </a>
            )}

            {data?.success_url && (
              <a
                href={data.success_url}
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors"
                data-testid="link-return-seller"
              >
                Return to seller
                <ExternalLink size={16} />
              </a>
            )}

            {data?.seller_email && (
              <a
                href={`mailto:${data.seller_email}`}
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-neutral-100 text-neutral-700 font-semibold hover:bg-neutral-200 transition-colors"
                data-testid="link-contact-seller"
              >
                <Mail size={16} />
                Contact seller
              </a>
            )}
          </div>

          {error && !data && (
            <p className="text-sm text-neutral-400 mt-6" data-testid="text-error-fallback">
              Payment confirmed. You can safely close this page.
            </p>
          )}
        </div>
      </div>

      <footer className="py-6 text-center" data-testid="footer-branding">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Image
            src="/images/logo-claw-chip.png"
            alt="CreditClaw"
            width={20}
            height={20}
            className="opacity-60"
          />
          <span className="text-sm font-semibold text-neutral-400">
            Powered by CreditClaw
          </span>
        </div>
        <p className="text-xs text-neutral-400">
          Payments settle as USDC on Base
        </p>
      </footer>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
