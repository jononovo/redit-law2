"use client";

import { useCallback, useEffect, useState } from "react";
import { ShoppingBag, Loader2 } from "lucide-react";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { MANAGED_AGENT_RUNTIMES, CROSSMINT_CHECKOUT_RUNTIME } from "@/lib/managed-agents";

const RUNTIME = MANAGED_AGENT_RUNTIMES[CROSSMINT_CHECKOUT_RUNTIME];
import { CheckoutForm } from "@/components/managed-agent/checkout-form";
import { CheckoutHistory } from "@/components/managed-agent/checkout-history";
import { CheckoutObserver, type AgentCheckoutData } from "@/components/managed-agent/checkout-observer";
import { isTerminalAgentCheckoutStatus } from "@/lib/managed-agent-checkouts";

// The observance page: form state until a checkout starts, then the running
// checkout takes over the page (see plan doc — "the playback view is the page").
export default function ManagedAgentsPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<AgentCheckoutData[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<AgentCheckoutData | null>(null);
  const [defaultCardId, setDefaultCardId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/managed-agents/checkouts");
      if (res.ok) {
        const data = (await res.json()) as { checkouts?: AgentCheckoutData[]; default_card_id?: string | null };
        const rows = data.checkouts || [];
        setHistory(rows);
        setDefaultCardId(data.default_card_id ?? null);
        // Resume observing a checkout that's still running (e.g. tab was closed
        // mid-run — the remote agent kept going).
        setActive((prev) => prev ?? rows.find((c) => !isTerminalAgentCheckoutStatus(c.status)) ?? null);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchHistory();
  }, [user, fetchHistory]);

  const exitObserver = () => {
    setActive(null);
    setLoading(true);
    fetchHistory();
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-violet-50">
          <ShoppingBag className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-900">{RUNTIME.displayName}</h2>
            <span
              className="text-[10px] font-semibold uppercase tracking-wide bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full"
              data-testid="badge-inhouse-page"
            >
              In-house
            </span>
          </div>
          <p className="text-sm text-neutral-500">{RUNTIME.description}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16" data-testid="loading-inhouse-page">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : active ? (
        <CheckoutObserver checkout={active} onExit={exitObserver} />
      ) : (
        <>
          <CheckoutForm
            onStarted={setActive}
            defaultCardId={defaultCardId}
            onDefaultCardChanged={setDefaultCardId}
          />
          <CheckoutHistory checkouts={history} onOpen={setActive} />
        </>
      )}
    </div>
  );
}
