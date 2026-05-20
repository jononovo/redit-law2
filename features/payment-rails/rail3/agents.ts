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
 * Create a Crossmint agent for the given owner.
 * One-per-owner in our model (Crossmint docs: "typically one agent per user").
 */
export async function createAgent(params: {
  userLocator: string;
  name: string;
  description?: string;
}): Promise<CrossmintAgent> {
  const res = await crossmintCardsFetch(`/agents`, {
    method: "POST",
    userLocator: params.userLocator,
    body: {
      metadata: {
        name: params.name,
        ...(params.description ? { description: params.description } : {}),
      },
    },
  });
  return unwrapCrossmint<CrossmintAgent>(res, "createAgent");
}
