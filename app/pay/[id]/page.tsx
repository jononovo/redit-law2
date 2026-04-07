"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Lock, Loader2, AlertCircle, Clock, Ban, Mail, FileText, Calendar, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CheckoutPaymentPanel } from "@/lib/agent-shops/payments/components/checkout-payment-panel";
import type { PaymentResult } from "@/lib/agent-shops/payments/types";

interface CheckoutPageData {
  checkout_page_id: string;
  title: string;
  description: string | null;
  amount_usdc: number | null;
  amount_locked: boolean;
  allowed_methods: string[];
  success_url: string | null;
  success_message: string | null;
  wallet_address: string;
  seller_name: string | null;
  seller_logo_url: string | null;
  seller_email: string | null;
  page_type: "product" | "event" | "digital_product";
  collect_buyer_name: boolean;
}

interface InvoiceData {
  reference_number: string;
  recipient_name: string | null;
  recipient_email: string | null;
  line_items: Array<{
    description: string;
    quantity: number;
    unitPriceUsd: number;
    amountUsd: number;
  }>;
  subtotal_usd: number;
  tax_usd: number;
  total_usd: number;
  due_date: string | null;
  status: string;
  checkout_page_id: string;
}

type PageState = "loading" | "ready" | "not_found" | "expired" | "error";

