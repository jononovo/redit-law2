"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bot as BotIcon, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BotCard } from "@/components/dashboard/bot-card";
import { ManagedAgentCard } from "@/components/managed-agent/managed-agent-card";
import { AddAgentCtaCard } from "@/components/dashboard/add-agent-cta-card";
import { PendingPairingCard } from "@/components/dashboard/pending-pairing-card";
import { CardRow, CardRowItem } from "@/components/dashboard/card-row";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { authFetch } from "@/features/platform-management/auth-fetch";

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

interface ManagedAgentData {
  bot_id: string;
  bot_name: string;
  description: string | null;
  runtime: string;
  created_at: string;
}

export default function AgentsPage() {
  const { user } = useAuth();
  const [bots, setBots] = useState<BotData[]>([]);
  const [managedAgents, setManagedAgents] = useState<ManagedAgentData[]>([]);
  const [pendingPairings, setPendingPairings] = useState<PendingPairing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBots = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/bots/mine");
      if (res.ok) {
        const data = await res.json();
        setBots(data.bots || []);
        setManagedAgents(data.managed_agents || []);
        setPendingPairings(data.pending_pairings || []);
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchBots();
    }
  }, [user, fetchBots]);

  const activeBots = bots.filter((b) => b.wallet_status === "active");
  const pendingBots = bots.filter((b) => b.wallet_status === "pending");

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-bold text-neutral-900">Agents</h2>
          {!loading && bots.length > 0 && (
            <span className="text-sm text-neutral-400" data-testid="text-agent-counts">
              {activeBots.length} Active <span className="text-neutral-300">|</span> {pendingBots.length} Pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/add-agent">
            <Button className="rounded-xl gap-2" data-testid="button-add-agent">
              <Plus className="w-4 h-4" />
              Add Agent
            </Button>
          </Link>
          <Link href="/claim">
            <Button variant="outline" className="rounded-xl" data-testid="button-claim-agent">
              Claim an Agent
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : bots.length === 0 && pendingPairings.length === 0 && managedAgents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-12 text-center" data-testid="empty-bots">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BotIcon className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-bold text-neutral-900 text-lg mb-2">Set up your first agent</h3>
          <p className="text-sm text-neutral-500 mb-6">Connect an agent to start issuing cards and managing spend.</p>
        </div>
      ) : (
        <CardRow>
          {managedAgents.map((agent) => (
            <CardRowItem key={agent.bot_id}>
              <ManagedAgentCard
                botName={agent.bot_name}
                description={agent.description}
                runtime={agent.runtime}
                createdAt={agent.created_at}
              />
            </CardRowItem>
          ))}
          {pendingPairings.map((pairing) => (
            <CardRowItem key={pairing.code}>
              <PendingPairingCard code={pairing.code} expiresAt={pairing.expires_at} />
            </CardRowItem>
          ))}
          {bots.map((bot) => (
            <CardRowItem key={bot.bot_id}>
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
                onUpdated={fetchBots}
              />
            </CardRowItem>
          ))}
          {managedAgents.length > 0 && bots.length === 0 && pendingPairings.length === 0 && (
            <CardRowItem key="add-agent-cta">
              <AddAgentCtaCard />
            </CardRowItem>
          )}
        </CardRow>
      )}
    </div>
  );
}
