"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Wallet, ArrowRight, Shield, Eye, Copy, Snowflake, Play } from "lucide-react";
import { authFetch } from "@/features/platform-management/auth-fetch";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CardVisual } from "@/components/wallet/card-visual";
import { WalletActionBar } from "@/components/wallet/wallet-action-bar";
import { normalizeRail5Card, type NormalizedCard } from "@/components/wallet/types";

interface SpendingLimits {
  bot_id: string;
  approval_mode: string;
  per_transaction_usd: number;
  daily_usd: number;
  monthly_usd: number;
  blocked_categories: string[];
}

function LimitsPopover({ botId, cardId }: { botId: string; cardId: string }) {
  const [limits, setLimits] = useState<SpendingLimits | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  async function loadLimits() {
    if (fetched) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/bots/spending?bot_id=${botId}`);
      if (res.ok) {
        setLimits(await res.json());
      }
    } catch {
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="flex-1 text-xs gap-2 text-neutral-600"
          onClick={loadLimits}
          data-testid={`button-limits-${cardId}`}
        >
          <Shield className="w-4 h-4" /> Limits
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" side="top" align="start">
        {loading ? (
          <div className="flex justify-center py-6" data-testid="loading-limits">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          </div>
        ) : limits ? (
          <div className="p-4 space-y-3" data-testid="limits-details">
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Spending Limits</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-500">Per transaction</span>
                <span className="text-sm font-bold text-neutral-900" data-testid="text-limit-per-tx">${limits.per_transaction_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-500">Daily</span>
                <span className="text-sm font-bold text-neutral-900" data-testid="text-limit-daily">${limits.daily_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-500">Monthly</span>
                <span className="text-sm font-bold text-neutral-900" data-testid="text-limit-monthly">${limits.monthly_usd.toFixed(2)}</span>
              </div>
              <div className="border-t border-neutral-100 pt-2 flex justify-between items-center">
                <span className="text-xs text-neutral-500">Approval</span>
                <span className="text-xs font-semibold text-neutral-700" data-testid="text-approval-mode">
                  {limits.approval_mode === "ask_for_everything" ? "Ask every time" :
                   "Auto under threshold"}
                </span>
              </div>
            </div>
            {limits.blocked_categories.length > 0 && (
              <div className="border-t border-neutral-100 pt-2">
                <p className="text-xs text-neutral-400 mb-1.5">Blocked</p>
                <div className="flex flex-wrap gap-1">
                  {limits.blocked_categories.map((cat) => (
                    <span key={cat} className="bg-red-50 text-red-600 text-[10px] font-medium px-2 py-0.5 rounded-full" data-testid={`badge-blocked-${cat}`}>
                      {cat.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-neutral-400 text-xs p-4" data-testid="text-limits-error">Could not load limits.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function CardsPage() {
  const { toast } = useToast();
  const [cards, setCards] = useState<NormalizedCard[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCards = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/rail5/cards");
      if (res.ok) {
        const data = await res.json();
        setCards((data.cards || []).map((c: any) => normalizeRail5Card(c, "/sub-agent-cards")));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  async function handleFreeze(card: NormalizedCard) {
    const isFrozen = card.status === "frozen";
    const newStatus = isFrozen ? "active" : "frozen";
    setCards((prev) => prev.map((c) => (c.card_id === card.card_id ? { ...c, status: newStatus } : c)));

    try {
      const res = await authFetch(`/api/v1/rail5/cards/${card.card_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        setCards((prev) => prev.map((c) => (c.card_id === card.card_id ? { ...c, status: isFrozen ? "frozen" : "active" } : c)));
        toast({ title: "Failed to update", description: "Please try again.", variant: "destructive" });
      } else {
        toast({
          title: isFrozen ? "Card unfrozen" : "Card frozen",
          description: isFrozen ? "Spending is resumed." : "All spending is paused.",
        });
      }
    } catch {
      setCards((prev) => prev.map((c) => (c.card_id === card.card_id ? { ...c, status: isFrozen ? "frozen" : "active" } : c)));
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" });
    }
  }

  function handleCopyBotId(botId: string) {
    navigator.clipboard.writeText(botId);
    toast({ title: "Copied", description: "Bot ID copied to clipboard." });
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <p className="text-neutral-500">Manage your virtual and physical cards.</p>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-primary hover:bg-primary/90 gap-2" data-testid="button-create-card">
              <Plus className="w-4 h-4" />
              Create New Card
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue New Card</DialogTitle>
              <DialogDescription>
                Create a new virtual card for an agent or specific purpose.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Card Name</Label>
                <Input id="name" placeholder="e.g. AWS Billing" className="col-span-3" data-testid="input-card-name" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="limit" className="text-right">Limit ($)</Label>
                <Input id="limit" placeholder="1000" className="col-span-3" data-testid="input-card-limit" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" data-testid="button-submit-card">Create Card</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24" data-testid="loading-cards">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-24" data-testid="text-no-cards">
          <p className="text-lg text-neutral-400 font-medium">No cards yet.</p>
          <p className="text-sm text-neutral-400 mt-2">Add a card and pair it with a bot to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.map((card) => (
            <div className="flex flex-col gap-4" key={card.card_id} data-testid={`card-wallet-${card.card_id}`}>
              <CardVisual
                color={card.card_color}
                balance={card.balance}
                balanceLabel={card.balanceLabel}
                last4={card.last4}
                holder={(card.bot_name || card.card_name).toUpperCase()}
                frozen={card.status === "frozen"}
                line1={card.line1 ?? undefined}
                line2={card.line2 ?? undefined}
                brand={card.brand ?? undefined}
              />
              <WalletActionBar
                actions={[
                  {
                    icon: Shield,
                    label: "Limits",
                    onClick: () => {},
                    "data-testid": `button-limits-${card.card_id}`,
                  },
                  {
                    icon: card.status === "frozen" ? Play : Snowflake,
                    label: card.status === "frozen" ? "Unfreeze" : "Freeze",
                    onClick: () => handleFreeze(card),
                    className: `flex-1 text-xs gap-2 ${card.status === "frozen" ? "text-blue-600" : "text-neutral-600"} cursor-pointer hover:bg-neutral-100 rounded-lg transition-colors`,
                    "data-testid": `button-freeze-${card.card_id}`,
                  },
                ]}
                menuItems={[
                  {
                    icon: Eye,
                    label: "View Orders",
                    onClick: () => window.location.href = "/transactions?tab=orders",
                    "data-testid": `menu-transactions-${card.card_id}`,
                  },
                  {
                    icon: Copy,
                    label: "Copy Bot ID",
                    onClick: () => handleCopyBotId(card.bot_id || ""),
                    "data-testid": `menu-copy-botid-${card.card_id}`,
                  },
                ]}
                menuTestId={`button-more-${card.card_id}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
