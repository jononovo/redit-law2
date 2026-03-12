"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import Link from "next/link";

interface CheckoutPageOption {
  checkout_page_id: string;
  title: string;
  amount_usd: number | null;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price_usd: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [checkoutPages, setCheckoutPages] = useState<CheckoutPageOption[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [checkoutPageId, setCheckoutPageId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price_usd: 0 },
  ]);
  const [taxUsd, setTaxUsd] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await authFetch("/api/v1/checkout-pages");
        if (res.ok) {
          const data = await res.json();
          setCheckoutPages(
            (data.checkout_pages || []).map((p: any) => ({
              checkout_page_id: p.checkout_page_id,
              title: p.title,
              amount_usd: p.amount_usd,
            }))
          );
        }
      } catch {} finally {
        setLoadingPages(false);
      }
    })();
  }, [user]);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unit_price_usd: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    if (field === "description") {
      updated[index].description = value as string;
    } else if (field === "quantity") {
      updated[index].quantity = Math.max(1, Number(value) || 1);
    } else {
      updated[index].unit_price_usd = Math.max(0, Number(value) || 0);
    }
    setLineItems(updated);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price_usd, 0);
  const tax = parseFloat(taxUsd) || 0;
  const total = subtotal + tax;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!checkoutPageId) {
      setError("Please select a checkout page.");
      return;
    }
    if (lineItems.some((item) => !item.description.trim())) {
      setError("All line items must have a description.");
      return;
    }
    if (lineItems.some((item) => item.unit_price_usd <= 0)) {
      setError("All line items must have a price greater than 0.");
      return;
    }

    setSubmitting(true);
    try {
      const body: any = {
        checkout_page_id: checkoutPageId,
        line_items: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price_usd: item.unit_price_usd,
        })),
      };

      if (recipientName.trim()) body.recipient_name = recipientName.trim();
      if (recipientEmail.trim()) body.recipient_email = recipientEmail.trim();
      if (tax > 0) body.tax_usd = tax;
      if (dueDate) body.due_date = new Date(dueDate).toISOString();
      if (notes.trim()) body.notes = notes.trim();

      const res = await authFetch("/api/v1/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/app/invoices/${data.invoice_id}`);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to create invoice");
      }
    } catch {
      setError("Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl" data-testid="create-invoice-page">
      <div className="flex items-center gap-3">
        <Link href="/invoices">
          <Button variant="ghost" size="icon" data-testid="button-back-invoices">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900" data-testid="text-create-invoice-title">Create Invoice</h1>
          <p className="text-sm text-neutral-500 mt-1">Generate an invoice linked to a checkout page</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100" data-testid="text-invoice-error">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-100 p-6 space-y-6">
        <div>
          <Label className="text-sm font-medium">Checkout Page</Label>
          <p className="text-xs text-neutral-500 mb-2">Select which checkout page this invoice will be linked to</p>
          {loadingPages ? (
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading checkout pages…
            </div>
          ) : (
            <Select value={checkoutPageId} onValueChange={setCheckoutPageId}>
              <SelectTrigger data-testid="select-checkout-page">
                <SelectValue placeholder="Select a checkout page" />
              </SelectTrigger>
              <SelectContent>
                {checkoutPages.map((p) => (
                  <SelectItem key={p.checkout_page_id} value={p.checkout_page_id}>
                    {p.title} {p.amount_usd ? `(${formatCurrency(p.amount_usd)})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Recipient Name</Label>
            <Input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="John Doe"
              data-testid="input-recipient-name"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Recipient Email</Label>
            <Input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="john@example.com"
              data-testid="input-recipient-email"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">Line Items</Label>
            <Button variant="outline" size="sm" onClick={addLineItem} className="gap-1" data-testid="button-add-line-item">
              <Plus className="w-3 h-3" />
              Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_80px_120px_36px] gap-2 items-end" data-testid={`line-item-${index}`}>
                <div>
                  {index === 0 && <Label className="text-xs text-neutral-500">Description</Label>}
                  <Input
                    value={item.description}
                    onChange={(e) => updateLineItem(index, "description", e.target.value)}
                    placeholder="Item description"
                    data-testid={`input-line-description-${index}`}
                  />
                </div>
                <div>
                  {index === 0 && <Label className="text-xs text-neutral-500">Qty</Label>}
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                    data-testid={`input-line-quantity-${index}`}
                  />
                </div>
                <div>
                  {index === 0 && <Label className="text-xs text-neutral-500">Unit Price ($)</Label>}
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unit_price_usd || ""}
                    onChange={(e) => updateLineItem(index, "unit_price_usd", e.target.value)}
                    placeholder="0.00"
                    data-testid={`input-line-price-${index}`}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLineItem(index)}
                  disabled={lineItems.length <= 1}
                  className="text-neutral-400 hover:text-red-500"
                  data-testid={`button-remove-line-${index}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Tax ($)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={taxUsd}
              onChange={(e) => setTaxUsd(e.target.value)}
              placeholder="0.00"
              data-testid="input-tax"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Due Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              data-testid="input-due-date"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes or payment instructions..."
            rows={3}
            data-testid="input-notes"
          />
        </div>

        <div className="border-t border-neutral-100 pt-4 space-y-1">
          <div className="flex justify-between text-sm text-neutral-600">
            <span>Subtotal</span>
            <span data-testid="text-subtotal">{formatCurrency(subtotal)}</span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-sm text-neutral-600">
              <span>Tax</span>
              <span data-testid="text-tax">{formatCurrency(tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-neutral-900 pt-1">
            <span>Total</span>
            <span data-testid="text-total">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/invoices">
          <Button variant="outline" data-testid="button-cancel-invoice">Cancel</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={submitting} className="gap-2" data-testid="button-submit-invoice">
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Invoice
        </Button>
      </div>
    </div>
  );
}
