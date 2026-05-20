import "server-only";
import { createAgent } from "./agents";

// Provision a Crossmint agent for an owner. One-per-owner in our model
// (Crossmint docs: "typically one agent per user"). Pure Crossmint side —
// DB persistence lives in storage.insertRail3AgentIfAbsent.
// Requires the caller's Firebase ID token: `/agents` is JWT-only on
// Crossmint's side (see agents.ts for the constraint).
export async function provisionAgentForOwner(params: {
  jwt: string;
  ownerEmail: string | null;
}): Promise<{ agentId: string }> {
  const name = params.ownerEmail
    ? `CreditClaw Agent — ${params.ownerEmail}`
    : `CreditClaw Agent`;
  const created = await createAgent({
    jwt: params.jwt,
    name,
  });
  return { agentId: created.agentId };
}
