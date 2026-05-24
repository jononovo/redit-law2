"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, CreditCard, Shield, Bot, Snowflake, Play,
  Clock, CheckCircle2, XCircle, AlertTriangle, ShoppingCart,
  Copy, ExternalLink, Wallet, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardVisual } from "@/components/wallet/card-visual";
import { CARD_COLORS, resolveCardColor, normalizeRail3Card, type Rail3CardInfo } from "@/components/wallet/types";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { useToast } from "@/hooks/use-toast";

interface Rail3Transaction {
  transaction_id: string;
  merchant_name: string;
  merchant_url: string;
  amount_cents: number;
  status: string;
  credential_issued_at: string;
  settled_at: string | null;
}

interface Rail3Mandate {
  type: "maxAmount" | "description" | "prompt";
  value: string;
  details?: { currency: string; period: string };
}

interface Rail3CardDetail {
  card_id: string;
  card_name: string;
  card_color: string | null;
  category: string | null;
  status: string;
  is_frozen: boolean;
  bot_id: string | null;
  payment_method_id: string;
  card_brand: string | null;
  card_last4: string | null;
  issuer_name: string | null;
  cardholder_name: string | null;
  exp_month: number | null;
  exp_year: number | null;
  intent_mode: "limited" | "open";
  order_intent_id: string;
  mandates: Rail3Mandate[];
  limit_amount_cents: number | null;
  limit_period: "weekly" | "monthly" | "yearly" | null;
  created_at: string;
  transactions: Rail3Transaction[];
}

