"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, DollarSign, Filter, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/wallet/status-badge";
import { useAuth } from "@/lib/auth/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import Link from "next/link";

interface SaleDTO {
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
  confirmed_at: string | null;
  created_at: string;
}

export default function SalesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sales, setSales] = useState<SaleDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  const fetchSales = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (methodFilter !== "all") params.set("payment_method", methodFilter);

      const res = await authFetch(`/api/v1/sales?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSales(data.sales || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [statusFilter, methodFilter]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchSales();
    }
  }, [user, fetchSales]);

  const formatAmount = (amountUsd: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountUsd);
  };

  const methodLabel = (method: string) => {
    const labels: Record<string, string> = {
      stripe_onramp: "Card / Bank",
      usdc_direct: "USDC Direct",
      x402: "x402",
    };
    return labels[method] || method;
  };

  const methodColor = (method: string) => {
    const colors: Record<string, string> = {
      stripe_onramp: "bg-blue-50 text-blue-700",
      usdc_direct: "bg-purple-50 text-purple-700",
      x402: "bg-emerald-50 text-emerald-700",
    };
    return colors[method] || "bg-neutral-50 text-neutral-700";
  };

  const truncateAddress = (addr: string) => {
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  };

  const buyerDisplay = (sale: SaleDTO) => {
    if (sale.buyer_email) return sale.buyer_email;
    if (sale.buyer_identifier) return truncateAddress(sale.buyer_identifier);
    return "—";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="sales-page">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900" data-testid="text-sales-title">My Sales</h1>
        <p className="text-sm text-neutral-500 mt-1">Incoming payments from your checkout pages</p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 p-4" data-testid="sales-filters">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-neutral-400" />
          <span className="text-sm font-medium text-neutral-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-neutral-500">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-neutral-500">Payment Method</Label>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger data-testid="select-method-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="stripe_onramp">Card / Bank</SelectItem>
                <SelectItem value="usdc_direct">USDC Direct</SelectItem>
                <SelectItem value="x402">x402</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {sales.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-100" data-testid="text-no-sales">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-700">No sales yet</h3>
          <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
            Sales will appear here when buyers complete payments on your checkout pages.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden" data-testid="sales-list">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Date</th>
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Sale ID</th>
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Checkout Page</th>
                  <th className="text-right text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Amount</th>
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Method</th>
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Buyer</th>
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr
                    key={sale.sale_id}
                    className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors cursor-pointer"
                    data-testid={`sale-row-${sale.sale_id}`}
                    onClick={() => router.push(`/app/sales/${sale.sale_id}`)}
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-500" data-testid={`text-sale-date-${sale.sale_id}`}>
                        {new Date(sale.created_at).toLocaleDateString()}{" "}
                        {new Date(sale.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-neutral-700" data-testid={`text-sale-id-${sale.sale_id}`}>
                        {sale.sale_id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/app/checkout/create`}
                        className="text-sm text-violet-600 hover:text-violet-800 hover:underline inline-flex items-center gap-1"
                        data-testid={`link-checkout-page-${sale.sale_id}`}
                      >
                        {sale.checkout_title || sale.checkout_page_id}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-neutral-900" data-testid={`text-sale-amount-${sale.sale_id}`}>
                        {formatAmount(sale.amount_usd)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${methodColor(sale.payment_method)}`}
                        data-testid={`badge-method-${sale.sale_id}`}
                      >
                        {methodLabel(sale.payment_method)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-600" data-testid={`text-sale-buyer-${sale.sale_id}`}>
                        {buyerDisplay(sale)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={sale.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}