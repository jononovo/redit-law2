"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { CardDetailShell } from "@/components/wallet/card-detail-shell";
import { CheckoutObserver, type AgentCheckoutData } from "@/components/managed-agent/checkout-observer";
import { MANAGED_AGENT_RUNTIMES, MANAGED_AGENTS_ROUTE, runtimeFromSlug, managedAgentRoute } from "@/lib/managed-agents";

// Non-terminal rows 401 with bearer_required until the Firebase client
// hydrates — retry silently (same pattern as the checkout form's submit).
const MAX_BEARER_RETRIES = 10;
const BEARER_RETRY_DELAY_MS = 1500;

// One run's page: the observance view. Deep-linkable; terminal runs render
// as receipt pages (the observer skips polling on terminal statuses).
export default function ManagedAgentRunPage() {
  const { slug, checkoutId } = useParams<{ slug: string; checkoutId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const runtime = useMemo(() => runtimeFromSlug(slug), [slug]);

  const [checkout, setCheckout] = useState<AgentCheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  const fetchRun = useCallback(async () => {
    if (!runtime) return;
    try {
      for (let attempt = 0; attempt <= MAX_BEARER_RETRIES; attempt++) {
        const res = await authFetch(`/api/v1/managed-agents/checkouts/${checkoutId}`);
        if (cancelledRef.current) return;
        if (res.ok) {
          setCheckout((await res.json()) as AgentCheckoutData);
          return;
        }
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (body.error === "bearer_required" && attempt < MAX_BEARER_RETRIES) {
          await new Promise((r) => setTimeout(r, BEARER_RETRY_DELAY_MS));
          continue;
        }
        return; // not found / other error → notFound state
      }
    } catch {} finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [runtime, checkoutId]);

  useEffect(() => {
    cancelledRef.current = false;
    if (user && runtime) fetchRun();
    return () => {
      cancelledRef.current = true;
    };
  }, [user, runtime, fetchRun]);

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

  const agentPath = managedAgentRoute(runtime);

  if (loading || !checkout) {
    return (
      <CardDetailShell
        loading={loading}
        notFound={!loading && !checkout}
        backHref={agentPath}
        backLabel={MANAGED_AGENT_RUNTIMES[runtime].displayName}
        notFoundLabel="Run not found."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <CheckoutObserver checkout={checkout} onExit={() => router.push(agentPath)} />
    </div>
  );
}
