"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BotCard } from "@/components/dashboard/bot-card";
import { PendingPairingCard } from "@/components/dashboard/pending-pairing-card";
import { OverviewSectionHeader } from "@/components/dashboard/overview-section-header";
import { ActivityLog } from "@/components/dashboard/activity-log";
import { WebhookLog } from "@/components/dashboard/webhook-log";
import { OpsHealth } from "@/components/dashboard/ops-health";
import { Bot as BotIcon, Plus, Loader2, Wallet, CreditCard, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { useToast } from "@/hooks/use-toast";
import { CryptoWalletItem } from "@/components/wallet/crypto-wallet-item";
import { CreditCardItem } from "@/components/wallet/credit-card-item";
import { useWalletActions } from "@/components/wallet/hooks/use-wallet-actions";
import { useBotLinking } from "@/components/wallet/hooks/use-bot-linking";
import { useGuardrails } from "@/components/wallet/hooks/use-guardrails";
import { useTransfer } from "@/components/wallet/hooks/use-transfer";
import { GuardrailDialog } from "@/components/wallet/dialogs/guardrail-dialog";
import { LinkBotDialog } from "@/components/wallet/dialogs/link-bot-dialog";
import { UnlinkBotDialog } from "@/components/wallet/dialogs/unlink-bot-dialog";
import { TransferDialog } from "@/components/wallet/dialogs/transfer-dialog";
import { FundWalletSheet } from "@/features/agent-shops/payments/components/fund-wallet-sheet";
import { FreezeDialog } from "@/components/wallet/dialogs/freeze-dialog";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ApprovalList, type ApprovalRow } from "@/components/wallet/approval-list";
import type { Rail1WalletInfo, NormalizedCard } from "@/components/wallet/types";
import { normalizeRail5Card, normalizeRail3Card } from "@/components/wallet/types";
import type { CryptoGuardrailForm } from "@/components/wallet/dialogs/guardrail-dialog";

interface BotData {
  bot_id: string;
  bot_name: string;
  agent_platform: string | null;
  description: string | null;
  wallet_status: string;
  webhook_status: string;
  tunnel_status: string;
  callback_url: string | null;
  created_at: string;
  claimed_at: string | null;
}

interface PendingPairing {
  code: string;
  created_at: string;
  expires_at: string;
}

