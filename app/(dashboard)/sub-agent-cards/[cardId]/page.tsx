"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Shield, Bot, Clock, CheckCircle2, XCircle, AlertTriangle, ShoppingCart } from "lucide-react";
import { CardVisual } from "@/components/wallet/card-visual";
import { CardColorPicker } from "@/components/wallet/card-color-picker";
import { CardFreezeButton } from "@/components/wallet/card-freeze-button";
import { CardDetailShell } from "@/components/wallet/card-detail-shell";
import { resolveCardColor, formatCentsToUsd, type CardColor } from "@/components/wallet/types";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { useToast } from "@/hooks/use-toast";

interface Rail5Transaction {
  checkout_id: string;
  merchant_name: string;
  item_name: string;
  amount_cents: number;
  status: string;
  key_delivered: boolean;
  confirmed_at: string | null;
  created_at: string;
}

interface Rail5CardDetail {
  card_id: string;
  card_name: string;
  card_brand: string;
  card_last4: string;
  status: string;
  is_frozen: boolean;
  bot_id: string | null;
  card_color: string | null;
  spending_limit_cents: number;
  daily_limit_cents: number;
  monthly_limit_cents: number;
  human_approval_above_cents: number;
  created_at: string;
  checkouts: Rail5Transaction[];
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  approved: { icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-50", label: "Approved" },
  completed: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", label: "Completed" },
  pending_approval: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", label: "Pending Approval" },
  denied: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", label: "Denied" },
  expired: { icon: AlertTriangle, color: "text-neutral-500", bg: "bg-neutral-50", label: "Expired" },
  failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", label: "Failed" },
};

export default function Rail5CardDetailPage() {
  const { user } = useAuth();
  const { cardId } = useParams<{ cardId: string }>();
  const { toast } = useToast();
  const [card, setCard] = useState<Rail5CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [colorSaving, setColorSaving] = useState(false);

  useEffect(() => {
    if (user && cardId) {
      authFetch(`/api/v1/rail5/cards/${cardId}`)
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
      const res = await authFetch(`/api/v1/rail5/cards/${card.card_id}`, {
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
      const res = await authFetch(`/api/v1/rail5/cards/${card.card_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_color: color }),
      });
      if (res.ok) setCard((prev) => prev ? { ...prev, card_color: color } : prev);
    } catch {}
    setColorSaving(false);
  }

  return (
    <CardDetailShell
      loading={loading}
      notFound={!card}
      backHref="/sub-agent-cards"
      backLabel="Back to Sub-Agent Cards"
    >
      {card && (
        <>
          <h1 className="text-2xl font-bold text-neutral-900" data-testid="text-card-name">{card.card_name}</h1>

          <CardVisual
            color={resolveCardColor(card.card_color, card.card_id)}
            balance={formatCentsToUsd(card.spending_limit_cents)}
            balanceLabel="Spending Limit"
            last4={card.card_last4}
            holder={card.card_name.toUpperCase()}
            frozen={card.is_frozen}
            expiry="••/••"
            line1={`Daily: ${formatCentsToUsd(card.daily_limit_cents)}`}
            line2={`Monthly: ${formatCentsToUsd(card.monthly_limit_cents)}`}
            status={card.status}
            brand={card.card_brand}
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
                <p className="text-neutral-500">Per-Checkout</p>
                <p className="font-bold text-neutral-900 text-lg" data-testid="text-r5-per-checkout">{formatCentsToUsd(card.spending_limit_cents)}</p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-4">
                <p className="text-neutral-500">Daily Limit</p>
                <p className="font-bold text-neutral-900 text-lg" data-testid="text-r5-daily">{formatCentsToUsd(card.daily_limit_cents)}</p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-4">
                <p className="text-neutral-500">Monthly Limit</p>
                <p className="font-bold text-neutral-900 text-lg" data-testid="text-r5-monthly">{formatCentsToUsd(card.monthly_limit_cents)}</p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-4">
                <p className="text-neutral-500">Approval Above</p>
                <p className="font-bold text-neutral-900 text-lg" data-testid="text-r5-approval">{formatCentsToUsd(card.human_approval_above_cents)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-4">
            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" /> Linked Bot
            </h3>
            {card.bot_id ? (
              <p className="text-sm text-neutral-700 font-mono bg-neutral-50 rounded-xl p-3" data-testid="text-r5-bot-id">{card.bot_id}</p>
            ) : (
              <p className="text-sm text-neutral-400" data-testid="text-r5-no-bot">No bot linked yet.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-4">
            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-purple-600" /> Checkout History
            </h3>
            {card.checkouts && card.checkouts.length > 0 ? (
              <div className="space-y-3">
                {card.checkouts.map((c) => {
                  const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.failed;
                  const Icon = cfg.icon;
                  return (
                    <div key={c.checkout_id} className={`flex items-center gap-4 p-4 rounded-xl ${cfg.bg}`} data-testid={`checkout-row-${c.checkout_id}`}>
                      <Icon className={`w-5 h-5 flex-shrink-0 ${cfg.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{c.item_name}</p>
                        <p className="text-xs text-neutral-500">{c.merchant_name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-neutral-900">{formatCentsToUsd(c.amount_cents)}</p>
                        <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                      </div>
                      <div className="text-right flex-shrink-0 hidden sm:block">
                        <p className="text-xs text-neutral-400">
                          {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingCart className="w-8 h-8 text-neutral-200 mx-auto mb-2" />
                <p className="text-sm text-neutral-400">No checkouts yet.</p>
              </div>
            )}
          </div>

          {(["confirmed", "active"].includes(card.status) || card.is_frozen) && (
            <CardFreezeButton isFrozen={card.is_frozen} loading={freezeLoading} onClick={handleFreeze} />
          )}

          <p className="text-xs text-neutral-400">Created: {new Date(card.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
        </>
      )}
    </CardDetailShell>
  );
}
