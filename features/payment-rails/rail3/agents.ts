import "server-only";
import {
  CROSSMINT_HOST,
  CROSSMINT_CLIENT_API_KEY,
} from "@/features/payment-rails/crossmint-env";
import { unwrapCrossmint } from "./client";

export interface CrossmintAgentMetadata {
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface CrossmintAgent {
  agentId: string;
  metadata: CrossmintAgentMetadata;
}

// Crossmint's `POST /agents` is JWT-only — it rejects the server-key +
// userLocator path with 403 ("requires a 'client'-side API key"). Same
// constraint as agentic-enrollment, so we mirror that pattern: client key
// as X-API-KEY + caller's Firebase ID token as Authorization: Bearer.
// The JWT's `sub` scopes the agent to the owner; no userLocator needed.
function agentsHeaders(jwt: string): Record<string, string> {
  if (!CROSSMINT_CLIENT_API_KEY) {
    throw new Error("Crossmint client API key is missing — set the env var referenced in features/payment-rails/crossmint-env.ts");
  }
  return {
    "X-API-KEY": CROSSMINT_CLIENT_API_KEY,
    "Authorization": `Bearer ${jwt}`,
    "Content-Type": "application/json",
  };
}

/**
 * Create a Crossmint agent for the caller (identified by the JWT's `sub`).
 * One-per-owner in our model (Crossmint docs: "typically one agent per user").
 */
export async function createAgent(params: {
  jwt: string;
  name: string;
  description?: string;
}): Promise<CrossmintAgent> {
  const res = await fetch(`${CROSSMINT_HOST}/api/unstable/agents`, {
    method: "POST",
    headers: agentsHeaders(params.jwt),
    body: JSON.stringify({
      metadata: {
        name: params.name,
        ...(params.description ? { description: params.description } : {}),
      },
    }),
  });
  return unwrapCrossmint<CrossmintAgent>(res, "createAgent");
}
