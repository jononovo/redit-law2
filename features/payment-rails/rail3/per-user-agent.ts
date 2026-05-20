import "server-only";
import { createAgent } from "./agents";

// Provision a Crossmint agent for an owner. One-per-owner in our model
// (Crossmint docs: "typically one agent per user"). Pure Crossmint side —
// DB persistence lives in storage.insertRail3AgentIfAbsent.
export async function provisionAgentForOwner(params: {
  userLocator: string;
  ownerEmail: string | null;
}): Promise<{ agentId: string }> {
  const name = params.ownerEmail
    ? `CreditClaw Agent — ${params.ownerEmail}`
    : `CreditClaw Agent`;
  const created = await createAgent({
    userLocator: params.userLocator,
    name,
  });
  return { agentId: created.agentId };
}
