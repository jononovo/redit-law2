"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { useToast } from "@/hooks/use-toast";
import type { ManagedRuntime } from "@/lib/managed-agents";

interface VirtualCard {
  card_id: string;
  card_name: string;
  card_brand: string | null;
  card_last4: string | null;
  status: string;
  is_frozen: boolean;
}

interface ManagedAgentSettingsProps {
  runtime: ManagedRuntime;
  defaultCardId: string | null;
  buyerProfileId: string | null;
  onDefaultCardChanged: (cardId: string | null) => void;
}

const NONE = "__none__"; // shadcn Select can't carry a null value

// Per-agent settings: the preferred (default) card the checkout form
// preselects, and the first UI surface for the Crossmint buyer profile.
export function ManagedAgentSettings({ runtime, defaultCardId, buyerProfileId, onDefaultCardChanged }: ManagedAgentSettingsProps) {
  const { toast } = useToast();
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/v1/rail3/cards");
        if (res.ok) {
          const data = (await res.json()) as { cards?: VirtualCard[] };
          if (!cancelled) setCards((data.cards || []).filter((c) => c.status === "active" && !c.is_frozen));
        }
      } catch {} finally {
        if (!cancelled) setCardsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectDefault = async (value: string) => {
    const cardId = value === NONE ? null : value;
    setSaving(true);
    try {
      const res = await authFetch(`/api/v1/managed-agents/${runtime}/default-card`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId }),
      });
      const body = (await res.json().catch(() => ({}))) as { default_card_id?: string | null; error?: string; message?: string };
      if (res.ok) {
        onDefaultCardChanged(body.default_card_id ?? null);
        toast({
          title: cardId ? "Default card set" : "Default card cleared",
          description: cardId ? "New checkouts will preselect this card." : "New checkouts will preselect your first active card.",
        });
      } else {
        toast({ title: "Couldn't update default card", description: body.message || body.error || "Try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Couldn't update default card — try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // A stored default that's no longer active reads as "no default set".
  const effectiveDefault = defaultCardId && cards.some((c) => c.card_id === defaultCardId) ? defaultCardId : NONE;

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 flex flex-col gap-6" data-testid="managed-agent-settings">
      <h3 className="text-sm font-bold text-neutral-900">Settings</h3>

      <div className="flex flex-col gap-2">
        <Label className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-neutral-400" />
          Default card
        </Label>
        {cardsLoading ? (
          <p className="text-sm text-neutral-400" data-testid="loading-settings-cards">Loading cards…</p>
        ) : cards.length === 0 ? (
          <p className="text-sm text-neutral-500" data-testid="text-settings-no-cards">
            No active virtual cards.{" "}
            <Link href="/virtual-cards" className="font-semibold underline">Create one</Link> to set a default.
          </p>
        ) : (
          <Select value={effectiveDefault} onValueChange={selectDefault} disabled={saving}>
            <SelectTrigger className="max-w-sm" data-testid="select-default-card">
              <SelectValue placeholder="No default set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE} data-testid="option-default-none">No default</SelectItem>
              {cards.map((c) => (
                <SelectItem key={c.card_id} value={c.card_id} data-testid={`option-default-${c.card_id}`}>
                  {c.card_name} · {c.card_brand || "card"} ····{c.card_last4 || "????"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-neutral-400">
          Preselected on new checkouts. Picking a different card for one run never changes this.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-neutral-400" />
          Buyer profile
        </Label>
        {buyerProfileId ? (
          <div data-testid="text-buyer-profile-present">
            <p className="text-sm text-neutral-600">Created from your shipping address.</p>
            <p className="text-xs font-mono text-neutral-400 mt-1">{buyerProfileId}</p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500" data-testid="text-buyer-profile-absent">
            Created automatically from your{" "}
            <Link href="/settings" className="font-semibold underline">default shipping address</Link>{" "}
            on the first checkout.
          </p>
        )}
      </div>
    </div>
  );
}
