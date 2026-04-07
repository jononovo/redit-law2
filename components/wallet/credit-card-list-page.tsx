"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { useWalletActions } from "./hooks/use-wallet-actions";
import { useBotLinking } from "./hooks/use-bot-linking";
import { FreezeDialog } from "./dialogs/freeze-dialog";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { LinkBotDialog } from "./dialogs/link-bot-dialog";
import { UnlinkBotDialog } from "./dialogs/unlink-bot-dialog";
import { CreditCardItem } from "./credit-card-item";
import { RailPageTabs, type RailTab } from "./rail-page-tabs";
import { TransactionList, type TransactionRow } from "./transaction-list";
import { OrderList, type OrderRow } from "./order-list";
import { ApprovalList, type ApprovalRow } from "./approval-list";
import type { NormalizedCard } from "./types";

export interface CreditCardListPageConfig {
  title: string;
  subtitle: string;
  addButtonLabel: string;
  emptyTitle: string;
  emptySubtitle: string;
  apiEndpoint: string;
  railPrefix: string;
  basePath: string;
  normalizeCards: (data: any) => NormalizedCard[];
  explainer: ReactNode;
  setupWizard?: (props: { open: boolean; onOpenChange: (v: boolean) => void; onComplete: () => void }) => ReactNode;
  setupWizardHref?: string;
  supportsBotLinking?: boolean;
  transactionsEndpoint?: string;
  approvalsEndpoint?: string;
  approvalsDecideEndpoint?: string;
}

