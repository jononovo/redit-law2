import "server-only";
import { crossmintCardsFetch, unwrapCrossmint } from "./client";

export interface CrossmintAgentMetadata {
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface CrossmintAgent {
  agentId: string;
  metadata: CrossmintAgentMetadata;
}

/**
 * Create a Crossmint agent for the caller (identified by the JWT's `sub`).
 * One-per-owner in our model (Crossmint docs: "typically one agent per user").
 * JWT-only — server-key + userLocator is rejected with 403.
 */
export async function createAgent(params: {
  jwt: string;
  name: string;
  description?: string;
}): Promise<CrossmintAgent> {
  const res = await crossmintCardsFetch(`/agents`, {
    method: "POST",
    jwt: params.jwt,
    body: {
      metadata: {
        name: params.name,
        ...(params.description ? { description: params.description } : {}),
      },
    },
  });
  return unwrapCrossmint<CrossmintAgent>(res, "createAgent");
}