export default function PublicCheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const invoiceRef = searchParams.get("ref");
  const testToken = searchParams.get("t");

  const [pageState, setPageState] = useState<PageState>("loading");
  const [checkout, setCheckout] = useState<CheckoutPageData | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [buyerCount, setBuyerCount] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const publicUrl = testToken
          ? `/api/v1/checkout/${id}/public?t=${encodeURIComponent(testToken)}`
          : `/api/v1/checkout/${id}/public`;
        const res = await fetch(publicUrl);
        if (res.status === 404) { setPageState("not_found"); return; }
        if (res.status === 410) { setPageState("expired"); return; }
        if (!res.ok) { setPageState("error"); return; }

        const data = await res.json();
        setCheckout(data);

        if (invoiceRef) {
          try {
            const invRes = await fetch(`/api/v1/invoices/by-ref/${encodeURIComponent(invoiceRef)}`);
            if (invRes.ok) {
              const invData = await invRes.json();
              if (invData.checkout_page_id === data.checkout_page_id && invData.status !== "paid" && invData.status !== "cancelled") {
                setInvoice(invData);
              }
            }
          } catch {}
        }

        if (data.page_type === "event") {
          try {
            const buyersRes = await fetch(`/api/v1/checkout/${id}/buyers`);
            if (buyersRes.ok) {
              const buyersData = await buyersRes.json();
              setBuyerCount(buyersData.buyer_count);
            }
          } catch {}
        }

        setPageState("ready");
      } catch {
        setPageState("error");
      }
    };

    loadData();
  }, [id, invoiceRef]);

  const effectiveAmountUsd = invoice
    ? invoice.total_usd
    : (checkout?.amount_locked && checkout?.amount_usdc)
      ? checkout.amount_usdc / 1_000_000
      : null;

  const displayAmount = effectiveAmountUsd ? effectiveAmountUsd.toFixed(2) : null;

  const handlePaymentSuccess = (result: PaymentResult) => {
    toast({ title: "Payment successful!", description: "Your payment has been processed." });
    setTimeout(() => {
      const successUrl = result.saleId
        ? `/pay/${id}/success?sale_id=${result.saleId}`
        : `/pay/${id}/success`;
      router.push(successUrl);
    }, 1500);
  };

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3" data-testid="loading-checkout">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          <p className="text-sm text-neutral-500 font-medium">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (pageState === "not_found") {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6" data-testid="checkout-not-found">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <Ban className="w-8 h-8 text-neutral-400" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Checkout Not Found</h1>
          <p className="text-neutral-500 font-medium">This checkout page doesn&apos;t exist or is no longer available.</p>
        </div>
      </div>
    );
  }

  if (pageState === "expired") {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6" data-testid="checkout-expired">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Checkout Expired</h1>
          <p className="text-neutral-500 font-medium">This checkout page has expired and is no longer accepting payments.</p>
        </div>
      </div>
    );
  }

  if (pageState === "error" || !checkout) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6" data-testid="checkout-error">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Something went wrong</h1>
          <p className="text-neutral-500 font-medium">We couldn&apos;t load this checkout page. Please try again later.</p>
        </div>
      </div>
    );
  }

  const renderLeftPanel = () => {
    if (invoice) {
      return (
        <div className="bg-neutral-900 text-white flex flex-col justify-between p-6 md:p-10 lg:p-14 xl:p-20" data-testid="checkout-invoice-panel">
          <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
            <div className="mb-8">
              {checkout.seller_logo_url ? (
                <Image src={checkout.seller_logo_url} alt={checkout.seller_name || "Seller"} width={48} height={48} className="rounded-lg object-contain" data-testid="img-seller-logo" />
              ) : (
                <Image src="/assets/images/logo-claw-chip.png" alt="CreditClaw" width={48} height={48} data-testid="img-checkout-logo" />
              )}
            </div>

            {checkout.seller_name && (
              <p className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-1" data-testid="text-seller-name">
                {checkout.seller_name}
              </p>
            )}
            {checkout.seller_email && (
              <p className="text-xs text-white/40 mb-4">{checkout.seller_email}</p>
            )}

            <div className="border-t border-white/10 pt-4 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-white/40" />
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Invoice</span>
              </div>
              <p className="text-lg font-bold text-white" data-testid="text-invoice-ref">{invoice.reference_number}</p>
            </div>

            {(invoice.recipient_name || invoice.recipient_email) && (
              <div className="mb-4">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-1">Bill To</span>
                {invoice.recipient_name && (
                  <p className="text-sm font-medium text-white" data-testid="text-invoice-recipient">{invoice.recipient_name}</p>
                )}
                {invoice.recipient_email && (
                  <p className="text-xs text-white/50">{invoice.recipient_email}</p>
                )}
              </div>
            )}

            <div className="border-t border-white/10 pt-3 mb-3">
              {invoice.line_items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1" data-testid={`invoice-line-item-${i}`}>
                  <span className="text-white/70">
                    {item.description}
                    {item.quantity > 1 && <span className="text-white/40 ml-1">x{item.quantity}</span>}
                  </span>
                  <span className="text-white font-medium">${item.amountUsd.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Subtotal</span>
                <span className="text-white/70">${invoice.subtotal_usd.toFixed(2)}</span>
              </div>
              {invoice.tax_usd > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Tax</span>
                  <span className="text-white/70">${invoice.tax_usd.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-1">
                <span className="text-white">Total</span>
                <span className="text-white" data-testid="text-invoice-total">${invoice.total_usd.toFixed(2)}</span>
              </div>
            </div>

            {invoice.due_date && (
              <div className="mt-4 flex items-center gap-2 text-white/40">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium" data-testid="text-invoice-due">
                  Due: {new Date(invoice.due_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-xs text-white/30 font-medium" data-testid="text-checkout-footer">
              Powered by CreditClaw &middot; Payments settle as USDC on Base
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-neutral-900 text-white flex flex-col justify-between p-6 md:p-10 lg:p-14 xl:p-20">
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <div className="mb-8">
            {checkout.seller_logo_url ? (
              <Image src={checkout.seller_logo_url} alt={checkout.seller_name || "Seller"} width={48} height={48} className="rounded-lg object-contain" data-testid="img-seller-logo" />
            ) : (
              <Image src="/assets/images/logo-claw-chip.png" alt="CreditClaw" width={48} height={48} data-testid="img-checkout-logo" />
            )}
          </div>

          {checkout.seller_name && (
            <p className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2" data-testid="text-seller-name">
              {checkout.seller_name}
            </p>
          )}

          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3" data-testid="text-checkout-title">
            {checkout.title}
          </h1>

          {checkout.description && (
            <p className="text-white/60 font-medium text-sm md:text-base leading-relaxed mb-6" data-testid="text-checkout-description">
              {checkout.description}
            </p>
          )}

          <div className="mt-2">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 block">Amount</label>
            {displayAmount ? (
              <div className="flex items-center gap-3" data-testid="display-locked-amount">
                <Lock className="w-5 h-5 text-white/40 flex-shrink-0" />
                <span className="text-4xl md:text-5xl font-bold text-white">${displayAmount}</span>
                <span className="text-sm text-white/40 font-medium self-end mb-1">USD</span>
              </div>
            ) : (
              <p className="text-lg text-white/60 font-medium" data-testid="text-open-amount">
                Enter your amount on the right &rarr;
              </p>
            )}
          </div>

          {checkout.seller_email && (
            <div className="mt-8 flex items-center gap-2 text-white/40" data-testid="text-seller-email">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">{checkout.seller_email}</span>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-xs text-white/30 font-medium" data-testid="text-checkout-footer">
            Powered by CreditClaw &middot; Payments settle as USDC on Base
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2" data-testid="checkout-page">
      {renderLeftPanel()}

      <div className="bg-white flex flex-col justify-center p-6 md:p-10 lg:p-14">
        <CheckoutPaymentPanel
          checkoutPageId={checkout.checkout_page_id}
          walletAddress={checkout.wallet_address}
          effectiveAmount={effectiveAmountUsd}
          displayAmount={displayAmount}
          invoiceRef={invoice?.reference_number}
          collectBuyerName={checkout.collect_buyer_name}
          allowedMethods={checkout.allowed_methods}
          pageType={checkout.page_type}
          buyerCount={buyerCount}
          testToken={testToken || undefined}
          onSuccess={handlePaymentSuccess}
        />
      </div>
    </div>
  );
}
