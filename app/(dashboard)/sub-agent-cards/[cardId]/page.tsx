"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CreditCard, Shield, Bot, Snowflake, Play, Clock, CheckCircle2, XCircle, AlertTriangle, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardVisual } from "@/components/wallet/card-visual";
import { useAuth } from "@/lib/auth/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";

interface Rail5Checkout {
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
  bot_id: string | null;
  spending_limit_cents: number;
  daily_limit_cents: number;
  monthly_limit_cents: number;
  human_approval_above_cents: number;
  created_at: string;
  checkouts: Rail5Checkout[];
}

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
};

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
  const router = useRouter();
  const { toast } = useToast();
  const [card, setCard] = useState<Rail5CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [freezeLoading, setFreezeLoading] = useState(false);

  useEffect(() => {
    if (user && cardId) {
      authFetch(`/api/v1/rail5/cards/${cardId}`)
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
    const newStatus = card.status === "frozen" ? "active" : "frozen";
    setFreezeLoading(true);
    try {
      const res = await authFetch(`/api/v1/rail5/cards/${card.card_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCard((prev) => prev ? { ...prev, ...updated } : prev);
        toast({ title: newStatus === "frozen" ? "Card frozen" : "Card unfrozen" });
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
        <Button variant="outline" onClick={() => router.push("/sub-agent-cards")} className="mt-4">
          Back to Cards
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up max-w-2xl">
      <Button
        variant="ghost"
        onClick={() => router.push("/sub-agent-cards")}
        className="self-start gap-2 text-neutral-500"
        data-testid="button-r5-back"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Sub-Agent Cards
      </Button>

      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-neutral-900" data-testid="text-r5-card-name">{card.card_name}</h1>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          card.status === "active" ? "bg-green-100 text-green-700" :
          card.status === "frozen" ? "bg-blue-100 text-blue-700" :
          card.status === "confirmed" ? "bg-teal-100 text-teal-700" :
          card.status === "pending_delivery" ? "bg-amber-100 text-amber-700" :
          "bg-amber-100 text-amber-700"
        }`} data-testid="badge-r5-status">
          {card.status}
        </span>
      </div>

      <CardVisual
        color="purple"
        balance={formatLimit(card.spending_limit_cents)}
        balanceLabel="Spending Limit"
        last4={card.card_last4}
        holder={card.card_name.toUpperCase()}
        frozen={card.status === "frozen"}
        expiry="••/••"
        line1={`Daily: ${formatLimit(card.daily_limit_cents)}`}
        line2={`Monthly: ${formatLimit(card.monthly_limit_cents)}`}
        status={card.status}
        brand={card.card_brand}
      />

      <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-4">
        <h3 className="font-bold text-neutral-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Spending Controls
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-neutral-50 rounded-xl p-4">
            <p className="text-neutral-500">Per-Checkout</p>
            <p className="font-bold text-neutral-900 text-lg" data-testid="text-r5-per-checkout">{formatLimit(card.spending_limit_cents)}</p>
          </div>
          <div className="bg-neutral-50 rounded-xl p-4">
            <p className="text-neutral-500">Daily Limit</p>
            <p className="font-bold text-neutral-900 text-lg" data-testid="text-r5-daily">{formatLimit(card.daily_limit_cents)}</p>
          </div>
          <div className="bg-neutral-50 rounded-xl p-4">
            <p className="text-neutral-500">Monthly Limit</p>
            <p className="font-bold text-neutral-900 text-lg" data-testid="text-r5-monthly">{formatLimit(card.monthly_limit_cents)}</p>
          </div>
          <div className="bg-neutral-50 rounded-xl p-4">
            <p className="text-neutral-500">Approval Above</p>
            <p className="font-bold text-neutral-900 text-lg" data-testid="text-r5-approval">{formatLimit(card.human_approval_above_cents)}</p>
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
                    <p className="text-sm font-bold text-neutral-900">{formatLimit(c.amount_cents)}</p>
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

      {["confirmed", "active", "frozen"].includes(card.status) && (
        <Button
          variant="outline"
          onClick={handleFreeze}
          disabled={freezeLoading}
          className={`gap-2 ${card.status === "frozen" ? "text-emerald-600 border-emerald-200" : "text-blue-600 border-blue-200"}`}
          data-testid="button-r5-toggle-freeze"
        >
          {freezeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : card.status === "frozen" ? <Play className="w-4 h-4" /> : <Snowflake className="w-4 h-4" />}
          {card.status === "frozen" ? "Unfreeze Card" : "Freeze Card"}
        </Button>
      )}

      <p className="text-xs text-neutral-400">Created: {new Date(card.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
    </div>
  );
}
