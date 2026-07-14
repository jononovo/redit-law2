"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { useToast } from "@/hooks/use-toast";
import type { AgentCheckoutData } from "@/components/managed-agent/checkout-observer";

interface VirtualCard {
  card_id: string;
  card_name: string;
  card_brand: string | null;
  card_last4: string | null;
  status: string;
  is_frozen: boolean;
}

interface CheckoutFormProps {
  onStarted: (checkout: AgentCheckoutData) => void;
  defaultCardId: string | null;
  onDefaultCardChanged: (cardId: string | null) => void;
}

interface ApiError {
  error?: string;
  message?: string;
  details?: Record<string, string[]>;
}

// bearer_required means the Firebase client hasn't hydrated yet — retry silently.
const MAX_BEARER_RETRIES = 10;
const BEARER_RETRY_DELAY_MS = 1500;

const CARD_ERROR_FALLBACKS: Record<string, string> = {
  card_not_found: "That card no longer exists — pick another.",
  card_frozen: "That card is frozen — unfreeze it or pick another.",
  card_not_active: "That card isn't active — pick another.",
  card_expired: "That card has expired — create a new virtual card.",
  master_guardrail: "Blocked by your master guardrails.",
};

export function CheckoutForm({ onStarted, defaultCardId, onDefaultCardChanged }: CheckoutFormProps) {
  const { toast } = useToast();
  const [productUrl, setProductUrl] = useState("");
  const [request, setRequest] = useState("");
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardId, setCardId] = useState("");
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [merchantContext, setMerchantContext] = useState("");
  const [maxCost, setMaxCost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [shippingNotice, setShippingNotice] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/v1/rail3/cards");
        if (res.ok) {
          const data = (await res.json()) as { cards?: VirtualCard[] };
          const active = (data.cards || []).filter((c) => c.status === "active" && !c.is_frozen);
          if (!cancelled) {
            setCards(active);
            // Preselect the preferred card if it's still active, else the first.
            const preferred = defaultCardId && active.some((c) => c.card_id === defaultCardId)
              ? defaultCardId
              : active[0]?.card_id;
            if (preferred) setCardId((prev) => prev || preferred);
          }
        }
      } catch {} finally {
        if (!cancelled) setCardsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [defaultCardId]);

  const setAsDefault = async () => {
    if (!cardId || savingDefault) return;
    setSavingDefault(true);
    try {
      const res = await authFetch("/api/v1/managed-agents/default-card", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId }),
      });
      if (res.ok) {
        onDefaultCardChanged(cardId);
        toast({ title: "Default card set", description: "New checkouts will use this card unless you pick another." });
      } else {
        const b = (await res.json().catch(() => ({}))) as ApiError;
        toast({ title: "Couldn't set default", description: b.message || b.error || "Try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Couldn't set default — try again.", variant: "destructive" });
    } finally {
      setSavingDefault(false);
    }
  };

  const showError = (body: ApiError) => {
    const code = body.error || "internal_error";
    if (code === "shipping_address_required") {
      setShippingNotice(true);
      return;
    }
    let description: string;
    if (code in CARD_ERROR_FALLBACKS) {
      description = body.message || CARD_ERROR_FALLBACKS[code];
    } else if (code === "validation_error") {
      description = body.details ? Object.values(body.details).flat()[0] : "Check the form fields.";
    } else if (code === "bearer_required") {
      description = "Sign-in is still completing — try again in a moment.";
    } else {
      description = body.message || "Something went wrong — try again.";
    }
    toast({ title: "Checkout not started", description, variant: "destructive" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardId || submitting) return;

    let maxCostCents: number | undefined;
    if (maxCost.trim()) {
      const dollars = Number(maxCost);
      if (!Number.isFinite(dollars) || dollars <= 0) {
        toast({
          title: "Invalid max cost",
          description: "Enter a dollar amount greater than zero.",
          variant: "destructive",
        });
        return;
      }
      maxCostCents = Math.round(dollars * 100);
    }

    const payload: Record<string, unknown> = {
      card_id: cardId,
      product_url: productUrl.trim(),
      request: request.trim(),
    };
    if (merchantContext.trim()) payload.merchant_context = merchantContext.trim();
    if (maxCostCents !== undefined) payload.max_cost_cents = maxCostCents;

    setSubmitting(true);
    setShippingNotice(false);
    try {
      for (let attempt = 0; attempt <= MAX_BEARER_RETRIES; attempt++) {
        const res = await authFetch("/api/v1/managed-agents/checkouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await res.json()) as AgentCheckoutData & ApiError;
        if (res.ok) {
          onStarted(body);
          return;
        }
        if (body.error === "bearer_required" && attempt < MAX_BEARER_RETRIES) {
          await new Promise((r) => setTimeout(r, BEARER_RETRY_DELAY_MS));
          continue;
        }
        showError(body);
        return;
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server — try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const noActiveCards = !cardsLoading && cards.length === 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 flex flex-col gap-5"
      data-testid="checkout-form"
    >
      <h2 className="text-lg font-bold text-neutral-900">New checkout</h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor="checkout-product-url">Product URL</Label>
        <Input
          id="checkout-product-url"
          type="url"
          required
          placeholder="https://store.example.com/products/…"
          value={productUrl}
          onChange={(e) => setProductUrl(e.target.value)}
          data-testid="input-product-url"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="checkout-request">Buyer request</Label>
        <Textarea
          id="checkout-request"
          required
          rows={3}
          placeholder={"pay by card\ncheapest delivery\nbilling same as shipping"}
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          data-testid="input-buyer-request"
        />
        <p className="text-xs text-neutral-400">
          One instruction per line — the more you spell out, the fewer questions the agent asks.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Pay with</Label>
        {cardsLoading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-400" data-testid="loading-checkout-cards">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading cards…
          </div>
        ) : noActiveCards ? (
          <div
            className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600"
            data-testid="text-no-active-cards"
          >
            <CreditCard className="w-5 h-5 text-neutral-400 mb-2" />
            No active virtual cards. The agent pays with one of your virtual cards —{" "}
            <Link href="/virtual-cards" className="font-semibold underline" data-testid="link-create-virtual-card">
              create one first
            </Link>
            .
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Select value={cardId} onValueChange={setCardId}>
              <SelectTrigger data-testid="select-checkout-card">
                <SelectValue placeholder="Pick a card" />
              </SelectTrigger>
              <SelectContent>
                {cards.map((c) => (
                  <SelectItem key={c.card_id} value={c.card_id} data-testid={`option-card-${c.card_id}`}>
                    {c.card_name} · {c.card_brand || "card"} ····{c.card_last4 || "????"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cardId && cardId !== defaultCardId && (
              <button
                type="button"
                onClick={setAsDefault}
                disabled={savingDefault}
                className="self-start text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
                data-testid="button-set-default-card"
              >
                {savingDefault ? "Saving…" : "Set as default card"}
              </button>
            )}
            {cardId && cardId === defaultCardId && (
              <span className="self-start text-xs text-neutral-400" data-testid="text-is-default-card">
                Default card
              </span>
            )}
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setMerchantOpen((o) => !o)}
          data-testid="button-toggle-merchant-context"
          className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <span>Merchant context — optional</span>
          {merchantOpen ? (
            <ChevronUp className="w-4 h-4 relative top-[1px]" />
          ) : (
            <ChevronDown className="w-4 h-4 relative top-[1px]" />
          )}
        </button>
        {merchantOpen && (
          <div className="mt-2 flex flex-col gap-2">
            <Textarea
              rows={3}
              value={merchantContext}
              onChange={(e) => setMerchantContext(e.target.value)}
              data-testid="input-merchant-context"
            />
            <p className="text-xs text-neutral-400">
              Only for unusual checkouts — name the buttons and the order of steps.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="checkout-max-cost">Max cost (USD) — optional</Label>
        <Input
          id="checkout-max-cost"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 25.00"
          value={maxCost}
          onChange={(e) => setMaxCost(e.target.value)}
          className="max-w-[180px]"
          data-testid="input-max-cost"
        />
      </div>

      {shippingNotice && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          data-testid="notice-shipping-address-required"
        >
          Add a shipping address first — the agent needs one to check out.{" "}
          <Link href="/settings" className="font-semibold underline" data-testid="link-shipping-settings">
            Go to Settings
          </Link>
        </div>
      )}

      <div>
        <Button
          type="submit"
          disabled={submitting || !cardId}
          className="rounded-full bg-primary hover:bg-primary/90 gap-2"
          data-testid="button-start-checkout"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Starting…" : "Start checkout"}
        </Button>
      </div>
    </form>
  );
}
