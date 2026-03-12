"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Wallet, ArrowRight, Shield, Eye, Copy, Snowflake, Play } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CardVisual } from "@/components/wallet/card-visual";
import { WalletActionBar } from "@/components/wallet/wallet-action-bar";
import { CARD_COLORS, formatCentsToUsd } from "@/components/wallet/types";

interface CardData {
  id: number;
  botId: string;
  botName: string;
  balanceCents: number;
  currency: string;
  isFrozen: boolean;
  createdAt: string;
}

interface SpendingLimits {
  bot_id: string;
  approval_mode: string;
  per_transaction_usd: number;
  daily_usd: number;
  monthly_usd: number;
  blocked_categories: string[];
}

function LimitsPopover({ botId, cardId }: { botId: string; cardId: number }) {
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
                   limits.approval_mode === "auto_approve_under_threshold" ? "Auto under threshold" :
                   "Auto by category"}
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
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/wallets");
      if (res.ok) {
        const data = await res.json();
        setCards(data.cards || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  async function handleFreeze(card: CardData) {
    const newFrozen = !card.isFrozen;
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, isFrozen: newFrozen } : c)));

    try {
      const res = await fetch(`/api/v1/wallets/${card.id}/freeze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frozen: newFrozen }),
      });

      if (!res.ok) {
        setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, isFrozen: !newFrozen } : c)));
        toast({ title: "Failed to update", description: "Please try again.", variant: "destructive" });
      } else {
        toast({
          title: newFrozen ? "Wallet frozen" : "Wallet unfrozen",
          description: newFrozen ? "All spending is paused." : "Spending is resumed.",
        });
      }
    } catch {
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, isFrozen: !newFrozen } : c)));
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" });
    }
  }

  function handleCopyBotId(botId: string) {
    navigator.clipboard.writeText(botId);
    toast({ title: "Copied", description: "Bot ID copied to clipboard." });
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5 flex items-center gap-4" data-testid="banner-wallets-redirect">
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
          <Wallet className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-neutral-900" data-testid="text-wallets-banner-title">Wallet-funded cards are coming soon</p>
          <p className="text-sm text-neutral-500 font-medium" data-testid="text-wallets-banner-desc">This is where wallet-funded cards will live. For now, head to Self-Hosted Cards to get started.</p>
        </div>
        <Link href="/self-hosted">
          <Button className="rounded-full gap-2 shrink-0" data-testid="button-go-self-hosted">
            Self-Hosted Cards
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

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
          <p className="text-lg text-neutral-400 font-medium">No wallets yet.</p>
          <p className="text-sm text-neutral-400 mt-2">Connect a bot and fund its wallet to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.map((card, index) => (
            <div className="flex flex-col gap-4" key={card.id} data-testid={`card-wallet-${card.id}`}>
              <CardVisual
                color={CARD_COLORS[index % CARD_COLORS.length]}
                balance={formatCentsToUsd(card.balanceCents)}
                balanceLabel="Current Balance"
                last4={card.botId.slice(-4)}
                holder={card.botName.toUpperCase()}
                frozen={card.isFrozen}
              />
              <WalletActionBar
                actions={[
                  {
                    icon: Shield,
                    label: "Limits",
                    onClick: () => {},
                    "data-testid": `button-limits-${card.id}`,
                  },
                  {
                    icon: card.isFrozen ? Play : Snowflake,
                    label: card.isFrozen ? "Unfreeze" : "Freeze",
                    onClick: () => handleFreeze(card),
                    className: `flex-1 text-xs gap-2 ${card.isFrozen ? "text-blue-600" : "text-neutral-600"} cursor-pointer hover:bg-neutral-100 rounded-lg transition-colors`,
                    "data-testid": `button-freeze-${card.id}`,
                  },
                ]}
                menuItems={[
                  {
                    icon: Eye,
                    label: "View Transactions",
                    onClick: () => window.location.href = "/transactions",
                    "data-testid": `menu-transactions-${card.id}`,
                  },
                  {
                    icon: Copy,
                    label: "Copy Bot ID",
                    onClick: () => handleCopyBotId(card.botId),
                    "data-testid": `menu-copy-botid-${card.id}`,
                  },
                ]}
                menuTestId={`button-more-${card.id}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