const TRANSACTION_STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", label: "Pending" },
  settled: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", label: "Settled" },
  failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", label: "Failed" },
  refunded: { icon: AlertTriangle, color: "text-neutral-500", bg: "bg-neutral-50", label: "Refunded" },
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Rail3CardDetailPage() {
  const { user } = useAuth();
  const { cardId } = useParams<{ cardId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [card, setCard] = useState<Rail3CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [colorSaving, setColorSaving] = useState(false);

  useEffect(() => {
    if (user && cardId) {
      authFetch(`/api/v1/rail3/cards/${cardId}`)
        .then(async (res) => {
          if (res.ok) {
            setCard(await res.json());
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, cardId]);

  async function handleFreeze() {
    if (!card) return;
    const nextIsFrozen = !card.is_frozen;
    setFreezeLoading(true);
    try {
      const res = await authFetch(`/api/v1/rail3/cards/${card.card_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_frozen: nextIsFrozen }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCard((prev) => prev ? { ...prev, ...updated } : prev);
        toast({ title: nextIsFrozen ? "Card frozen" : "Card unfrozen" });
      } else {
        toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setFreezeLoading(false);
    }
  }

  function formatLimit(cents: number) {
    return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  async function handleCopyIntentId() {
    if (!card) return;
    await navigator.clipboard.writeText(card.order_intent_id);
    toast({ title: "Copied", description: "Order intent ID copied to clipboard." });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center py-24">
        <CreditCard className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
        <p className="text-lg text-neutral-400 font-medium">Card not found.</p>
        <Button variant="outline" onClick={() => router.push("/virtual-cards")} className="mt-4">
          Back to Virtual Cards
        </Button>
      </div>
    );
  }

  // Reuse the normalizer to feed CardVisual the same props the list page does
  // (intent-tail PAN, "Funded by:" caption, issuer in bottom-right, etc.).
  // Detail GET omits bot_name; the normalizer never reads it, but the type
  // requires it — supply null explicitly rather than casting through unknown.
  const visual = normalizeRail3Card({ ...card, bot_name: null } satisfies Rail3CardInfo, "/virtual-cards");
  const expiry = card.exp_month && card.exp_year
    ? `${String(card.exp_month).padStart(2, "0")}/${String(card.exp_year).slice(-2)}`
    : "••/••";

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up max-w-2xl">
      <Button
        variant="ghost"
        onClick={() => router.push("/virtual-cards")}
        className="self-start gap-2 text-neutral-500"
        data-testid="button-r3-back"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Virtual Cards
      </Button>

      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-neutral-900" data-testid="text-r3-card-name">{card.card_name}</h1>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          card.is_frozen ? "bg-blue-100 text-blue-700" :
          card.status === "active" ? "bg-green-100 text-green-700" :
          card.status === "requires-verification" ? "bg-amber-100 text-amber-700" :
          card.status === "expired" ? "bg-neutral-100 text-neutral-600" :
          card.status === "revoked" ? "bg-red-100 text-red-700" :
          "bg-neutral-100 text-neutral-600"
        }`} data-testid="badge-r3-status">
          {card.is_frozen ? "frozen" : card.status}
        </span>
      </div>

      <CardVisual
        color={resolveCardColor(card.card_color, card.card_id)}
        balance={visual.balance}
        balanceLabel={visual.balanceLabel}
        balanceTooltip={visual.balanceTooltip || undefined}
        last4={visual.last4}
        holder={card.card_name.toUpperCase()}
        frozen={card.is_frozen}
        expiry={expiry}
        line1={visual.line1 || undefined}
        line2={visual.line2 || undefined}
        status={card.status}
        brand={visual.brand || undefined}
        issuer={visual.issuer || undefined}
        numberCaption={visual.numberCaption || undefined}
      />

      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-500 font-medium">Card Color</span>
        <div className="flex items-center gap-2">
          {CARD_COLORS.map((c) => {
            const active = resolveCardColor(card.card_color, card.card_id) === c;
            const bg = c === "purple" ? "bg-purple-600" : c === "dark" ? "bg-neutral-800" : c === "blue" ? "bg-blue-600" : "bg-emerald-600";
            return (
              <button
                key={c}
                disabled={colorSaving}
                onClick={async () => {
                  setColorSaving(true);
                  try {
                    const res = await authFetch(`/api/v1/rail3/cards/${card.card_id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ card_color: c }),
                    });
                    if (res.ok) {
                      setCard((prev) => prev ? { ...prev, card_color: c } : prev);
                    }
                  } catch {}
                  setColorSaving(false);
                }}
                className={`w-7 h-7 rounded-full transition-all ${bg} ${active ? "ring-2 ring-offset-2 ring-neutral-400 scale-110" : "opacity-60 hover:opacity-100"}`}
                data-testid={`color-picker-${c}`}
              />
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-4">
        <h3 className="font-bold text-neutral-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Spending Controls
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-neutral-50 rounded-xl p-4">
            <p className="text-neutral-500">Mode</p>
            <p className="font-bold text-neutral-900 text-lg" data-testid="text-r3-mode">{capitalize(card.intent_mode)}</p>
          </div>
          <div className="bg-neutral-50 rounded-xl p-4">
            <p className="text-neutral-500">{card.limit_period ? `${capitalize(card.limit_period)} Limit` : "Limit"}</p>
            <p className="font-bold text-neutral-900 text-lg" data-testid="text-r3-limit">
              {card.intent_mode === "limited" && card.limit_amount_cents !== null
                ? formatLimit(card.limit_amount_cents)
                : "None"}
            </p>
          </div>
        </div>
      </div>

      {card.card_last4 && (
        <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-4">
          <h3 className="font-bold text-neutral-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-orange-600" /> Funding Source
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-neutral-50 rounded-xl p-4">
              <p className="text-neutral-500">Card</p>
              <p className="font-bold text-neutral-900 text-lg font-mono" data-testid="text-r3-funding-card">
                {(card.card_brand || "card").toUpperCase()} ····{card.card_last4}
              </p>
            </div>
            <div className="bg-neutral-50 rounded-xl p-4">
              <p className="text-neutral-500">Expires</p>
              <p className="font-bold text-neutral-900 text-lg font-mono" data-testid="text-r3-funding-expiry">{expiry}</p>
            </div>
            {card.cardholder_name && (
              <div className="bg-neutral-50 rounded-xl p-4">
                <p className="text-neutral-500">Cardholder</p>
                <p className="font-bold text-neutral-900 text-lg" data-testid="text-r3-funding-cardholder">{card.cardholder_name}</p>
              </div>
            )}
            {card.issuer_name && (
              <div className="bg-neutral-50 rounded-xl p-4">
                <p className="text-neutral-500">Bank</p>
                <p className="font-bold text-neutral-900 text-lg" data-testid="text-r3-funding-bank">{card.issuer_name}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-4">
        <h3 className="font-bold text-neutral-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" /> Order Intent
        </h3>
        <div>
          <p className="text-xs text-neutral-500 mb-1">Order Intent ID</p>
          <div className="flex items-center gap-2 bg-neutral-50 rounded-xl p-3">
            <code className="flex-1 text-xs font-mono text-neutral-700 break-all" data-testid="text-r3-intent-id">
              {card.order_intent_id}
            </code>
            <button
              onClick={handleCopyIntentId}
              className="text-neutral-400 hover:text-neutral-700 transition-colors flex-shrink-0"
              data-testid="button-r3-copy-intent-id"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
        {card.mandates.length > 0 && (
          <div>
            <p className="text-xs text-neutral-500 mb-2">Mandates</p>
            <div className="space-y-2">
              {card.mandates.map((m, idx) => {
                const label =
                  m.type === "maxAmount" ? `Max ${m.value} ${m.details?.currency.toUpperCase() ?? ""} per ${m.details?.period ?? ""}`.trim() :
                  m.type === "description" ? m.value :
                  /* prompt */ `Restriction: ${m.value}`;
                return (
                  <div key={idx} className="text-sm text-neutral-700 bg-neutral-50 rounded-xl p-3" data-testid={`mandate-${idx}`}>
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 mr-2">{m.type}</span>
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {card.bot_id && (
        <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-4">
          <h3 className="font-bold text-neutral-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" /> Linked Bot
          </h3>
          <p className="text-sm text-neutral-700 font-mono bg-neutral-50 rounded-xl p-3" data-testid="text-r3-bot-id">{card.bot_id}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-4">
        <h3 className="font-bold text-neutral-900 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-purple-600" /> Transactions
        </h3>
        {card.transactions && card.transactions.length > 0 ? (
          <div className="space-y-3">
            {card.transactions.map((t) => {
              const cfg = TRANSACTION_STATUS_CONFIG[t.status] || TRANSACTION_STATUS_CONFIG.failed;
              const Icon = cfg.icon;
              return (
                <div key={t.transaction_id} className={`flex items-center gap-4 p-4 rounded-xl ${cfg.bg}`} data-testid={`transaction-row-${t.transaction_id}`}>
                  <Icon className={`w-5 h-5 flex-shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate flex items-center gap-1">
                      {t.merchant_name}
                      {t.merchant_url && (
                        <a href={t.merchant_url} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-neutral-700">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Issued {new Date(t.credential_issued_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {t.settled_at && ` · Settled ${new Date(t.settled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-neutral-900">{formatLimit(t.amount_cents)}</p>
                    <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <ShoppingCart className="w-8 h-8 text-neutral-200 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">No transactions yet.</p>
          </div>
        )}
      </div>

      {(card.status === "active" || card.is_frozen) && (
        <Button
          variant="outline"
          onClick={handleFreeze}
          disabled={freezeLoading}
          className={`gap-2 ${card.is_frozen ? "text-emerald-600 border-emerald-200" : "text-blue-600 border-blue-200"}`}
          data-testid="button-r3-toggle-freeze"
        >
          {freezeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : card.is_frozen ? <Play className="w-4 h-4" /> : <Snowflake className="w-4 h-4" />}
          {card.is_frozen ? "Unfreeze Card" : "Freeze Card"}
        </Button>
      )}

      <p className="text-xs text-neutral-400">Created: {new Date(card.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
    </div>
  );
}
