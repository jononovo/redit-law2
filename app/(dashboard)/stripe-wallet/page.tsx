"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Wallet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";
import type { Rail1WalletInfo, Rail1ApprovalInfo, Rail1TransactionInfo } from "@/components/wallet/types";
import { useWalletActions } from "@/components/wallet/hooks/use-wallet-actions";
import { useBotLinking } from "@/components/wallet/hooks/use-bot-linking";
import { useTransfer } from "@/components/wallet/hooks/use-transfer";
import { useGuardrails } from "@/components/wallet/hooks/use-guardrails";
import { CryptoWalletItem } from "@/components/wallet/crypto-wallet-item";
import { GuardrailDialog } from "@/components/wallet/dialogs/guardrail-dialog";
import { LinkBotDialog } from "@/components/wallet/dialogs/link-bot-dialog";
import { UnlinkBotDialog } from "@/components/wallet/dialogs/unlink-bot-dialog";
import { TransferDialog } from "@/components/wallet/dialogs/transfer-dialog";
import { CreateCryptoWalletDialog } from "@/components/wallet/dialogs/create-crypto-wallet-dialog";
import { FundWalletSheet } from "@/lib/payments/components/fund-wallet-sheet";
import { RailPageTabs } from "@/components/wallet/rail-page-tabs";
import { TransactionList } from "@/components/wallet/transaction-list";
import { OrderList, type OrderRow } from "@/components/wallet/order-list";
import { ApprovalList } from "@/components/wallet/approval-list";
import { WalletSelector } from "@/components/wallet/wallet-selector";
import type { CryptoGuardrailForm } from "@/components/wallet/dialogs/guardrail-dialog";

