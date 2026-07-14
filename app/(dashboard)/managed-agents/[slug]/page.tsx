"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { CardDetailShell } from "@/components/wallet/card-detail-shell";
import { CheckoutHistory } from "@/components/managed-agent/checkout-history";
import { ManagedAgentSettings } from "@/components/managed-agent/managed-agent-settings";
import { type AgentCheckoutData } from "@/components/managed-agent/checkout-observer";
import { isTerminalAgentCheckoutStatus } from "@/lib/managed-agent-checkouts";
import { MANAGED_AGENT_RUNTIMES, MANAGED_AGENTS_ROUTE, runtimeFromSlug, managedAgentRoute } from "@/lib/managed-agents";

interface ManagedAgentRow {
  runtime: string;
  bot_id: string | null;
  default_card_id: string | null;
  buyer_profile_id: string | null;
  created_at: string | null;
}

// A managed agent's own dashboard: direct it (new checkout), watch its runs,
// and manage its settings. The observance view lives on the per-run sub-page.
export default function ManagedAgentDashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const runtime = useMemo(() => runtimeFromSlug(slug), [slug]);

  const [agent, setAgent] = useState<ManagedAgentRow | null>(null);
  const [checkouts, setCheckouts] = useState<AgentCheckoutData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!runtime) return;
    try {
      const [agentRes, checkoutsRes] = await Promise.all([
        authFetch(`/api/v1/managed-agents/${runtime}`),
        authFetch("/api/v1/managed-agents/checkouts"),
      ]);
      if (agentRes.ok) setAgent((await agentRes.json()) as ManagedAgentRow);
      if (checkoutsRes.ok) {
        const data = (await checkoutsRes.json()) as { checkouts?: AgentCheckoutData[] };
        setCheckouts(data.checkouts || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    if (user && runtime) fetchAll();
  }, [user, runtime, fetchAll]);

  if (!runtime) {
    return (
      <CardDetailShell
        loading={false}
        notFound
        backHref={MANAGED_AGENTS_ROUTE}
        backLabel="Back to Managed Agents"
        notFoundLabel="Managed agent not found."
      />
    );
  }

  const branding = MANAGED_AGENT_RUNTIMES[runtime];
  const agentPath = managedAgentRoute(runtime);
  const activeRuns = checkouts.filter((c) => !isTerminalAgentCheckoutStatus(c.status));

  return (
    <CardDetailShell
      loading={loading}
      notFound={false}
      backHref={MANAGED_AGENTS_ROUTE}
      backLabel="Managed Agents"
    >
      <div className="flex items-start justify-between gap-4" data-testid="managed-agent-header">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-violet-50">
            <ShoppingBag className="w-6 h-6 text-violet-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-neutral-900">{branding.displayName}</h2>
              <span
                className="shrink-0 text-[10px] font-semibold uppercase tracking-wide bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full"
                data-testid="badge-managed-agent-page"
              >
                Managed
              </span>
            </div>
            <p className="text-sm text-neutral-500">{branding.description}</p>
          </div>
        </div>
      </div>

      {activeRuns.map((run) => (
        <Link
          key={run.checkout_id}
          href={`${agentPath}/runs/${run.checkout_id}`}
          className="block"
          data-testid={`banner-active-run-${run.checkout_id}`}
        >
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3 hover:bg-blue-100 transition-colors">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-blue-900 truncate">
                {branding.displayName} is working on a checkout
              </p>
              <p className="text-xs text-blue-700 truncate">{run.last_event || run.request.split("\n")[0]}</p>
            </div>
            <span className="text-xs font-semibold text-blue-700 shrink-0">Watch live →</span>
          </div>
        </Link>
      ))}

      <div>
        <Link href={`${agentPath}/new`}>
          <Button className="rounded-xl gap-2" data-testid="button-new-checkout">
            <Plus className="w-4 h-4" />
            New checkout
          </Button>
        </Link>
      </div>

      <CheckoutHistory checkouts={checkouts} runsBasePath={`${agentPath}/runs`} />

      <ManagedAgentSettings
        runtime={runtime}
        defaultCardId={agent?.default_card_id ?? null}
        buyerProfileId={agent?.buyer_profile_id ?? null}
        onDefaultCardChanged={(cardId) => setAgent((prev) => (prev ? { ...prev, default_card_id: cardId } : prev))}
      />
    </CardDetailShell>
  );
}
