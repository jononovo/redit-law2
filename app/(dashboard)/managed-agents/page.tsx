"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { CardRow, CardRowItem } from "@/components/dashboard/card-row";
import { ManagedAgentCard } from "@/components/managed-agent/managed-agent-card";

interface ManagedAgentData {
  bot_id: string;
  bot_name: string;
  description: string | null;
  runtime: string;
  created_at: string;
}

// Index of managed agents — remote agents CreditClaw runs on the owner's
// behalf. User-linked agents live on /agents; each card here opens that
// agent's own management page.
export default function ManagedAgentsIndexPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<ManagedAgentData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/bots/mine");
      if (res.ok) {
        const data = (await res.json()) as { managed_agents?: ManagedAgentData[] };
        setAgents(data.managed_agents || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAgents();
  }, [user, fetchAgents]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-neutral-900">Managed Agents</h2>
        <p className="text-sm text-neutral-500">
          Agents CreditClaw runs for you — open one to direct it, watch its runs, and manage its settings.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16" data-testid="loading-managed-agents">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-12 text-center" data-testid="empty-managed-agents">
          <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-violet-600" />
          </div>
          <h3 className="font-bold text-neutral-900 text-lg mb-2">No managed agents yet</h3>
          <p className="text-sm text-neutral-500">Your managed agent is set up automatically — check back in a moment.</p>
        </div>
      ) : (
        <CardRow>
          {agents.map((agent) => (
            <CardRowItem key={agent.bot_id}>
              <ManagedAgentCard
                botName={agent.bot_name}
                description={agent.description}
                runtime={agent.runtime}
                createdAt={agent.created_at}
              />
            </CardRowItem>
          ))}
        </CardRow>
      )}
    </div>
  );
}
