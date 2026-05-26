"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Shield, Bot, Clock, CheckCircle2, XCircle, AlertTriangle, ShoppingCart,
  Copy, ExternalLink, Wallet, FileText,
} from "lucide-react";
import { CardVisual } from "@/components/wallet/card-visual";
import { CardColorPicker } from "@/components/wallet/card-color-picker";
import { CardFreezeButton } from "@/components/wallet/card-freeze-button";
import { CardDetailShell } from "@/components/wallet/card-detail-shell";
import { StatusBadge } from "@/components/wallet/status-badge";
import {
  resolveCardColor, formatCentsToUsd, normalizeRail3Card,
  type CardColor, type Rail3CardInfo,
} from "@/components/wallet/types";
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
  const { toast } = useToast();
  const [card, setCard] = useState<Rail3CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [colorSaving, setColorSaving] = useState(false);

  useEffect(() => {
    if (user && cardId) {
      authFetch(`/api/v1/rail3/cards/${cardId}`)
        .then(async (res) => { if (res.ok) setCard(await res.json()); })
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

  async function handleColorChange(color: CardColor) {
    if (!card) return;
    setColorSaving(true);
    try {
      const res = await authFetch(`/api/v1/rail3/cards/${card.card_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_color: color }),
      });
      if (res.ok) setCard((prev) => prev ? { ...prev, card_color: color } : prev);
    } catch {}
    setColorSaving(false);
  }

  async function handleCopyIntentId() {
    if (!card) return;
    await navigator.clipboard.writeText(card.order_intent_id);
    toast({ title: "Copied", description: "Order intent ID copied to clipboard." });
  }

  // Detail GET omits bot_name; the normalizer never reads it, but the type
  // requires it — supply null explicitly rather than casting through unknown.
  const visual = card
    ? normalizeRail3Card({ ...card, bot_name: null } satisfies Rail3CardInfo, "/virtual-cards")
    : null;
  const expiry = card && card.exp_month && card.exp_year
    ? `${String(card.exp_month).padStart(2, "0")}/${String(card.exp_year).slice(-2)}`
    : "••/••";

  return (
    <CardDetailShell
      loading={loading}
      notFound={!card}
      backHref="/virtual-cards"
      backLabel="Back to Virtual Cards"
    >
      {card && visual && (
        <>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-neutral-900" data-testid="text-card-name">{card.card_name}</h1>
            <StatusBadge status={card.status} isFrozen={card.is_frozen} />
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

          <CardColorPicker
            color={card.card_color}
            cardId={card.card_id}
            disabled={colorSaving}
            onChange={handleColorChange}
          />

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
                    ? formatCentsToUsd(card.limit_amount_cents)
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
                      `Restriction: ${m.value}`;
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
                        <p className="text-sm font-bold text-neutral-900">{formatCentsToUsd(t.amount_cents)}</p>
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
            <CardFreezeButton isFrozen={card.is_frozen} loading={freezeLoading} onClick={handleFreeze} />
          )}

          <p className="text-xs text-neutral-400">Created: {new Date(card.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
        </>
      )}
    </CardDetailShell>
  );
}
