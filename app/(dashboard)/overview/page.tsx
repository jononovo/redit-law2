"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BotCard } from "@/components/dashboard/bot-card";
import { FundModal } from "@/components/dashboard/fund-modal";
import { ActivityLog } from "@/components/dashboard/activity-log";
import { WebhookLog } from "@/components/dashboard/webhook-log";
import { OpsHealth } from "@/components/dashboard/ops-health";
import { PaymentLinksPanel } from "@/components/dashboard/payment-links";
import { Bot as BotIcon, Plus, Loader2, Wallet, CreditCard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";
import { CryptoWalletItem } from "@/components/wallet/crypto-wallet-item";
import { CreditCardItem } from "@/components/wallet/credit-card-item";
import { CardVisual } from "@/components/wallet/card-visual";
import { useWalletActions } from "@/components/wallet/hooks/use-wallet-actions";
import { useBotLinking } from "@/components/wallet/hooks/use-bot-linking";
import { useGuardrails } from "@/components/wallet/hooks/use-guardrails";
import { useTransfer } from "@/components/wallet/hooks/use-transfer";
import { GuardrailDialog } from "@/components/wallet/dialogs/guardrail-dialog";
import { LinkBotDialog } from "@/components/wallet/dialogs/link-bot-dialog";
import { UnlinkBotDialog } from "@/components/wallet/dialogs/unlink-bot-dialog";
import { TransferDialog } from "@/components/wallet/dialogs/transfer-dialog";
import { FundWalletSheet } from "@/lib/payments/components/fund-wallet-sheet";
import { FreezeDialog } from "@/components/wallet/dialogs/freeze-dialog";
import { ApprovalList, type ApprovalRow } from "@/components/wallet/approval-list";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { Rail1WalletInfo, NormalizedCard } from "@/components/wallet/types";
import { normalizeRail5Card } from "@/components/wallet/types";
import type { CryptoGuardrailForm } from "@/components/wallet/dialogs/guardrail-dialog";

interface BotData {
  bot_id: string;
  bot_name: string;
  description: string | null;
  wallet_status: string;
  created_at: string;
  claimed_at: string | null;
}

interface BalanceData {
  balance_cents: number;
  balance: string;
  has_wallet: boolean;
}

export default function DashboardOverview() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [bots, setBots] = useState<BotData[]>([]);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fundOpen, setFundOpen] = useState(false);

  const [privyWallets, setPrivyWallets] = useState<Rail1WalletInfo[]>([]);
  const [rail5Cards, setRail5Cards] = useState<NormalizedCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  const [overviewApprovals, setOverviewApprovals] = useState<ApprovalRow[]>([]);

  const [rail5FreezeTarget, setRail5FreezeTarget] = useState<NormalizedCard | null>(null);
  const [rail5FreezeLoading, setRail5FreezeLoading] = useState(false);

  const [fundSheetOpen, setFundSheetOpen] = useState(false);
  const [fundTarget, setFundTarget] = useState<{ id: number; address: string; botName?: string } | null>(null);

  async function fetchData() {
    try {
      const [botsRes, balanceRes] = await Promise.all([
        fetch("/api/v1/bots/mine"),
        fetch("/api/v1/wallet/balance"),
      ]);
      if (botsRes.ok) {
        const data = await botsRes.json();
        setBots(data.bots || []);
      }
      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setBalance(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  const fetchPrivyWallets = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/stripe-wallet/list");
      if (res.ok) {
        const data = await res.json();
        setPrivyWallets(data.wallets || []);
      }
    } catch {}
  }, []);

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/approvals");
      if (res.ok) {
        const data = await res.json();
        setOverviewApprovals(data.approvals || []);
      }
    } catch {}
  }, []);

  const handleApprovalDecide = useCallback(async (id: number | string, decision: "approve" | "reject") => {
    try {
      const res = await authFetch("/api/v1/approvals/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval_id: id, decision }),
      });
      if (res.ok) {
        toast({ title: decision === "approve" ? "Approved" : "Rejected" });
        fetchApprovals();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to process decision", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  }, [fetchApprovals, toast]);

  const fetchRail5Cards = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/rail5/cards");
      if (res.ok) {
        const data = await res.json();
        setRail5Cards((data.cards || []).map((c: any) => normalizeRail5Card(c, "/sub-agent-cards")));
      }
    } catch {} finally {
      setCardsLoading(false);
    }
  }, []);

  const rail1WalletActions = useWalletActions({
    railPrefix: "stripe-wallet",
    entityType: "wallet",
    entityIdField: "wallet_id",
    approvalsDecideEndpoint: "/api/v1/approvals/decide",
    onUpdate: fetchPrivyWallets,
  });

  const rail1BotLinking = useBotLinking({
    railPrefix: "stripe-wallet",
    entityType: "wallet",
    onUpdate: fetchPrivyWallets,
  });

  const rail1Guardrails = useGuardrails<Rail1WalletInfo>({
    variant: "crypto",
    railPrefix: "stripe-wallet",
    onUpdate: fetchPrivyWallets,
  });

  const rail1Transfer = useTransfer({
    sourceRail: "privy",
    onUpdate: fetchPrivyWallets,
  });

  const rail5WalletActions = useWalletActions({
    railPrefix: "rail5",
    entityType: "card",
    entityIdField: "card_id",
    onUpdate: fetchRail5Cards,
  });

  const rail5BotLinking = useBotLinking({
    railPrefix: "rail5",
    entityType: "card",
    onUpdate: fetchRail5Cards,
  });

  async function handleRail5FreezeConfirm() {
    if (!rail5FreezeTarget) return;
    setRail5FreezeLoading(true);
    const isFrozen = rail5FreezeTarget.status === "frozen";
    const newStatus = isFrozen ? "active" : "frozen";

    setRail5Cards((prev) => prev.map((c) => c.card_id === rail5FreezeTarget.card_id ? { ...c, status: newStatus } : c));

    try {
      const res = await authFetch(`/api/v1/rail5/cards/${rail5FreezeTarget.card_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json().catch(() => null);
        if (updated?.status) {
          setRail5Cards((prev) => prev.map((c) => c.card_id === rail5FreezeTarget.card_id ? { ...c, status: updated.status } : c));
        }
        toast({
          title: newStatus === "frozen" ? "Card frozen" : "Card unfrozen",
          description: newStatus === "frozen" ? "All transactions on this card are paused." : "Transactions on this card are resumed.",
        });
      } else {
        setRail5Cards((prev) => prev.map((c) => c.card_id === rail5FreezeTarget.card_id ? { ...c, status: rail5FreezeTarget.status } : c));
        toast({ title: "Error", description: "Failed to update card status.", variant: "destructive" });
      }
    } catch {
      setRail5Cards((prev) => prev.map((c) => c.card_id === rail5FreezeTarget.card_id ? { ...c, status: rail5FreezeTarget.status } : c));
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setRail5FreezeLoading(false);
      setRail5FreezeTarget(null);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPrivyWallets();
      fetchRail5Cards();
      fetchApprovals();
      rail1BotLinking.fetchBots();
      rail5BotLinking.fetchBots();
    } else {
      setCardsLoading(false);
    }
  }, [user, fetchPrivyWallets, fetchRail5Cards, fetchApprovals, rail1BotLinking.fetchBots, rail5BotLinking.fetchBots]);

  const activeBots = bots.filter((b) => b.wallet_status === "active");
  const pendingBots = bots.filter((b) => b.wallet_status === "pending");

  const firstWallet = privyWallets[0] || null;
  const firstCard = rail5Cards[0] || null;

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-neutral-100 shadow-sm" data-testid="stat-total-bots">
          <span className="text-sm font-medium text-neutral-500">Total Bots</span>
          <h3 className="text-2xl font-bold text-neutral-900 tracking-tight mt-2">
            {loading ? "—" : bots.length}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-neutral-100 shadow-sm" data-testid="stat-wallet-balance">
          <span className="text-sm font-medium text-neutral-500">Wallet Balance</span>
          <h3 className="text-2xl font-bold text-green-600 tracking-tight mt-2">
            {loading ? "—" : balance?.balance || "$0.00"}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-neutral-100 shadow-sm" data-testid="stat-pending-bots">
          <span className="text-sm font-medium text-neutral-500">Pending Claim</span>
          <h3 className="text-2xl font-bold text-amber-600 tracking-tight mt-2">
            {loading ? "—" : pendingBots.length}
          </h3>
        </div>
      </div>

      {balance?.has_wallet && (
        <div
          onClick={() => setFundOpen(true)}
          className="bg-neutral-900 text-white p-6 rounded-2xl flex items-center justify-between relative overflow-hidden group cursor-pointer"
          data-testid="card-add-funds"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <h4 className="font-bold">Add Funds</h4>
            <p className="text-sm text-neutral-400">Top up your bot&apos;s wallet instantly</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative z-10 group-hover:bg-white/20 transition-colors">
            <Wallet className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-neutral-900">My Bots</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        ) : bots.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-12 text-center" data-testid="empty-bots">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BotIcon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-bold text-neutral-900 text-lg mb-2">Set up your first bot</h3>
            <div className="flex items-center justify-center gap-3">
              <Link href="/onboarding">
                <Button className="rounded-xl gap-2" data-testid="button-start-onboarding">
                  <Plus className="w-4 h-4" />
                  Get Started
                </Button>
              </Link>
              <Link href="/claim">
                <Button variant="outline" className="rounded-xl gap-2" data-testid="button-claim-bot-empty">
                  Claim a Bot
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bots.map((bot) => (
              <BotCard
                key={bot.bot_id}
                botName={bot.bot_name}
                botId={bot.bot_id}
                description={bot.description}
                walletStatus={bot.wallet_status}
                createdAt={bot.created_at}
                claimedAt={bot.claimed_at}
              />
            ))}
          </div>
        )}
      </div>

      {overviewApprovals.length > 0 && (
        <div data-testid="section-approvals">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-neutral-900">Approvals</h2>
            <Link href="/transactions" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors" data-testid="link-see-all-approvals">
              See all <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
          <ApprovalList
            approvals={overviewApprovals.slice(0, 5)}
            onDecide={handleApprovalDecide}
            showRailBadge
            testIdPrefix="overview-approval"
          />
        </div>
      )}

      <div data-testid="section-cards-wallets">
        {cardsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div data-testid="card-privy-wallet">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-neutral-700">Agent Wallet</h3>
                <InfoTooltip text="USDC wallet x402 purchases. Fund with Stripe/Link." />
              </div>
              {firstWallet ? (
                <CryptoWalletItem
                  wallet={firstWallet}
                  color="blue"
                  onFund={() => { setFundTarget({ id: firstWallet.id, address: firstWallet.address, botName: firstWallet.bot_name }); setFundSheetOpen(true); }}
                  onFreeze={() => rail1WalletActions.handleFreeze({ id: firstWallet.id, name: firstWallet.bot_name || "Wallet", status: firstWallet.status })}
                  onGuardrails={() => rail1Guardrails.openDialog(firstWallet)}
                  onActivity={() => router.push("/stripe-wallet")}
                  onAddAgent={() => rail1BotLinking.openLinkDialog({ id: firstWallet.id, name: firstWallet.bot_name || "Wallet", bot_id: firstWallet.bot_id || null, bot_name: firstWallet.bot_name || null })}
                  onUnlinkBot={() => rail1BotLinking.openUnlinkDialog({ id: firstWallet.id, name: firstWallet.bot_name || "Wallet", bot_id: firstWallet.bot_id, bot_name: firstWallet.bot_name })}
                  onCopyAddress={() => rail1WalletActions.copyAddress(firstWallet.address)}
                  onSyncBalance={() => rail1WalletActions.handleSyncAndPatch(firstWallet.id, setPrivyWallets)}
                  onTransfer={() => rail1Transfer.openTransferDialog(firstWallet)}
                  syncingBalance={rail1WalletActions.syncingId === firstWallet.id}
                  fundLabel="Fund"
                  testIdPrefix="stripe"
                  basescanUrl={`https://basescan.org/address/${firstWallet.address}#tokentxns`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-neutral-100 shadow-sm">
                  <Wallet className="w-10 h-10 text-neutral-300 mb-3" />
                  <p className="text-sm text-neutral-400 font-medium">No Privy wallet yet</p>
                  <p className="text-xs text-neutral-400 mt-1">A wallet will be created when you set up a bot.</p>
                </div>
              )}
            </div>

            <div data-testid="card-rail5">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-neutral-700">My Card</h3>
                <InfoTooltip text="Self-hosted: Agent uses your card. Secured with: Encryption & Ephemeral Sub-Agent." />
              </div>
              {firstCard ? (
                <CreditCardItem
                  card={firstCard}
                  index={0}
                  onFreeze={() => setRail5FreezeTarget(firstCard)}
                  onAddAgent={() => rail5BotLinking.openLinkDialog({
                    id: firstCard.card_id,
                    name: firstCard.card_name,
                    bot_id: firstCard.bot_id,
                    bot_name: firstCard.bot_name,
                  })}
                  onUnlinkBot={() => rail5BotLinking.openUnlinkDialog({
                    id: firstCard.card_id,
                    name: firstCard.card_name,
                    bot_id: firstCard.bot_id,
                    bot_name: firstCard.bot_name,
                  })}
                  onCopyCardId={() => rail5WalletActions.copyCardId(firstCard.card_id)}
                />
              ) : (
                <div className="relative" data-testid="card-rail5-empty">
                  <CardVisual
                    color="purple"
                    last4="••••"
                    expiry="••/••"
                    holder="YOUR CARD"
                    holderLabel="Card Name"
                    balance="$0.00"
                    balanceLabel="Spending Limit"
                    status="pending_setup"
                    className="pointer-events-none"
                  />
                  <div
                    onClick={() => router.push("/setup/rail5")}
                    className="group absolute inset-0 rounded-2xl flex items-center justify-center cursor-pointer transition-colors duration-200 hover:bg-black/15"
                    data-testid="button-add-card-overlay"
                  >
                    <p className="absolute top-1/2 -translate-y-full -mt-4 text-sm text-white font-medium max-w-[240px] text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none drop-shadow-sm">Securely encrypt your card for autonomous bot purchases</p>
                    <button
                      className="absolute top-1/2 translate-y-2 rounded-xl gap-2 px-8 py-4 text-base font-semibold bg-white/80 backdrop-blur-sm text-neutral-800 border border-white/50 shadow-sm cursor-pointer transition-all duration-200 hover:bg-white hover:shadow-md flex items-center"
                    >
                      <Plus className="w-5 h-5" />
                      Add Your Card
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <PaymentLinksPanel />

      <OpsHealth />

      <ActivityLog />

      <WebhookLog />

      <FundModal
        open={fundOpen}
        onOpenChange={setFundOpen}
        onSuccess={() => fetchData()}
      />

      <FreezeDialog
        open={!!rail5FreezeTarget}
        onOpenChange={(open) => !open && setRail5FreezeTarget(null)}
        itemName={rail5FreezeTarget?.card_name || ""}
        isFrozen={rail5FreezeTarget?.status === "frozen"}
        loading={rail5FreezeLoading}
        onConfirm={handleRail5FreezeConfirm}
        itemType="card"
      />

      <GuardrailDialog
        open={rail1Guardrails.guardrailsDialogOpen}
        onOpenChange={rail1Guardrails.setGuardrailsDialogOpen}
        form={rail1Guardrails.form}
        onFormChange={(f) => rail1Guardrails.setForm(f as CryptoGuardrailForm)}
        saving={rail1Guardrails.saving}
        onSave={rail1Guardrails.save}
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
          onSuccess={fetchPrivyWallets}
        />
      )}

      <LinkBotDialog
        open={!!rail1BotLinking.linkTarget}
        onOpenChange={(open) => { if (!open) rail1BotLinking.closeLinkDialog(); }}
        itemName={rail1BotLinking.linkTarget?.name || ""}
        bots={rail1BotLinking.bots}
        selectedBotId={rail1BotLinking.linkBotId}
        onBotIdChange={rail1BotLinking.setLinkBotId}
        loading={rail1BotLinking.linkLoading}
        onConfirm={rail1BotLinking.handleLinkBot}
        onCancel={rail1BotLinking.closeLinkDialog}
        itemType="wallet"
      />

      <UnlinkBotDialog
        open={!!rail1BotLinking.unlinkTarget}
        onOpenChange={(open) => { if (!open) rail1BotLinking.closeUnlinkDialog(); }}
        botName={rail1BotLinking.unlinkTarget?.bot_name || ""}
        loading={rail1BotLinking.unlinkLoading}
        onConfirm={rail1BotLinking.handleUnlinkBot}
        onCancel={rail1BotLinking.closeUnlinkDialog}
        itemType="wallet"
      />

      <TransferDialog
        open={rail1Transfer.transferDialogOpen}
        onOpenChange={(o) => { if (!o) rail1Transfer.closeTransferDialog(); }}
        sourceWallet={rail1Transfer.transferSourceWallet}
        amount={rail1Transfer.transferAmount}
        onAmountChange={rail1Transfer.setTransferAmount}
        destType={rail1Transfer.transferDestType}
        onDestTypeChange={rail1Transfer.setTransferDestType}
        destWalletKey={rail1Transfer.transferDestWalletKey}
        onDestWalletKeyChange={rail1Transfer.setTransferDestWalletKey}
        destAddress={rail1Transfer.transferDestAddress}
        onDestAddressChange={rail1Transfer.setTransferDestAddress}
        availableWallets={rail1Transfer.allWalletsForTransfer}
        submitting={rail1Transfer.transferSubmitting}
        onSubmit={rail1Transfer.handleTransfer}
        onClose={rail1Transfer.closeTransferDialog}
      />

      <LinkBotDialog
        open={!!rail5BotLinking.linkTarget}
        onOpenChange={(open) => { if (!open) rail5BotLinking.closeLinkDialog(); }}
        itemName={rail5BotLinking.linkTarget?.name || ""}
        bots={rail5BotLinking.bots}
        selectedBotId={rail5BotLinking.linkBotId}
        onBotIdChange={rail5BotLinking.setLinkBotId}
        loading={rail5BotLinking.linkLoading}
        onConfirm={rail5BotLinking.handleLinkBot}
        onCancel={rail5BotLinking.closeLinkDialog}
        itemType="card"
      />

      <UnlinkBotDialog
        open={!!rail5BotLinking.unlinkTarget}
        onOpenChange={(open) => { if (!open) rail5BotLinking.closeUnlinkDialog(); }}
        botName={rail5BotLinking.unlinkTarget?.bot_name || ""}
        loading={rail5BotLinking.unlinkLoading}
        onConfirm={rail5BotLinking.handleUnlinkBot}
        onCancel={rail5BotLinking.closeUnlinkDialog}
        itemType="card"
      />
    </div>
  );
}
