"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CreditCard, MapPin, Phone, Shield, ShieldCheck, AlertCircle, Loader2,
  Wallet, Hash, ExternalLink, Copy,
} from "lucide-react";
import { CardVisual } from "@/components/wallet/card-visual";
import { CardDetailShell } from "@/components/wallet/card-detail-shell";
import { RAIL3_FUNDING_TYPE_LABEL, resolveCardColor, type Rail3BillingAddress } from "@/components/wallet/types";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { useToast } from "@/hooks/use-toast";

interface LinkedVirtualCard {
  card_id: string;
  card_name: string;
  status: string;
  is_frozen: boolean;
  intent_mode: "limited" | "open";
  limit_amount_cents: number | null;
  limit_period: "weekly" | "monthly" | "yearly" | null;
  bot_id: string | null;
  created_at: string;
}

interface Rail3PaymentMethodDetail {
  payment_method_id: string;
  card_brand: string | null;
  card_last4: string | null;
  card_first6: string | null;
  issuer_name: string | null;
  cardholder_name: string | null;
  exp_month: number | null;
  exp_year: number | null;
  funding_type: "credit" | "debit" | "prepaid" | "unknown" | null;
  is_default: boolean;
  display_image_url: string | null;
  billing_address: Rail3BillingAddress | null;
  billing_phone: string | null;
  source_token_id: string | null;
  network_token_id: string | null;
  created_at: string;
  last_used_at: string | null;
  enrollment: { status?: string } | null;
  enrollment_error: string | null;
  virtual_cards: LinkedVirtualCard[];
}

