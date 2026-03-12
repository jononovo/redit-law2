"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, ShoppingCart, Plus, CreditCard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";
import { CrossmintProvider, CrossmintEmbeddedCheckout } from "@crossmint/client-sdk-react-ui";
import type { Rail2WalletInfo, Rail2TransactionInfo, Rail2ApprovalInfo } from "@/components/wallet/types";
import { microUsdcToDisplay } from "@/components/wallet/types";
import { useWalletActions } from "@/components/wallet/hooks/use-wallet-actions";
import { useBotLinking } from "@/components/wallet/hooks/use-bot-linking";
import { useTransfer } from "@/components/wallet/hooks/use-transfer";
import { useGuardrails } from "@/components/wallet/hooks/use-guardrails";
import { CryptoWalletItem } from "@/components/wallet/crypto-wallet-item";
import { GuardrailDialog } from "@/components/wallet/dialogs/guardrail-dialog";
import { TransferDialog } from "@/components/wallet/dialogs/transfer-dialog";
import { CreateCryptoWalletDialog } from "@/components/wallet/dialogs/create-crypto-wallet-dialog";
import { LinkBotDialog } from "@/components/wallet/dialogs/link-bot-dialog";
import { UnlinkBotDialog } from "@/components/wallet/dialogs/unlink-bot-dialog";
import { RailPageTabs } from "@/components/wallet/rail-page-tabs";
import { TransactionList, type TransactionRow } from "@/components/wallet/transaction-list";
import { OrderList, type OrderRow } from "@/components/wallet/order-list";
import { ApprovalList } from "@/components/wallet/approval-list";
import { WalletSelector } from "@/components/wallet/wallet-selector";
import type { CardGuardrailForm } from "@/components/wallet/dialogs/guardrail-dialog";

function CrossmintCheckoutWrapper({ orderId, clientSecret, onError, onSuccess }: {
  orderId: string;
  clientSecret: string;
  onError: () => void;
  onSuccess: () => void;
}) {
  const mountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    mountTimerRef.current = setTimeout(() => {
      if (!mounted) {
        onError();
      }
    }, 15000);

    return () => {
      if (mountTimerRef.current) clearTimeout(mountTimerRef.current);
    };
  }, [mounted, onError]);

  return (
    <div
      className="w-full min-h-[480px]"
      data-testid="container-crossmint-checkout"
      ref={() => setMounted(true)}
    >
      <CrossmintEmbeddedCheckout
        orderId={orderId}
        payment={{
          crypto: { enabled: true },
          fiat: { enabled: true },
        }}
      />
    </div>
  );
}

