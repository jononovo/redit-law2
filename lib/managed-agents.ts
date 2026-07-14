// Managed agents — remote runtimes CreditClaw orchestrates on the owner's
// behalf (vs user-linked bots, which hold an API key and call us inbound).
// One managed agent per (owner, runtime); the invariant lives on the
// managed_agents table. See project_knowledge/internal_docs/04-payment-tools/managed-agents/.

export const MANAGED_BOT_TYPE = "managed";
// Dashboard surface for the managed agent. NOTE: the public marketing page
// already owns /managed-agents ("Managed Agents" services), so the dashboard
// lives at /agent-checkouts (the crossmint-checkout runtime's surface). Change
// in one place here if the product picks a different URL.
export const MANAGED_AGENTS_ROUTE = "/agent-checkouts";

// Architecture: the set of runtimes. Add a value here + its runtime code when
// a new managed agent (e.g. a self-hosted master agent) ships.
export type ManagedRuntime = "crossmint-checkout";

export const CROSSMINT_CHECKOUT_RUNTIME: ManagedRuntime = "crossmint-checkout";

// Branding lives here as data, never as an identifier. Display names may change
// before public launch (e.g. "Captain Crunch" — Quaker trademark); nothing
// routes or discriminates on them.
export const MANAGED_AGENT_RUNTIMES: Record<ManagedRuntime, { displayName: string; description: string }> = {
  "crossmint-checkout": {
    displayName: "Captain Crunch",
    description:
      "CreditClaw's in-house agent. Give it a product link and it buys it with one of your virtual cards — you watch it work and stay in the loop.",
  },
};
