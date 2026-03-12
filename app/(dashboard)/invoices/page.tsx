"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Filter, Plus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/wallet/status-badge";
import { useAuth } from "@/lib/auth/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import Link from "next/link";

interface InvoiceDTO {
  invoice_id: string;
  reference_number: string;
  checkout_page_id: string;
  status: string;
  recipient_name: string | null;
  recipient_email: string | null;
  line_items: Array<{ description: string; quantity: number; unitPriceUsd: number; amountUsd: number }>;
  subtotal_usd: number;
  tax_usd: number;
  total_usd: number;
  due_date: string | null;
  payment_url: string;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchInvoices = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFrom) params.set("date_from", new Date(dateFrom).toISOString());
      if (dateTo) params.set("date_to", new Date(dateTo).toISOString());

      const res = await authFetch(`/api/v1/invoices?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchInvoices();
    }
  }, [user, fetchInvoices]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  const productSummary = (items: InvoiceDTO["line_items"]) => {
    if (!items || items.length === 0) return "—";
    if (items.length === 1) return items[0].description;
    return `${items[0].description} +${items.length - 1} more`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="invoices-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900" data-testid="text-invoices-title">Invoices</h1>
          <p className="text-sm text-neutral-500 mt-1">Create and manage invoices for your checkout pages</p>
        </div>
        <Link href="/invoices/create">
          <Button className="gap-2" data-testid="button-create-invoice">
            <Plus className="w-4 h-4" />
            Create Invoice
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 p-4" data-testid="invoices-filters">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-neutral-400" />
          <span className="text-sm font-medium text-neutral-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-neutral-500">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-invoice-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-neutral-500">From Date</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              data-testid="input-date-from"
            />
          </div>
          <div>
            <Label className="text-xs text-neutral-500">To Date</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              data-testid="input-date-to"
            />
          </div>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-100" data-testid="text-no-invoices">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-700">No invoices yet</h3>
          <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
            Create your first invoice to start billing customers through your checkout pages.
          </p>
          <Link href="/invoices/create">
            <Button className="mt-4 gap-2" variant="outline" data-testid="button-create-first-invoice">
              <Plus className="w-4 h-4" />
              Create Invoice
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden" data-testid="invoices-list">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Date</th>
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Ref #</th>
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Recipient</th>
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Product</th>
                  <th className="text-right text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Amount</th>
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Due Date</th>
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.invoice_id}
                    className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors cursor-pointer"
                    data-testid={`invoice-row-${inv.invoice_id}`}
                    onClick={() => router.push(`/app/invoices/${inv.invoice_id}`)}
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-500" data-testid={`text-invoice-date-${inv.invoice_id}`}>
                        {new Date(inv.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-neutral-700" data-testid={`text-invoice-ref-${inv.invoice_id}`}>
                        {inv.reference_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-600" data-testid={`text-invoice-recipient-${inv.invoice_id}`}>
                        {inv.recipient_name || inv.recipient_email || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-600 max-w-[200px] truncate block" data-testid={`text-invoice-product-${inv.invoice_id}`}>
                        {productSummary(inv.line_items)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-neutral-900" data-testid={`text-invoice-amount-${inv.invoice_id}`}>
                        {formatAmount(inv.total_usd)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-500" data-testid={`text-invoice-due-${inv.invoice_id}`}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={inv.status} />
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