export default function DashboardOverview() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [bots, setBots] = useState<BotData[]>([]);
  const [pendingPairings, setPendingPairings] = useState<PendingPairing[]>([]);
  const [loading, setLoading] = useState(true);
  const [privyWallets, setPrivyWallets] = useState<Rail1WalletInfo[]>([]);
  const [rail5Cards, setRail5Cards] = useState<NormalizedCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [rail3Cards, setRail3Cards] = useState<NormalizedCard[]>([]);
  const [rail3Loading, setRail3Loading] = useState(true);
  const [rail3FreezeTarget, setRail3FreezeTarget] = useState<NormalizedCard | null>(null);
  const [rail3FreezeLoading, setRail3FreezeLoading] = useState(false);
  const [rail3DeleteTarget, setRail3DeleteTarget] = useState<NormalizedCard | null>(null);
  const [rail3DeleteLoading, setRail3DeleteLoading] = useState(false);

  const [overviewApprovals, setOverviewApprovals] = useState<ApprovalRow[]>([]);

  const [rail5FreezeTarget, setRail5FreezeTarget] = useState<NormalizedCard | null>(null);
  const [rail5FreezeLoading, setRail5FreezeLoading] = useState(false);
  const [rail5DeleteTarget, setRail5DeleteTarget] = useState<NormalizedCard | null>(null);
  const [rail5DeleteLoading, setRail5DeleteLoading] = useState(false);

  const [fundSheetOpen, setFundSheetOpen] = useState(false);
  const [fundTarget, setFundTarget] = useState<{ id: number; address: string; botName?: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const botsRes = await authFetch("/api/v1/bots/mine");
      if (botsRes.ok) {
        const data = await botsRes.json();
        setBots(data.bots || []);
        setPendingPairings(data.pending_pairings || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  const fetchPrivyWallets = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/usdc-wallet/list");
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
        setRail5Cards((data.cards || []).map((c: any) => normalizeRail5Card(c, "/self-hosted")));
      }
    } catch {} finally {
      setCardsLoading(false);
    }
  }, []);

  const fetchRail3Cards = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/rail3/cards");
      if (res.ok) {
        const data = await res.json();
        setRail3Cards((data.cards || []).map((c: any) => normalizeRail3Card(c, "/virtual-cards")));
      }
    } catch {} finally {
      setRail3Loading(false);
    }
  }, []);

  const rail1WalletActions = useWalletActions({
    railPrefix: "usdc-wallet",
    entityType: "wallet",
    entityIdField: "wallet_id",
    approvalsDecideEndpoint: "/api/v1/approvals/decide",
    onUpdate: fetchPrivyWallets,
  });

  const rail1BotLinking = useBotLinking({
    railPrefix: "usdc-wallet",
    entityType: "wallet",
    onUpdate: fetchPrivyWallets,
  });

  const rail1Guardrails = useGuardrails<Rail1WalletInfo>({
    variant: "crypto",
    railPrefix: "usdc-wallet",
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

  const rail3WalletActions = useWalletActions({
    railPrefix: "rail3",
    entityType: "card",
    entityIdField: "card_id",
    onUpdate: fetchRail3Cards,
  });

  const rail3BotLinking = useBotLinking({
    railPrefix: "rail3",
    entityType: "card",
    onUpdate: fetchRail3Cards,
  });

  function handleRail3FreezeConfirm() {
    if (!rail3FreezeTarget) return;
    rail3WalletActions.handleFreezeCard(
      rail3FreezeTarget.card_id,
      rail3FreezeTarget.is_frozen,
      setRail3Cards,
      setRail3FreezeLoading,
      () => setRail3FreezeTarget(null),
    );
  }

  async function handleRail3DeleteConfirm() {
    if (!rail3DeleteTarget) return;
    setRail3DeleteLoading(true);
    try {
      const res = await authFetch(`/api/v1/cards/${rail3DeleteTarget.card_id}?rail=rail3`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setRail3Cards((prev) => prev.filter((c) => c.card_id !== rail3DeleteTarget.card_id));
      toast({ title: "Card Removed", description: `"${rail3DeleteTarget.card_name}" has been removed.` });
    } catch {
      toast({ title: "Delete failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setRail3DeleteLoading(false);
      setRail3DeleteTarget(null);
    }
  }

  async function handleRail5FreezeConfirm() {
    if (!rail5FreezeTarget) return;
    setRail5FreezeLoading(true);
    const wasFrozen = rail5FreezeTarget.is_frozen;
    const nextIsFrozen = !wasFrozen;

    setRail5Cards((prev) => prev.map((c) => c.card_id === rail5FreezeTarget.card_id ? { ...c, is_frozen: nextIsFrozen } : c));

    try {
      const res = await authFetch(`/api/v1/rail5/cards/${rail5FreezeTarget.card_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_frozen: nextIsFrozen }),
      });
      if (res.ok) {
        const updated = await res.json().catch(() => null);
        if (typeof updated?.is_frozen === "boolean") {
          setRail5Cards((prev) => prev.map((c) => c.card_id === rail5FreezeTarget.card_id ? { ...c, is_frozen: updated.is_frozen } : c));
        }
        toast({
          title: nextIsFrozen ? "Card frozen" : "Card unfrozen",
          description: nextIsFrozen ? "All transactions on this card are paused." : "Transactions on this card are resumed.",
        });
      } else {
        setRail5Cards((prev) => prev.map((c) => c.card_id === rail5FreezeTarget.card_id ? { ...c, is_frozen: wasFrozen } : c));
        toast({ title: "Error", description: "Failed to update card status.", variant: "destructive" });
      }
    } catch {
      setRail5Cards((prev) => prev.map((c) => c.card_id === rail5FreezeTarget.card_id ? { ...c, is_frozen: wasFrozen } : c));
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setRail5FreezeLoading(false);
      setRail5FreezeTarget(null);
    }
  }

  async function handleRail5DeleteConfirm() {
    if (!rail5DeleteTarget) return;
    setRail5DeleteLoading(true);
    try {
      const res = await authFetch(`/api/v1/cards/${rail5DeleteTarget.card_id}?rail=rail5`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setRail5Cards((prev) => prev.filter((c) => c.card_id !== rail5DeleteTarget.card_id));
      toast({ title: "Card Removed", description: `"${rail5DeleteTarget.card_name}" has been removed.` });
    } catch {
      toast({ title: "Delete failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setRail5DeleteLoading(false);
      setRail5DeleteTarget(null);
    }
  }

  useEffect(() => {
    if (user) {
      fetchData();
      fetchPrivyWallets();
      fetchRail5Cards();
      fetchRail3Cards();
      fetchApprovals();
      rail1BotLinking.fetchBots();
      rail5BotLinking.fetchBots();
      rail3BotLinking.fetchBots();
    } else {
      setLoading(false);
      setCardsLoading(false);
      setRail3Loading(false);
    }
  }, [user, fetchData, fetchPrivyWallets, fetchRail5Cards, fetchRail3Cards, fetchApprovals, rail1BotLinking.fetchBots, rail5BotLinking.fetchBots, rail3BotLinking.fetchBots]);

  const activeBots = bots.filter((b) => b.wallet_status === "active");
  const pendingBots = bots.filter((b) => b.wallet_status === "pending");

  const firstWallet = privyWallets[0] || null;
  const firstCard = rail5Cards[0] || null;
  const firstVirtualCard = rail3Cards[0] || null;

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      <div>
        <OverviewSectionHeader
          title="My Agents"
          seeAllHref="/agents"
          seeAllTestId="link-see-all-agents"
          showSeeAll={!loading && (bots.length > 0 || pendingPairings.length > 0)}
          className="mb-3"
          meta={!loading && (
            <span className="text-sm text-neutral-400" data-testid="text-agent-counts">
              {activeBots.length} Active
              {pendingBots.length > 0 && (
                <> <span className="text-neutral-300">|</span> {pendingBots.length} Pending</>
              )}
            </span>
          )}
        />

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        ) : bots.length === 0 && pendingPairings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-12 text-center" data-testid="empty-bots">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BotIcon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-bold text-neutral-900 text-lg mb-2">Set up your first agent</h3>
            <div className="flex items-center justify-center gap-3">
              <Link href="/onboarding">
                <Button className="rounded-xl gap-2" data-testid="button-start-onboarding">
                  <Plus className="w-4 h-4" />
                  Add Agent
                </Button>
              </Link>
              <Link href="/claim">
                <Button variant="outline" className="rounded-xl gap-2" data-testid="button-claim-bot-empty">
                  Claim an Agent
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {pendingPairings.slice(0, 2).map((pairing) => (
              <div key={pairing.code} className="w-full max-w-[26rem]">
                <PendingPairingCard code={pairing.code} expiresAt={pairing.expires_at} />
              </div>
            ))}
            {bots.slice(0, Math.max(0, 2 - pendingPairings.length)).map((bot) => (
              <div key={bot.bot_id} className="w-full max-w-[26rem]">
                <BotCard
                  botName={bot.bot_name}
                  botId={bot.bot_id}
                  agentPlatform={bot.agent_platform}
                  description={bot.description}
                  walletStatus={bot.wallet_status}
                  webhookStatus={bot.webhook_status}
                  tunnelStatus={bot.tunnel_status}
                  callbackUrl={bot.callback_url}
                  createdAt={bot.created_at}
                  claimedAt={bot.claimed_at}
                  onUpdated={() => fetchData()}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {overviewApprovals.length > 0 && (
        <div data-testid="section-approvals">
          <OverviewSectionHeader
            title="Approvals"
            seeAllHref="/transactions"
            seeAllTestId="link-see-all-approvals"
          />
          <ApprovalList
            approvals={overviewApprovals.slice(0, 5)}
            onDecide={handleApprovalDecide}
            showRailBadge
            testIdPrefix="overview-approval"
          />
        </div>
      )}

      <div data-testid="section-cards-wallets">
        {cardsLoading || rail3Loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            <div data-testid="row-virtual-cards">
              <OverviewSectionHeader
                title="Virtual Cards"
                tooltip="Virtual cards issued from your vaulted real card. Each has its own spending limit and agent link."
                seeAllHref="/virtual-cards"
                seeAllTestId="link-see-all-virtual-cards"
                className="mb-3"
              />
              <div className="w-full max-w-[26rem]">
              {firstVirtualCard ? (
                <CreditCardItem
                  card={firstVirtualCard}
                  onFreeze={() => setRail3FreezeTarget(firstVirtualCard)}
                  onAddAgent={() => rail3BotLinking.openLinkDialog({
                    id: firstVirtualCard.card_id,
                    name: firstVirtualCard.card_name,
                    bot_id: firstVirtualCard.bot_id,
                    bot_name: firstVirtualCard.bot_name,
                  })}
                  onUnlinkBot={() => rail3BotLinking.openUnlinkDialog({
                    id: firstVirtualCard.card_id,
                    name: firstVirtualCard.card_name,
                    bot_id: firstVirtualCard.bot_id,
                    bot_name: firstVirtualCard.bot_name,
                  })}
                  onCopyCardId={() => rail3WalletActions.copyCardId(firstVirtualCard.card_id)}
                  onDelete={() => setRail3DeleteTarget(firstVirtualCard)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-neutral-100 shadow-sm" data-testid="card-rail3-empty">
                  <CreditCard className="w-10 h-10 text-neutral-300 mb-3" />
                  <p className="text-sm text-neutral-400 font-medium">No virtual cards yet</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    <Link href="/virtual-cards" className="underline hover:text-neutral-600">Vault your card</Link> once, then create virtual cards on top of it.
                  </p>
                </div>
              )}
              </div>
            </div>

            <div data-testid="card-privy-wallet">
              <OverviewSectionHeader
                title="USDC Wallet"
                tooltip="USDC wallet x402 purchases. Fund with Stripe/Link."
                seeAllHref="/usdc-wallet"
                seeAllTestId="link-see-all-usdc-wallet"
                className="mb-3"
              />
              <div className="w-full max-w-[26rem]">
              {firstWallet ? (
                <CryptoWalletItem
                  wallet={firstWallet}
                  color="blue"
                  onFund={() => { setFundTarget({ id: firstWallet.id, address: firstWallet.address, botName: firstWallet.bot_name }); setFundSheetOpen(true); }}
                  onFreeze={() => rail1WalletActions.handleFreeze({ id: firstWallet.id, name: firstWallet.bot_name || "Wallet", is_frozen: firstWallet.is_frozen })}
                  onGuardrails={() => rail1Guardrails.openDialog(firstWallet)}
                  onActivity={() => router.push("/usdc-wallet")}
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
                  <p className="text-sm text-neutral-400 font-medium">No USDC wallet yet</p>
                  <p className="text-xs text-neutral-400 mt-1">A wallet will be created when you set up a bot.</p>
                </div>
              )}
              </div>
            </div>

            {firstCard && (
              <div data-testid="card-rail5">
                <OverviewSectionHeader
                  title="Self-hosted Cards"
                  tooltip="Self-hosted: Agent uses your card. Secured with: Encryption & Ephemeral Sub-Agent."
                  seeAllHref="/self-hosted"
                  seeAllTestId="link-see-all-self-hosted"
                  className="mb-3"
                />
                <div className="w-full max-w-[26rem]">
                <CreditCardItem
                  card={firstCard}
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
                  onDelete={() => setRail5DeleteTarget(firstCard)}
                />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <OpsHealth />

      <ActivityLog />

      <WebhookLog />

      <FreezeDialog
        open={!!rail5FreezeTarget}
        onOpenChange={(open) => !open && setRail5FreezeTarget(null)}
        itemName={rail5FreezeTarget?.card_name || ""}
        isFrozen={!!rail5FreezeTarget?.is_frozen}
        loading={rail5FreezeLoading}
        onConfirm={handleRail5FreezeConfirm}
        itemType="card"
      />

      <FreezeDialog
        open={!!rail3FreezeTarget}
        onOpenChange={(open) => !open && setRail3FreezeTarget(null)}
        itemName={rail3FreezeTarget?.card_name || ""}
        isFrozen={!!rail3FreezeTarget?.is_frozen}
        loading={rail3FreezeLoading}
        onConfirm={handleRail3FreezeConfirm}
        itemType="card"
      />

      <Dialog open={!!rail3DeleteTarget} onOpenChange={(open) => !open && setRail3DeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" /> Remove Card
          </DialogTitle>
          <DialogDescription className="text-neutral-600">
            Are you sure you want to remove &quot;{rail3DeleteTarget?.card_name}&quot;? This action cannot be undone.
          </DialogDescription>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setRail3DeleteTarget(null)} disabled={rail3DeleteLoading} data-testid="button-rail3-delete-cancel">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRail3DeleteConfirm} disabled={rail3DeleteLoading} data-testid="button-rail3-delete-confirm">
              {rail3DeleteLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rail5DeleteTarget} onOpenChange={(open) => !open && setRail5DeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" /> Remove Card
          </DialogTitle>
          <DialogDescription className="text-neutral-600">
            Are you sure you want to remove &quot;{rail5DeleteTarget?.card_name}&quot;? This action cannot be undone.
          </DialogDescription>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setRail5DeleteTarget(null)} disabled={rail5DeleteLoading} data-testid="button-delete-cancel">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRail5DeleteConfirm} disabled={rail5DeleteLoading} data-testid="button-delete-confirm">
              {rail5DeleteLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      <LinkBotDialog
        open={!!rail3BotLinking.linkTarget}
        onOpenChange={(open) => { if (!open) rail3BotLinking.closeLinkDialog(); }}
        itemName={rail3BotLinking.linkTarget?.name || ""}
        bots={rail3BotLinking.bots}
        selectedBotId={rail3BotLinking.linkBotId}
        onBotIdChange={rail3BotLinking.setLinkBotId}
        loading={rail3BotLinking.linkLoading}
        onConfirm={rail3BotLinking.handleLinkBot}
        onCancel={rail3BotLinking.closeLinkDialog}
        itemType="card"
      />

      <UnlinkBotDialog
        open={!!rail3BotLinking.unlinkTarget}
        onOpenChange={(open) => { if (!open) rail3BotLinking.closeUnlinkDialog(); }}
        botName={rail3BotLinking.unlinkTarget?.bot_name || ""}
        loading={rail3BotLinking.unlinkLoading}
        onConfirm={rail3BotLinking.handleUnlinkBot}
        onCancel={rail3BotLinking.closeUnlinkDialog}
        itemType="card"
      />
    </div>
  );
}
