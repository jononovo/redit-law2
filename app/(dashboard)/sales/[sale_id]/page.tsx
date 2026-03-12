"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, DollarSign, Clock, CheckCircle2, XCircle,
  ExternalLink, CreditCard, Loader2, RefreshCw, Copy,
  User, Globe, Monitor, FileText, Link2, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/wallet/status-badge";
import { useAuth } from "@/lib/auth/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface SaleDetailDTO {
  sale_id: string;
  checkout_page_id: string;
  checkout_title: string | null;
  checkout_description: string | null;
  amount_usd: number;
  payment_method: string;
  status: string;
  buyer_type: string | null;
  buyer_email: string | null;
  buyer_identifier: string | null;
  buyer_ip: string | null;
  buyer_user_agent: string | null;
  tx_hash: string | null;
  stripe_onramp_session_id: string | null;
  privy_transaction_id: number | null;
  invoice_id: string | null;
  metadata: Record<string, any> | null;
  confirmed_at: string | null;
  created_at: string;
}

const SALE_TIMELINE_STEPS = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
];

function SaleTimeline({ status }: { status: string }) {
  const isFailed = ["failed", "amount_mismatch", "refunded"].includes(status);
  const currentIdx = status === "confirmed" ? 1 : 0;

  if (isFailed) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 bg-red-50 rounded-lg border border-red-200" data-testid="sale-timeline-failed">
        <XCircle className="w-5 h-5 text-red-500" />
        <span className="text-sm font-medium text-red-700">{status.replace(/_/g, " ")}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3" data-testid="sale-timeline">
      {SALE_TIMELINE_STEPS.map((step, idx) => {
        const isCompleted = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex flex-col items-center flex-1 relative">
            {idx > 0 && (
              <div className={`absolute top-4 -left-1/2 w-full h-0.5 ${idx <= currentIdx ? "bg-violet-400" : "bg-neutral-200"}`} style={{ zIndex: 0 }} />
            )}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center relative z-10 ${
                isCurrent ? "bg-violet-600 text-white ring-2 ring-violet-200" :
                isCompleted ? "bg-violet-100 text-violet-600" :
                "bg-neutral-100 text-neutral-400"
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span className={`text-xs mt-1 ${isCurrent ? "font-semibold text-violet-700" : isCompleted ? "text-violet-600" : "text-neutral-400"}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatAmount(amountUsd: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountUsd);
}

function methodLabel(method: string) {
  const labels: Record<string, string> = {
    stripe_onramp: "Card / Bank (Stripe Onramp)",
    usdc_direct: "USDC Direct",
    x402: "x402 Protocol",
  };
  return labels[method] || method;
}

function methodColor(method: string) {
  const colors: Record<string, string> = {
    stripe_onramp: "bg-blue-50 text-blue-700 border-blue-200",
    usdc_direct: "bg-purple-50 text-purple-700 border-purple-200",
    x402: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return colors[method] || "bg-neutral-50 text-neutral-700 border-neutral-200";
}

function truncateStr(str: string, maxLen = 24) {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, 10)}…${str.slice(-8)}`;
}

export default function SaleDetailPage() {
  const { sale_id } = useParams<{ sale_id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sale, setSale] = useState<SaleDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSale = useCallback(async () => {
    try {
      const res = await authFetch(`/api/v1/sales/${sale_id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load sale");
        return;
      }
      const data = await res.json();
      setSale(data.sale);
    } catch {
      setError("Failed to load sale");
    } finally {
      setLoading(false);
    }
  }, [sale_id]);

  useEffect(() => {
    if (user && sale_id) fetchSale();
  }, [user, sale_id, fetchSale]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSale();
    setRefreshing(false);
    toast({ title: "Sale refreshed" });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2" data-testid="button-back">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-100" data-testid="text-sale-error">
          <DollarSign className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
          <h3 className="text-lg font-semibold text-neutral-700">{error || "Sale not found"}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto" data-testid="sale-detail-page">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2" data-testid="button-back">
          <ArrowLeft className="w-4 h-4" /> Back to Sales
        </Button>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1" data-testid="button-refresh-sale">
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-violet-50 flex items-center justify-center border border-violet-100">
              <DollarSign className="w-7 h-7 text-violet-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-neutral-900" data-testid="text-sale-amount">
                  {formatAmount(sale.amount_usd)}
                </h1>
                <StatusBadge status={sale.status} />
              </div>
              <p className="text-sm text-neutral-500 mt-0.5" data-testid="text-sale-id">
                Sale {sale.sale_id}
              </p>
            </div>
          </div>
        </div>

        <SaleTimeline status={sale.status} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-neutral-400" />
              Payment Details
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Amount</span>
                <span className="font-semibold text-neutral-900" data-testid="text-detail-amount">{formatAmount(sale.amount_usd)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Method</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${methodColor(sale.payment_method)}`} data-testid="text-detail-method">
                  {methodLabel(sale.payment_method)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Status</span>
                <StatusBadge status={sale.status} />
              </div>
              {sale.confirmed_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Confirmed</span>
                  <span className="text-neutral-700" data-testid="text-confirmed-at">
                    {new Date(sale.confirmed_at).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Created</span>
                <span className="text-neutral-700" data-testid="text-created-at">
                  {new Date(sale.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-neutral-400" />
              Checkout Page
            </h4>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-neutral-500 block">Title</span>
                <Link
                  href={`/app/checkout/create`}
                  className="text-violet-600 hover:text-violet-800 hover:underline inline-flex items-center gap-1 font-medium"
                  data-testid="link-checkout-page"
                >
                  {sale.checkout_title || sale.checkout_page_id}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              {sale.checkout_description && (
                <div className="text-sm">
                  <span className="text-neutral-500 block">Description</span>
                  <span className="text-neutral-700" data-testid="text-checkout-description">{sale.checkout_description}</span>
                </div>
              )}
              <div className="text-sm">
                <span className="text-neutral-500 block">Page ID</span>
                <div className="flex items-center gap-1">
                  <code className="font-mono text-xs text-neutral-600" data-testid="text-checkout-page-id">{sale.checkout_page_id}</code>
                  <button
                    onClick={() => copyToClipboard(sale.checkout_page_id, "Checkout page ID")}
                    className="text-neutral-400 hover:text-neutral-600"
                    data-testid="button-copy-checkout-id"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
            <User className="w-4 h-4 text-neutral-400" />
            Buyer Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sale.buyer_email && (
              <div className="text-sm">
                <span className="text-neutral-500 block">Email</span>
                <span className="text-neutral-700" data-testid="text-buyer-email">{sale.buyer_email}</span>
              </div>
            )}
            {sale.buyer_identifier && (
              <div className="text-sm">
                <span className="text-neutral-500 block">Identifier</span>
                <div className="flex items-center gap-1">
                  <code className="font-mono text-xs text-neutral-600" data-testid="text-buyer-identifier">{sale.buyer_identifier}</code>
                  <button
                    onClick={() => copyToClipboard(sale.buyer_identifier!, "Buyer identifier")}
                    className="text-neutral-400 hover:text-neutral-600"
                    data-testid="button-copy-buyer-id"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
            {sale.buyer_type && (
              <div className="text-sm">
                <span className="text-neutral-500 block">Type</span>
                <span className="text-neutral-700" data-testid="text-buyer-type">{sale.buyer_type}</span>
              </div>
            )}
            {sale.buyer_ip && (
              <div className="text-sm">
                <span className="text-neutral-500 block flex items-center gap-1"><Globe className="w-3 h-3" /> IP Address</span>
                <span className="font-mono text-xs text-neutral-600" data-testid="text-buyer-ip">{sale.buyer_ip}</span>
              </div>
            )}
            {sale.buyer_user_agent && (
              <div className="text-sm col-span-1 sm:col-span-2">
                <span className="text-neutral-500 block flex items-center gap-1"><Monitor className="w-3 h-3" /> User Agent</span>
                <span className="font-mono text-xs text-neutral-600 break-all" data-testid="text-buyer-user-agent">{sale.buyer_user_agent}</span>
              </div>
            )}
            {!sale.buyer_email && !sale.buyer_identifier && !sale.buyer_ip && (
              <div className="text-sm text-neutral-400 col-span-2">No buyer information available</div>
            )}
          </div>
        </div>

        {(sale.stripe_onramp_session_id || sale.tx_hash || sale.privy_transaction_id) && (
          <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
              <Hash className="w-4 h-4 text-neutral-400" />
              Transaction References
            </h4>
            <div className="space-y-2">
              {sale.stripe_onramp_session_id && (
                <div className="text-sm">
                  <span className="text-neutral-500 block">Stripe Onramp Session</span>
                  <div className="flex items-center gap-1">
                    <code className="font-mono text-xs text-neutral-600" data-testid="text-stripe-session">{truncateStr(sale.stripe_onramp_session_id)}</code>
                    <button
                      onClick={() => copyToClipboard(sale.stripe_onramp_session_id!, "Stripe session ID")}
                      className="text-neutral-400 hover:text-neutral-600"
                      data-testid="button-copy-stripe-session"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
              {sale.tx_hash && (
                <div className="text-sm">
                  <span className="text-neutral-500 block">Transaction Hash</span>
                  <div className="flex items-center gap-1">
                    <code className="font-mono text-xs text-neutral-600" data-testid="text-tx-hash">{truncateStr(sale.tx_hash)}</code>
                    <button
                      onClick={() => copyToClipboard(sale.tx_hash!, "Transaction hash")}
                      className="text-neutral-400 hover:text-neutral-600"
                      data-testid="button-copy-tx-hash"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
              {sale.privy_transaction_id && (
                <div className="text-sm">
                  <span className="text-neutral-500 block">Privy Transaction ID</span>
                  <span className="font-mono text-xs text-neutral-600" data-testid="text-privy-tx-id">{sale.privy_transaction_id}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {sale.invoice_id && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-semibold text-indigo-800">Linked Invoice</h4>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="font-mono text-xs text-indigo-700" data-testid="text-invoice-id">{sale.invoice_id}</code>
              <Link
                href={`/app/invoices/${sale.invoice_id}`}
                className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                data-testid="link-invoice"
              >
                View Invoice <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-neutral-400 border-t border-neutral-100 pt-3">
          <span data-testid="text-sale-footer-id">Sale {sale.sale_id}</span>
          <span data-testid="text-sale-footer-date">{new Date(sale.created_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
