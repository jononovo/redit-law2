"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { authFetch } from "@/features/platform-management/auth-fetch";
import { CardDetailShell } from "@/components/wallet/card-detail-shell";
import { CheckoutForm } from "@/components/managed-agent/checkout-form";
import { MANAGED_AGENT_RUNTIMES, MANAGED_AGENTS_ROUTE, runtimeFromSlug, managedAgentRoute } from "@/lib/managed-agents";

// Start a new checkout for this managed agent. Submitting navigates to the
// run's own page, where the observance view takes over.
export default function NewManagedAgentCheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const runtime = useMemo(() => runtimeFromSlug(slug), [slug]);

  const [defaultCardId, setDefaultCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAgent = useCallback(async () => {
    if (!runtime) return;
    try {
      const res = await authFetch(`/api/v1/managed-agents/${runtime}`);
      if (res.ok) {
        const data = (await res.json()) as { default_card_id?: string | null };
        setDefaultCardId(data.default_card_id ?? null);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    if (user && runtime) fetchAgent();
  }, [user, runtime, fetchAgent]);

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

  return (
    <CardDetailShell
      loading={loading}
      notFound={false}
      backHref={agentPath}
      backLabel={MANAGED_AGENT_RUNTIMES[runtime].displayName}
    >
      <CheckoutForm
        defaultCardId={defaultCardId}
        onStarted={(checkout) => router.push(`${agentPath}/runs/${checkout.checkout_id}`)}
      />
    </CardDetailShell>
  );
}
