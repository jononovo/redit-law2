"use client";

import { useEffect, useState } from "react";
import { Link2, Loader2, ExternalLink, CheckCircle, Clock, XCircle } from "lucide-react";

interface PaymentLinkData {
  id: number;
  payment_link_id: string;
  bot_id: string;
  bot_name: string;
  amount_usd: number;
  description: string;
  payer_email: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  paid_at: string | null;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700" data-testid="badge-status-completed">
        <CheckCircle className="w-3 h-3" />
        Paid
      </span>
    );
  }
  if (status === "expired") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500" data-testid="badge-status-expired">
        <XCircle className="w-3 h-3" />
        Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700" data-testid="badge-status-pending">
      <Clock className="w-3 h-3" />
      Pending
    </span>
  );
}

export function PaymentLinksPanel() {
  const [links, setLinks] = useState<PaymentLinkData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/payment-links")
      .then((res) => res.ok ? res.json() : { payment_links: [] })
      .then((data) => setLinks(data.payment_links || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
        <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Payments Received
        </h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
        </div>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
        <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Payments Received
        </h3>
        <p className="text-sm text-neutral-500 text-center py-6" data-testid="text-no-payment-links">
          No payment links created yet. Bots can create payment links via the API.
        </p>
      </div>
    );
  }

  const completed = links.filter(l => l.status === "completed");
  const totalReceived = completed.reduce((sum, l) => sum + l.amount_usd, 0);

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6" data-testid="panel-payment-links">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Payments Received
        </h3>
        {totalReceived > 0 && (
          <span className="text-sm font-semibold text-green-600" data-testid="text-total-received">
            ${totalReceived.toFixed(2)} earned
          </span>
        )}
      </div>
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {links.slice(0, 20).map((link) => (
          <div
            key={link.payment_link_id}
            className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100"
            data-testid={`payment-link-${link.payment_link_id}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-neutral-900 truncate">
                  ${link.amount_usd.toFixed(2)}
                </span>
                <StatusBadge status={link.status} />
              </div>
              <p className="text-xs text-neutral-500 truncate">{link.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-neutral-400">{link.bot_name}</span>
                {link.payer_email && (
                  <>
                    <span className="text-xs text-neutral-300">·</span>
                    <span className="text-xs text-neutral-400">{link.payer_email}</span>
                  </>
                )}
                <span className="text-xs text-neutral-300">·</span>
                <span className="text-xs text-neutral-400">
                  {link.paid_at
                    ? new Date(link.paid_at).toLocaleDateString()
                    : new Date(link.created_at).toLocaleDateString()
                  }
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
