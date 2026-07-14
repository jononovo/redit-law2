// Managed agents — remote runtimes CreditClaw orchestrates on the owner's
// behalf (vs user-linked bots, which hold an API key and call us inbound).
// One managed agent per (owner, runtime); the invariant lives on the
// managed_agents table. See project_knowledge/internal_docs/04-payment-tools/managed-agents/.

export const MANAGED_BOT_TYPE = "managed";
// The managed-agents index page. (The former marketing page at this URL moved
// to /managed-payment-agents — owner decision 2026-07-14.)
export const MANAGED_AGENTS_ROUTE = "/managed-agents";

// Architecture: the set of runtimes. Add a value here + its runtime code when
// a new managed agent (e.g. a self-hosted master agent) ships.
export type ManagedRuntime = "crossmint-checkout";

export const CROSSMINT_CHECKOUT_RUNTIME: ManagedRuntime = "crossmint-checkout";

// Branding lives here as data, never as an identifier — nothing routes or
// discriminates on displayName. `slug` is the agent's URL identity
// (/managed-agents/<slug>), owner-picked; the runtime id stays the DB key.
export const MANAGED_AGENT_RUNTIMES: Record<ManagedRuntime, { slug: string; displayName: string; description: string }> = {
  "crossmint-checkout": {
    slug: "jennifer",
    displayName: "Jennifer",
    description:
      "Jennifer — your concierge shopping agent. Give her a product link and she buys it with one of your virtual cards while you watch and stay in the loop.",
  },
};

export function runtimeFromSlug(slug: string): ManagedRuntime | null {
  for (const [runtime, entry] of Object.entries(MANAGED_AGENT_RUNTIMES)) {
    if (entry.slug === slug) return runtime as ManagedRuntime;
  }
  return null;
}

export function isManagedRuntime(value: string): value is ManagedRuntime {
  return value in MANAGED_AGENT_RUNTIMES;
}

export function managedAgentRoute(runtime: ManagedRuntime): string {
  return `${MANAGED_AGENTS_ROUTE}/${MANAGED_AGENT_RUNTIMES[runtime].slug}`;
}