export function CreditCardListPage({ config }: { config: CreditCardListPageConfig }) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [cards, setCards] = useState<NormalizedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [freezeTarget, setFreezeTarget] = useState<NormalizedCard | null>(null);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NormalizedCard | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("cards");

  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);

  const fetchCards = useCallback(async () => {
    try {
      const res = await authFetch(config.apiEndpoint);
      if (res.ok) {
        const data = await res.json();
        setCards(config.normalizeCards(data));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [config]);

  const fetchTransactions = useCallback(async () => {
    if (!config.transactionsEndpoint) return;
    try {
      const res = await authFetch(config.transactionsEndpoint);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch {}
  }, [config.transactionsEndpoint]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await authFetch(`/api/v1/orders?rail=${config.railPrefix}`);
      if (res.ok) {
        const data = await res.json();
        setOrders((data.orders || []).map((o: any) => ({
          id: o.id,
          rail: o.rail,
          botName: o.botName ?? o.bot_name ?? null,
          vendor: o.vendor ?? null,
          productName: o.productName ?? o.product_name ?? null,
          productImageUrl: o.productImageUrl ?? o.product_image_url ?? null,
          productUrl: o.productUrl ?? o.product_url ?? null,
          status: o.status,
          quantity: o.quantity ?? 1,
          priceCents: o.priceCents ?? o.price_cents ?? null,
          priceCurrency: o.priceCurrency ?? o.price_currency ?? "USD",
          shippingAddress: o.shippingAddress ?? o.shipping_address ?? null,
          trackingInfo: o.trackingInfo ?? o.tracking_info ?? null,
          externalOrderId: o.externalOrderId ?? o.external_order_id ?? null,
          metadata: o.metadata ?? null,
          createdAt: o.createdAt ?? o.created_at ?? "",
        })));
      }
    } catch {}
  }, [config.railPrefix]);

  const fetchApprovals = useCallback(async () => {
    if (!config.approvalsEndpoint) return;
    try {
      const res = await authFetch(config.approvalsEndpoint);
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
      }
    } catch {}
  }, [config.approvalsEndpoint]);

  const walletActions = useWalletActions({
    railPrefix: config.railPrefix,
    entityType: "card",
    entityIdField: "card_id",
    approvalsDecideEndpoint: config.approvalsDecideEndpoint,
    onUpdate: fetchCards,
  });

  const botLinking = useBotLinking({
    railPrefix: config.railPrefix,
    entityType: "card",
    onUpdate: fetchCards,
  });

  useEffect(() => {
    if (user) {
      fetchCards();
      if (config.supportsBotLinking !== false) {
        botLinking.fetchBots();
      }
      fetchTransactions();
      fetchOrders();
      fetchApprovals();
    } else {
      setLoading(false);
    }
  }, [user, fetchCards, botLinking.fetchBots, config.supportsBotLinking, fetchTransactions, fetchOrders, fetchApprovals]);

  async function handleFreezeConfirm() {
    if (!freezeTarget) return;
    setFreezeLoading(true);
    const isFrozen = freezeTarget.status === "frozen";
    const newStatus = isFrozen ? "active" : "frozen";

    setCards((prev) => prev.map((c) => c.card_id === freezeTarget.card_id ? { ...c, status: newStatus } : c));

    try {
      const body = config.railPrefix === "rail5"
        ? { status: newStatus }
        : { card_id: freezeTarget.card_id, frozen: !isFrozen };
      const url = config.railPrefix === "rail5"
        ? `/api/v1/rail5/cards/${freezeTarget.card_id}`
        : `/api/v1/${config.railPrefix}/freeze`;
      const method = config.railPrefix === "rail5" ? "PATCH" : "POST";

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json().catch(() => null);
        if (updated?.status) {
          setCards((prev) => prev.map((c) => c.card_id === freezeTarget.card_id ? { ...c, status: updated.status } : c));
        }
      } else {
        setCards((prev) => prev.map((c) => c.card_id === freezeTarget.card_id ? { ...c, status: freezeTarget.status } : c));
      }
    } catch {
      setCards((prev) => prev.map((c) => c.card_id === freezeTarget.card_id ? { ...c, status: freezeTarget.status } : c));
    } finally {
      setFreezeLoading(false);
      setFreezeTarget(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const url = `/api/v1/cards/${deleteTarget.card_id}?rail=${config.railPrefix}`;
      const res = await authFetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setCards((prev) => prev.filter((c) => c.card_id !== deleteTarget.card_id));
      toast({ title: "Card Removed", description: `"${deleteTarget.card_name}" has been removed.` });
      fetchCards();
    } catch {
      toast({ title: "Delete failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  }

  const supportsBotLinking = config.supportsBotLinking !== false;

  const cardListContent = loading ? (
    <div className="flex items-center justify-center py-24" data-testid="loading-cards">
      <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
    </div>
  ) : cards.length === 0 ? (
    <div className="text-center py-24" data-testid="text-no-cards">
      <CreditCard className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
      <p className="text-lg text-neutral-400 font-medium">{config.emptyTitle}</p>
      <p className="text-sm text-neutral-400 mt-2">{config.emptySubtitle}</p>
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {cards.map((card) => (
        <CreditCardItem
          key={card.card_id}
          card={card}
          onFreeze={() => setFreezeTarget(card)}
          onAddAgent={supportsBotLinking ? () => botLinking.openLinkDialog({
            id: card.card_id,
            name: card.card_name,
            bot_id: card.bot_id,
            bot_name: card.bot_name,
          }) : undefined}
          onUnlinkBot={supportsBotLinking ? () => botLinking.openUnlinkDialog({
            id: card.card_id,
            name: card.card_name,
            bot_id: card.bot_id,
            bot_name: card.bot_name,
          }) : undefined}
          onCopyCardId={() => walletActions.copyCardId(card.card_id)}
          onDelete={() => setDeleteTarget(card)}
        />
      ))}
    </div>
  );

  const tabs: RailTab[] = [
    { id: "cards", label: "Cards", content: cardListContent },
    {
      id: "transactions",
      label: "Transactions",
      content: <TransactionList transactions={transactions} testIdPrefix="tx" />,
    },
    {
      id: "orders",
      label: "Orders",
      content: <OrderList orders={orders} testIdPrefix="order" />,
    },
    {
      id: "approvals",
      label: "Approvals",
      badge: approvals.length,
      content: (
        <ApprovalList
          approvals={approvals}
          variant={config.approvalsDecideEndpoint ? "commerce" : "crypto"}
          onDecide={(id, decision) => walletActions.handleApprovalDecision(id, decision, { onSuccess: fetchApprovals })}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-1" data-testid="text-page-title">{config.title}</h1>
          <p className="text-neutral-500">{config.subtitle}</p>
        </div>
        <Button
          onClick={() => config.setupWizardHref ? router.push(config.setupWizardHref) : setWizardOpen(true)}
          className="rounded-full bg-primary hover:bg-primary/90 gap-2"
          data-testid="button-add-card"
        >
          <Plus className="w-4 h-4" />
          {config.addButtonLabel}
        </Button>
      </div>

      {config.setupWizard?.({ open: wizardOpen, onOpenChange: setWizardOpen, onComplete: fetchCards })}

      <FreezeDialog
        open={!!freezeTarget}
        onOpenChange={(open) => !open && setFreezeTarget(null)}
        itemName={freezeTarget?.card_name || ""}
        isFrozen={freezeTarget?.status === "frozen"}
        loading={freezeLoading}
        onConfirm={handleFreezeConfirm}
        itemType="card"
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" /> Remove Card
          </DialogTitle>
          <DialogDescription className="text-neutral-600">
            Are you sure you want to remove &quot;{deleteTarget?.card_name}&quot;? This action cannot be undone.
          </DialogDescription>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteLoading} data-testid="button-delete-cancel">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteLoading} data-testid="button-delete-confirm">
              {deleteLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {supportsBotLinking && (
        <>
          <LinkBotDialog
            open={!!botLinking.linkTarget}
            onOpenChange={(open) => { if (!open) botLinking.closeLinkDialog(); }}
            itemName={botLinking.linkTarget?.name || ""}
            bots={botLinking.bots}
            selectedBotId={botLinking.linkBotId}
            onBotIdChange={botLinking.setLinkBotId}
            loading={botLinking.linkLoading}
            onConfirm={botLinking.handleLinkBot}
            onCancel={botLinking.closeLinkDialog}
            itemType="card"
          />
          <UnlinkBotDialog
            open={!!botLinking.unlinkTarget}
            onOpenChange={(open) => { if (!open) botLinking.closeUnlinkDialog(); }}
            botName={botLinking.unlinkTarget?.bot_name || ""}
            loading={botLinking.unlinkLoading}
            onConfirm={botLinking.handleUnlinkBot}
            onCancel={botLinking.closeUnlinkDialog}
            itemType="card"
          />
        </>
      )}

      {config.explainer}

      <RailPageTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        testIdPrefix={config.railPrefix}
        tabs={tabs}
      />
    </div>
  );
}