export default function StripeWalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wallets, setWallets] = useState<Rail1WalletInfo[]>([]);
  const [transactions, setTransactions] = useState<Rail1TransactionInfo[]>([]);
  const [approvals, setApprovals] = useState<Rail1ApprovalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<Rail1WalletInfo | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("wallets");
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const fetchWallets = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/stripe-wallet/list");
      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets || []);
        if (data.wallets?.length > 0 && !selectedWallet) {
          setSelectedWallet(data.wallets[0]);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [selectedWallet]);

  const fetchTransactions = useCallback(async (walletId: number) => {
    try {
      const res = await authFetch(`/api/v1/stripe-wallet/transactions?wallet_id=${walletId}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch {}
  }, []);

  const fetchOrders = useCallback(async (walletId?: number) => {
    try {
      const wId = walletId || selectedWallet?.id;
      const url = wId
        ? `/api/v1/orders?rail=rail1&wallet_id=${wId}`
        : `/api/v1/orders?rail=rail1`;
      const res = await authFetch(url);
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
  }, [selectedWallet]);

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/approvals?rail=rail1");
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
      }
    } catch {}
  }, []);

  const walletActions = useWalletActions({
    railPrefix: "stripe-wallet",
    entityType: "wallet",
    approvalsDecideEndpoint: "/api/v1/approvals/decide",
    entityIdField: "wallet_id",
    onUpdate: fetchWallets,
    onTransactionsRefresh: (entityId) => {
      if (selectedWallet?.id === entityId) {
        fetchTransactions(entityId as number);
      }
    },
  });

  const botLinking = useBotLinking({
    railPrefix: "stripe-wallet",
    entityType: "wallet",
    onUpdate: fetchWallets,
  });

  const transfer = useTransfer({
    sourceRail: "privy",
    onUpdate: fetchWallets,
    onTransactionsRefresh: () => {
      if (selectedWallet) {
        fetchTransactions(selectedWallet.id);
      }
    },
  });

  const guardrails = useGuardrails<Rail1WalletInfo>({
    variant: "crypto",
    railPrefix: "stripe-wallet",
    onUpdate: fetchWallets,
  });

  const [fundSheetOpen, setFundSheetOpen] = useState(false);
  const [fundTarget, setFundTarget] = useState<{ id: number; address: string; botName?: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchWallets();
      botLinking.fetchBots();
      fetchApprovals();
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [user, fetchWallets, botLinking.fetchBots, fetchApprovals, fetchOrders]);

  useEffect(() => {
    if (selectedWallet) {
      fetchTransactions(selectedWallet.id);
      fetchOrders(selectedWallet.id);
    }
  }, [selectedWallet, fetchTransactions, fetchOrders]);

  const handleSelectWallet = (id: number) => {
    const w = wallets.find(w => w.id === id);
    if (w) setSelectedWallet(w);
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-1" data-testid="text-stripe-wallet-title">Stripe Wallet</h1>
          <p className="text-neutral-500">
            Fund bots with USDC on Base via Stripe. Bots pay for API resources using the x402 protocol.
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="rounded-full bg-primary hover:bg-primary/90 gap-2"
          data-testid="button-create-stripe-wallet"
        >
          <Plus className="w-4 h-4" />
          New Wallet
        </Button>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6" data-testid="card-rail1-explainer">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-900 mb-1">How Stripe Wallet Works</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Each bot gets a Privy server wallet on Base chain. You fund it with USDC via Stripe's Crypto Onramp (fiat → USDC).
              When your bot needs to pay for an API resource, it uses the x402 payment protocol — CreditClaw signs the EIP-712
              transfer authorization within guardrails you set (per-tx limits, daily/monthly budgets, domain allow/blocklists).
            </p>
          </div>
        </div>
      </div>

      <RailPageTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        testIdPrefix="stripe"
        tabs={[
          {
            id: "wallets",
            label: "Wallets",
            content: loading ? (
              <div className="flex items-center justify-center py-24" data-testid="loading-stripe-wallets">
                <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
              </div>
            ) : wallets.length === 0 ? (
              <div className="text-center py-24" data-testid="text-no-stripe-wallets">
                <Wallet className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-lg text-neutral-400 font-medium">No Stripe Wallets yet.</p>
                <p className="text-sm text-neutral-400 mt-2">Click "New Wallet" to provision a USDC wallet for your bot.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {wallets.map((wallet) => (
                  <CryptoWalletItem
                    key={wallet.id}
                    wallet={wallet}
                    color="blue"
                    onFund={() => { setFundTarget({ id: wallet.id, address: wallet.address, botName: wallet.bot_name }); setFundSheetOpen(true); }}
                    onFreeze={() => walletActions.handleFreeze({ id: wallet.id, name: wallet.bot_name || "Wallet", status: wallet.status })}
                    onGuardrails={() => guardrails.openDialog(wallet)}
                    onActivity={() => { setSelectedWallet(wallet); setActiveTab("transactions"); }}
                    onAddAgent={() => botLinking.openLinkDialog({ id: wallet.id, name: wallet.bot_name || "Wallet", bot_id: wallet.bot_id || null, bot_name: wallet.bot_name || null })}
                    onUnlinkBot={() => botLinking.openUnlinkDialog({ id: wallet.id, name: wallet.bot_name || "Wallet", bot_id: wallet.bot_id, bot_name: wallet.bot_name })}
                    onCopyAddress={() => walletActions.copyAddress(wallet.address)}
                    onSyncBalance={() => walletActions.handleSyncAndPatch(wallet.id, setWallets)}
                    onTransfer={() => transfer.openTransferDialog(wallet)}
                    syncingBalance={walletActions.syncingId === wallet.id}
                    fundLabel="Fund"
                    testIdPrefix="stripe"
                    basescanUrl={`https://basescan.org/address/${wallet.address}#tokentxns`}
                  />
                ))}
              </div>
            ),
          },
          {
            id: "transactions",
            label: "Transactions",
            content: (
              <>
                {selectedWallet && (
                  <WalletSelector
                    wallets={wallets.map(w => ({ id: w.id, label: w.bot_name || `Wallet ${w.id}` }))}
                    selectedId={selectedWallet.id}
                    onChange={handleSelectWallet}
                    testId="select-wallet-transactions"
                  />
                )}
                <TransactionList transactions={transactions} testIdPrefix="tx" />
              </>
            ),
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
                variant="crypto"
                onDecide={(id, decision) => walletActions.handleApprovalDecision(id, decision, { onSuccess: fetchApprovals })}
              />
            ),
          },
        ]}
      />

      <CreateCryptoWalletDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        bots={botLinking.bots}
        config={{
          title: "Create Stripe Wallet",
          description: "Provision a Privy server wallet on Base for your bot. It can be funded with USDC via Stripe.",
          endpoint: "/api/v1/stripe-wallet/create",
          buttonLabel: "Create Wallet",
          successMessage: "Wallet created",
          successDescription: "Privy server wallet provisioned on Base.",
        }}
        onCreated={fetchWallets}
      />

      <GuardrailDialog
        open={guardrails.guardrailsDialogOpen}
        onOpenChange={guardrails.setGuardrailsDialogOpen}
        form={guardrails.form}
        onFormChange={(f) => guardrails.setForm(f as CryptoGuardrailForm)}
        saving={guardrails.saving}
        onSave={guardrails.save}
        variant="crypto"
      />

      {fundTarget && (
        <FundWalletSheet
          open={fundSheetOpen}
          onOpenChange={setFundSheetOpen}
          walletId={fundTarget.id}
          walletAddress={fundTarget.address}
          botName={fundTarget.botName}
          rail="rail1"
          onSuccess={fetchWallets}
        />
      )}

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
        itemType="wallet"
      />

      <TransferDialog
        open={transfer.transferDialogOpen}
        onOpenChange={(o) => { if (!o) transfer.closeTransferDialog(); }}
        sourceWallet={transfer.transferSourceWallet}
        amount={transfer.transferAmount}
        onAmountChange={transfer.setTransferAmount}
        destType={transfer.transferDestType}
        onDestTypeChange={transfer.setTransferDestType}
        destWalletKey={transfer.transferDestWalletKey}
        onDestWalletKeyChange={transfer.setTransferDestWalletKey}
        destAddress={transfer.transferDestAddress}
        onDestAddressChange={transfer.setTransferDestAddress}
        availableWallets={transfer.allWalletsForTransfer}
        submitting={transfer.transferSubmitting}
        onSubmit={transfer.handleTransfer}
        onClose={transfer.closeTransferDialog}
      />

      <UnlinkBotDialog
        open={!!botLinking.unlinkTarget}
        onOpenChange={(open) => { if (!open) botLinking.closeUnlinkDialog(); }}
        botName={botLinking.unlinkTarget?.bot_name || ""}
        loading={botLinking.unlinkLoading}
        onConfirm={botLinking.handleUnlinkBot}
        onCancel={botLinking.closeUnlinkDialog}
        itemType="wallet"
      />
    </div>
  );
}
