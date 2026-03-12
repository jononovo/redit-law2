"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, ArrowLeft, Copy, Check, FileText, Send, XCircle, Download, Clock, Eye, CheckCircle2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/wallet/status-badge";
import { useAuth } from "@/lib/auth/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import Link from "next/link";

interface InvoiceDetail {
  invoice_id: string;
  reference_number: string;
  checkout_page_id: string;
  status: string;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_type: string | null;
  line_items: Array<{ description: string; quantity: number; unitPriceUsd: number; amountUsd: number }>;
  subtotal_usd: number;
  tax_usd: number;
  total_usd: number;
  payment_url: string;
  pdf_url: string | null;
  due_date: string | null;
  sender_name: string | null;
  sender_email: string | null;
  notes: string | null;
  sale_id: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function InvoiceDetailPage() {
  const { invoice_id } = useParams<{ invoice_id: string }>();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    try {
      const res = await authFetch(`/api/v1/invoices/${invoice_id}`);
      if (res.ok) {
        setInvoice(await res.json());
      } else {
        setError("Invoice not found");
      }
    } catch {
      setError("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [invoice_id]);

  useEffect(() => {
    if (user && invoice_id) fetchInvoice();
  }, [user, invoice_id, fetchInvoice]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyPaymentLink = async () => {
    if (!invoice) return;
    const fullUrl = `${window.location.origin}${invoice.payment_url}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!invoice) return;
    setActionLoading("send");
    try {
      const res = await authFetch(`/api/v1/invoices/${invoice_id}/send`, { method: "POST" });
      if (res.ok) {
        await fetchInvoice();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to send invoice");
      }
    } catch {
      setError("Failed to send invoice");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!invoice) return;
    setActionLoading("cancel");
    try {
      const res = await authFetch(`/api/v1/invoices/${invoice_id}/cancel`, { method: "POST" });
      if (res.ok) {
        await fetchInvoice();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to cancel invoice");
      }
    } catch {
      setError("Failed to cancel invoice");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="space-y-4">
        <Link href="/invoices">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-invoices">
            <ArrowLeft className="w-4 h-4" /> Back to Invoices
          </Button>
        </Link>
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-100">
          <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500" data-testid="text-invoice-error">{error}</p>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const timelineSteps = [
    { label: "Created", date: invoice.created_at, icon: FileText, done: true },
    { label: "Sent", date: invoice.sent_at, icon: Send, done: !!invoice.sent_at },
    { label: "Viewed", date: invoice.viewed_at, icon: Eye, done: !!invoice.viewed_at },
    { label: "Paid", date: invoice.paid_at, icon: CheckCircle2, done: !!invoice.paid_at },
  ];

  const isCancelled = invoice.status === "cancelled";
  const canSend = invoice.status === "draft";
  const canCancel = invoice.status !== "paid" && invoice.status !== "cancelled";

  return (
    <div className="space-y-6" data-testid="invoice-detail-page">
      <div className="flex items-center gap-3">
        <Link href="/invoices">
          <Button variant="ghost" size="icon" data-testid="button-back-invoices">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900" data-testid="text-invoice-ref">
              {invoice.reference_number}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-neutral-500 mt-0.5">
            Invoice {invoice.invoice_id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {invoice.pdf_url && (
            <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-download-pdf">
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </a>
          )}
          {canSend && (
            <Button
              size="sm"
              className="gap-2"
              onClick={handleSend}
              disabled={actionLoading === "send"}
              data-testid="button-send-invoice"
            >
              {actionLoading === "send" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Invoice
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleCancel}
              disabled={actionLoading === "cancel"}
              data-testid="button-cancel-invoice"
            >
              {actionLoading === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Cancel
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100" data-testid="text-action-error">
          {error}
        </div>
      )}

      {!isCancelled && (
        <div className="bg-white rounded-xl border border-neutral-100 p-6" data-testid="invoice-timeline">
          <div className="flex items-center justify-between">
            {timelineSteps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.done ? "bg-emerald-100 text-emerald-600" : "bg-neutral-100 text-neutral-400"
                }`}>
                  <step.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-medium ${step.done ? "text-neutral-900" : "text-neutral-400"}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-neutral-400 truncate">
                    {step.date ? formatDateTime(step.date) : "—"}
                  </p>
                </div>
                {i < timelineSteps.length - 1 && (
                  <div className={`flex-1 h-px mx-2 ${step.done ? "bg-emerald-200" : "bg-neutral-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-neutral-100 p-6" data-testid="invoice-from-section">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">From</h3>
          <p className="text-sm font-medium text-neutral-900" data-testid="text-sender-name">
            {invoice.sender_name || "—"}
          </p>
          <p className="text-sm text-neutral-500" data-testid="text-sender-email">
            {invoice.sender_email || "—"}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-100 p-6" data-testid="invoice-to-section">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Bill To</h3>
          <p className="text-sm font-medium text-neutral-900" data-testid="text-recipient-name">
            {invoice.recipient_name || "—"}
          </p>
          <p className="text-sm text-neutral-500" data-testid="text-recipient-email">
            {invoice.recipient_email || "—"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 p-6" data-testid="invoice-items-section">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4">Line Items</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider pb-3">Description</th>
              <th className="text-right text-xs font-medium text-neutral-500 uppercase tracking-wider pb-3">Qty</th>
              <th className="text-right text-xs font-medium text-neutral-500 uppercase tracking-wider pb-3">Unit Price</th>
              <th className="text-right text-xs font-medium text-neutral-500 uppercase tracking-wider pb-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.line_items.map((item, i) => (
              <tr key={i} className="border-b border-neutral-50" data-testid={`invoice-line-item-${i}`}>
                <td className="py-3 text-sm text-neutral-700">{item.description}</td>
                <td className="py-3 text-sm text-neutral-600 text-right">{item.quantity}</td>
                <td className="py-3 text-sm text-neutral-600 text-right">{formatCurrency(item.unitPriceUsd)}</td>
                <td className="py-3 text-sm font-medium text-neutral-900 text-right">{formatCurrency(item.amountUsd)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-100">
              <td colSpan={3} className="py-2 text-sm text-neutral-600 text-right">Subtotal</td>
              <td className="py-2 text-sm text-neutral-900 text-right" data-testid="text-detail-subtotal">
                {formatCurrency(invoice.subtotal_usd)}
              </td>
            </tr>
            {invoice.tax_usd > 0 && (
              <tr>
                <td colSpan={3} className="py-2 text-sm text-neutral-600 text-right">Tax</td>
                <td className="py-2 text-sm text-neutral-900 text-right" data-testid="text-detail-tax">
                  {formatCurrency(invoice.tax_usd)}
                </td>
              </tr>
            )}
            <tr className="border-t border-neutral-200">
              <td colSpan={3} className="py-3 text-sm font-semibold text-neutral-900 text-right">Total</td>
              <td className="py-3 text-base font-bold text-neutral-900 text-right" data-testid="text-detail-total">
                {formatCurrency(invoice.total_usd)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-neutral-100 p-6 space-y-4" data-testid="invoice-details-section">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Due Date</span>
              <span className="text-neutral-900 font-medium" data-testid="text-detail-due-date">{formatDate(invoice.due_date)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Created</span>
              <span className="text-neutral-900" data-testid="text-detail-created">{formatDateTime(invoice.created_at)}</span>
            </div>
            {invoice.sale_id && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Sale ID</span>
                <Link href={`/app/sales/${invoice.sale_id}`} className="text-violet-600 hover:underline font-mono text-xs" data-testid="link-invoice-sale">
                  {invoice.sale_id}
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-100 p-6 space-y-4" data-testid="invoice-payment-link-section">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Payment Link</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-neutral-50 px-3 py-2 rounded-lg text-neutral-700 truncate" data-testid="text-payment-url">
              {invoice.payment_url}
            </code>
            <Button variant="outline" size="icon" onClick={copyPaymentLink} data-testid="button-copy-payment-link">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="bg-white rounded-xl border border-neutral-100 p-6" data-testid="invoice-notes-section">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Notes</h3>
          <p className="text-sm text-neutral-600 whitespace-pre-wrap" data-testid="text-invoice-notes">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