export default function Rail3RealCardDetailPage() {
  const { user } = useAuth();
  const { paymentMethodId } = useParams<{ paymentMethodId: string }>();
  const { toast } = useToast();
  const [pm, setPm] = useState<Rail3PaymentMethodDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !paymentMethodId) {
      setLoading(false);
      return;
    }
    authFetch(`/api/v1/rail3/payment-methods/${paymentMethodId}`)
      .then(async (res) => { if (res.ok) setPm(await res.json()); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, paymentMethodId]);

  async function copyToClipboard(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  }

  const expiry = pm && pm.exp_month && pm.exp_year
    ? `${String(pm.exp_month).padStart(2, "0")}/${String(pm.exp_year).slice(-2)}`
    : "••/••";

  const enrollmentStatus = pm?.enrollment?.status;

  return (
    <CardDetailShell
      loading={loading}
      notFound={!pm}
      backHref="/virtual-cards"
      backLabel="Back to Virtual Cards"
      notFoundLabel="Real card not found."
    >
      {pm && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900" data-testid="text-pm-name">
                {pm.issuer_name || "Real Card"}
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                {(pm.card_brand || "card").toUpperCase()} ····{pm.card_last4 || "????"}
                {pm.is_default && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-semibold align-middle">Default</span>
                )}
              </p>
            </div>
          </div>

          <CardVisual
            color={resolveCardColor(null, pm.payment_method_id)}
            last4={pm.card_last4 || "••••"}
            expiry={expiry}
            holder={(pm.cardholder_name || "CARDHOLDER").toUpperCase()}
            holderLabel="Cardholder"
            balance={String(pm.virtual_cards.length)}
            balanceLabel="Virtual Cards"
            brand={pm.card_brand || undefined}
            issuer={pm.issuer_name || undefined}
          />

          {/* Enrollment status */}
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-3">
            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Agentic Enrollment
            </h3>
            <EnrollmentRow status={enrollmentStatus} error={pm.enrollment_error} />
            <p className="text-xs text-neutral-500">
              Crossmint requires a passkey on this card before it can mint one-time virtual numbers. Enrollment is started from a virtual-card creation flow.
            </p>
          </div>

          {/* Card facts */}
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-4">
            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-600" /> Card Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Fact label="Brand" value={(pm.card_brand || "—").toUpperCase()} testid="text-pm-brand" />
              <Fact label="Funding" value={pm.funding_type ? RAIL3_FUNDING_TYPE_LABEL[pm.funding_type] || pm.funding_type : "—"} testid="text-pm-funding" />
              <Fact label="Last 4" value={pm.card_last4 || "—"} mono testid="text-pm-last4" />
              <Fact label="BIN" value={pm.card_first6 || "—"} mono testid="text-pm-bin" />
              <Fact label="Expires" value={expiry} mono testid="text-pm-expiry" />
              <Fact label="Cardholder" value={pm.cardholder_name || "—"} testid="text-pm-cardholder" />
              {pm.issuer_name && <Fact label="Bank" value={pm.issuer_name} testid="text-pm-issuer" />}
            </div>
          </div>

          {/* Billing */}
          {(pm.billing_address || pm.billing_phone) && (
            <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-4">
              <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" /> Billing
              </h3>
              {pm.billing_address && (
                <div className="text-sm text-neutral-700 bg-neutral-50 rounded-xl p-4 leading-relaxed" data-testid="text-pm-billing-address">
                  {pm.billing_address.line1}<br />
                  {pm.billing_address.line2 && <>{pm.billing_address.line2}<br /></>}
                  {[pm.billing_address.city, pm.billing_address.stateOrRegion, pm.billing_address.postalCode].filter(Boolean).join(", ")}<br />
                  {pm.billing_address.country}
                </div>
              )}
              {pm.billing_phone && (
                <div className="flex items-center gap-2 text-sm text-neutral-700">
                  <Phone className="w-4 h-4 text-neutral-400" />
                  <span data-testid="text-pm-billing-phone">{pm.billing_phone}</span>
                </div>
              )}
            </div>
          )}

          {/* Linked virtual cards */}
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-4">
            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-600" /> Linked Virtual Cards ({pm.virtual_cards.length})
            </h3>
            {pm.virtual_cards.length === 0 ? (
              <p className="text-sm text-neutral-400">No virtual cards on this real card yet.</p>
            ) : (
              <div className="space-y-2">
                {pm.virtual_cards.map((vc) => (
                  <Link
                    key={vc.card_id}
                    href={`/virtual-cards/${vc.card_id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors"
                    data-testid={`link-virtual-card-${vc.card_id}`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900 truncate">{vc.card_name}</p>
                      <p className="text-xs text-neutral-500">
                        {vc.intent_mode === "limited" && vc.limit_amount_cents !== null
                          ? `$${(vc.limit_amount_cents / 100).toFixed(2)} / ${vc.limit_period}`
                          : "Open spending"}
                        {" · "}{vc.status}
                        {vc.is_frozen && " · frozen"}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Token IDs */}
          {(pm.source_token_id || pm.network_token_id) && (
            <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-4">
              <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                <Hash className="w-5 h-5 text-neutral-600" /> Source Tokens
              </h3>
              {pm.source_token_id && (
                <TokenRow label="Source Token ID" value={pm.source_token_id} onCopy={() => copyToClipboard(pm.source_token_id!, "Source token ID")} testid="text-pm-source-token" />
              )}
              {pm.network_token_id && (
                <TokenRow label="Network Token ID" value={pm.network_token_id} onCopy={() => copyToClipboard(pm.network_token_id!, "Network token ID")} testid="text-pm-network-token" />
              )}
              <TokenRow label="Payment Method ID" value={pm.payment_method_id} onCopy={() => copyToClipboard(pm.payment_method_id, "Payment method ID")} testid="text-pm-id" />
            </div>
          )}

          <p className="text-xs text-neutral-400">
            Saved: {new Date(pm.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            {pm.last_used_at && ` · Last used: ${new Date(pm.last_used_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
          </p>
        </>
      )}
    </CardDetailShell>
  );
}

function Fact({ label, value, mono, testid }: { label: string; value: string; mono?: boolean; testid?: string }) {
  return (
    <div className="bg-neutral-50 rounded-xl p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`font-bold text-neutral-900 ${mono ? "font-mono" : ""}`} data-testid={testid}>{value}</p>
    </div>
  );
}

function TokenRow({ label, value, onCopy, testid }: { label: string; value: string; onCopy: () => void; testid: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <div className="flex items-center gap-2 bg-neutral-50 rounded-xl p-3">
        <code className="flex-1 text-xs font-mono text-neutral-700 break-all" data-testid={testid}>{value}</code>
        <button
          type="button"
          onClick={onCopy}
          className="text-neutral-400 hover:text-neutral-700 flex-shrink-0"
          data-testid={`button-copy-${testid}`}
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function EnrollmentRow({ status, error }: { status?: string; error: string | null }) {
  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3" data-testid="text-enrollment-error">
        <AlertCircle className="w-4 h-4" /> Failed to read enrollment: {error}
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl p-3" data-testid="text-enrollment-active">
        <ShieldCheck className="w-4 h-4" /> Passkey enrolled — agent payments authorized.
      </div>
    );
  }
  if (!status || status === "pending") {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl p-3" data-testid="text-enrollment-pending">
        <Loader2 className="w-4 h-4" /> Awaiting passkey. Start enrollment from any virtual-card creation flow.
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-xl p-3" data-testid="text-enrollment-failed">
        <AlertCircle className="w-4 h-4" /> Enrollment failed — try again.
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-700 bg-neutral-50 rounded-xl p-3" data-testid="text-enrollment-other">
      <Shield className="w-4 h-4" /> {status}
    </div>
  );
}