export default function CardWalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wallets, setWallets] = useState<Rail2WalletInfo[]>([]);
  const [transactions, setTransactions] = useState<Rail2TransactionInfo[]>([]);
  const [approvals, setApprovals] = useState<Rail2ApprovalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<Rail2WalletInfo | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("wallets");
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const [fundWallet, setFundWallet] = useState<Rail2WalletInfo | null>(null);
  const [fundAmount, setFundAmount] = useState("25");
  const [fundLoading, setFundLoading] = useState(false);
  const [fundOrderData, setFundOrderData] = useState<{ orderId: string; clientSecret: string } | null>(null);
  const [fundEmbedError, setFundEmbedError] = useState(false);

  const fetchWallets = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/card-wallet/list");
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

  const fetchTransactions = useCallback(async () => {
    if (!selectedWallet) return;
    try {
      const res = await authFetch(`/api/v1/card-wallet/transactions?wallet_id=${selectedWallet.id}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch {}
  }, [selectedWallet]);

  const fetchOrders = useCallback(async (walletId?: number) => {
    try {
      const wId = walletId || selectedWallet?.id;
      const url = wId
        ? `/api/v1/orders?rail=rail2&wallet_id=${wId}`
        : `/api/v1/orders?rail=rail2`;
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
      const res = await authFetch("/api/v1/approvals?rail=rail2");
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
      }
    } catch {}
  }, []);

  const walletActions = useWalletActions({
    railPrefix: "card-wallet",
    entityType: "wallet",
    approvalsDecideEndpoint: "/api/v1/approvals/decide",
    entityIdField: "wallet_id",
    onUpdate: fetchWallets,
    onTransactionsRefresh: () => fetchTransactions(),
  });

  const botLinking = useBotLinking({
    railPrefix: "card-wallet",
    entityType: "wallet",
    onUpdate: fetchWallets,
  });

  const transfer = useTransfer({
    sourceRail: "crossmint",
    onUpdate: fetchWallets,
    onTransactionsRefresh: fetchTransactions,
  });

  const guardrails = useGuardrails<Rail2WalletInfo>({
    variant: "card",
    railPrefix: "card-wallet",
    procurementScope: "rail2",
    microUsdcMultiplier: true,
    onUpdate: fetchWallets,
  });

  useEffect(() => {
    if (user) {
      fetchWallets();
      botLinking.fetchBots();
      fetchApprovals();
      fetchOrders();
    }
  }, [user, fetchWallets, botLinking.fetchBots, fetchApprovals, fetchOrders]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (selectedWallet) {
      fetchOrders(selectedWallet.id);
    }
  }, [selectedWallet, fetchOrders]);

  const handleSelectWallet = (id: number) => {
    const w = wallets.find(w => w.id === id);
    if (w) setSelectedWallet(w);
  };

  const handleOpenFund = async (wallet: Rail2WalletInfo) => {
    setFundWallet(wallet);
    setFundOrderData(null);
    setFundEmbedError(false);
    setFundDialogOpen(true);
  };

  const handleStartFund = async () => {
    if (!fundWallet) return;
    setFundLoading(true);
    setFundEmbedError(false);
    try {
      const res = await authFetch("/api/v1/card-wallet/onramp/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_id: fundWallet.id, amount_usd: Number(fundAmount) }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", description: err.error || "Failed to create funding session", variant: "destructive" });
        setFundLoading(false);
        return;
      }
      const data = await res.json();
      setFundOrderData({ orderId: data.order_id, clientSecret: data.client_secret });
    } catch {
      toast({ title: "Failed to start funding", variant: "destructive" });
    } finally {
      setFundLoading(false);
    }
  };

  const handleCloseFund = () => {
    setFundDialogOpen(false);
    setFundWallet(null);
    setFundOrderData(null);
    setFundEmbedError(false);
    setFundAmount("25");
    fetchWallets();
  };

  const pureTransactions = transactions.filter(t => t.type !== "purchase");

  const walletOptions = wallets.map(w => ({
    id: w.id,
    label: `${w.bot_name || "Wallet"} (${w.address.slice(0, 8)}...)`,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="card-wallet-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Card Wallet</h1>
          <p className="text-sm text-neutral-500 mt-1">CrossMint-powered wallets for AI agent commerce purchases</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2" data-testid="button-create-card-wallet">
          <Plus className="w-4 h-4" />
          New Card Wallet
        </Button>
      </div>

      <RailPageTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        testIdPrefix="card"
        tabs={[
          {
            id: "wallets",
            label: "Wallets",
            content: wallets.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-neutral-100">
                <ShoppingCart className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                <h3 className="text-lg font-semibold text-neutral-700">No Card Wallets yet</h3>
                <p className="text-sm text-neutral-500 mt-1 mb-4">Create a wallet to let your AI agents make commerce purchases</p>
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2" data-testid="button-create-first-wallet">
                  <Plus className="w-4 h-4" />
                  Create First Wallet
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {wallets.map((wallet) => (
                  <CryptoWalletItem
                    key={wallet.id}
                    wallet={wallet}
                    color="purple"
                    onFund={() => handleOpenFund(wallet)}
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
                    testIdPrefix="crossmint"
                    basescanUrl={`https://basescan.org/address/${wallet.address}`}
                    guardrailValueFormatter={microUsdcToDisplay}
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
                    wallets={walletOptions}
                    selectedId={selectedWallet.id}
                    onChange={handleSelectWallet}
                    testId="select-wallet-transactions"
                  />
                )}
                <TransactionList
                  transactions={pureTransactions.map(t => ({
                    id: t.id,
                    type: t.type,
                    amount_display: t.amount_display,
                    balance_after_display: t.balance_after_display,
                    status: t.status,
                    created_at: t.created_at,
                    metadata: t.metadata,
                  }))}
                  testIdPrefix="tx"
                />
              </>
            ),
          },
          {
            id: "orders",
            label: "Orders",
            content: (
              <>
                {selectedWallet && (
                  <WalletSelector
                    wallets={walletOptions}
                    selectedId={selectedWallet.id}
                    onChange={handleSelectWallet}
                    testId="select-wallet-orders"
                  />
                )}
                <OrderList
                  orders={orders}
                  testIdPrefix="order"
                />
              </>
            ),
          },
          {
            id: "approvals",
            label: "Approvals",
            badge: approvals.length,
            content: (
              <ApprovalList
                approvals={approvals}
                variant="commerce"
                onDecide={(id, decision) => walletActions.handleApprovalDecision(id, decision, { onSuccess: () => { fetchApprovals(); fetchTransactions(); } })}
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
          title: "Create Card Wallet",
          description: "Select a bot to create a CrossMint Card Wallet for commerce purchases.",
          endpoint: "/api/v1/card-wallet/create",
          buttonLabel: "Create Card Wallet",
          buttonIcon: <ShoppingCart className="w-4 h-4" />,
          successMessage: "Card Wallet created",
        }}
        onCreated={fetchWallets}
      />

      <GuardrailDialog
        open={guardrails.guardrailsDialogOpen}
        onOpenChange={guardrails.setGuardrailsDialogOpen}
        form={guardrails.form}
        onFormChange={(f) => guardrails.setForm(f as CardGuardrailForm)}
        saving={guardrails.saving}
        onSave={guardrails.save}
        variant="card"
        walletName={guardrails.selectedWallet?.bot_name}
      />

      <Dialog open={fundDialogOpen} onOpenChange={(open) => { if (!open) handleCloseFund(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-fund">
          <DialogTitle>
            Fund Wallet {fundWallet ? `— ${fundWallet.bot_name}` : ""}
          </DialogTitle>
          <DialogDescription>
            Buy USDC with your credit card via CrossMint. Funds will be delivered directly to your wallet on Base.
          </DialogDescription>

          {!fundOrderData ? (
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-sm">Amount (USD)</Label>
                <Input
                  type="number"
                  min="1"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="25"
                  data-testid="input-fund-amount"
                />
                <p className="text-xs text-neutral-400 mt-1">Minimum $1. You can fund more later.</p>
              </div>
              <Button
                onClick={handleStartFund}
                disabled={fundLoading || !fundAmount || Number(fundAmount) < 1}
                className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
                data-testid="button-start-fund"
              >
                {fundLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Continue to Payment
              </Button>
            </div>
          ) : fundEmbedError ? (
            <div className="space-y-4 mt-4 text-center">
              <p className="text-sm text-neutral-600">
                The embedded checkout couldn't load. Click below to complete payment in a new tab.
              </p>
              <Button
                onClick={() => {
                  window.open(`https://www.crossmint.com/checkout?orderId=${fundOrderData.orderId}`, "_blank");
                  toast({ title: "CrossMint checkout opened in a new tab" });
                }}
                className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
                data-testid="button-fund-redirect"
              >
                <ExternalLink className="w-4 h-4" />
                Open CrossMint Checkout
              </Button>
            </div>
          ) : (
            <div className="mt-4">
              {process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY ? (
                <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY}>
                  <CrossmintCheckoutWrapper
                    orderId={fundOrderData.orderId}
                    clientSecret={fundOrderData.clientSecret}
                    onError={() => setFundEmbedError(true)}
                    onSuccess={() => {
                      toast({ title: "Funding complete!", description: "USDC has been delivered to your wallet." });
                      handleCloseFund();
                    }}
                  />
                </CrossmintProvider>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-neutral-500 mb-4">Embedded checkout is not configured. Use the redirect instead.</p>
                  <Button
                    onClick={() => setFundEmbedError(true)}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    Open CrossMint Checkout
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
