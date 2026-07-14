import "server-only";
import {
  RAIL3_CROSSMINT_HOST,
  RAIL3_CROSSMINT_CLIENT_API_KEY,
  RAIL3_CROSSMINT_CLIENT_ORIGIN,
} from "@/features/payment-rails/crossmint-env";
import { unwrapCrossmint, CrossmintApiError } from "@/features/payment-rails/rail3/client";

export { unwrapCrossmint, CrossmintApiError };

// Crossmint Agent Checkouts — https://docs.crossmint.com/agents/agent-checkouts-quickstart
// Reuses the Rail 3 production client key (NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY) which
// has agent-checkouts + buyer-profiles scopes enabled. All endpoints require BOTH the
// client key and the owner's Firebase ID token (Bearer) — no server-key mode exists.
function getAgentCheckoutsBaseUrl(): string {
  return `${RAIL3_CROSSMINT_HOST}/api/unstable/agent-checkouts`;
}

function getAgentCheckoutsClientKey(): string {
  if (!RAIL3_CROSSMINT_CLIENT_API_KEY) {
    throw new Error("NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY is missing");
  }
  return RAIL3_CROSSMINT_CLIENT_API_KEY;
}

export interface AgentCheckoutsFetchOptions {
  jwt: string;
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
}

export async function agentCheckoutsFetch(path: string, options: AgentCheckoutsFetchOptions): Promise<Response> {
  const { jwt, method = "GET", body } = options;

  return fetch(`${getAgentCheckoutsBaseUrl()}${path}`, {
    method,
    headers: {
      "X-API-KEY": getAgentCheckoutsClientKey(),
      "Authorization": `Bearer ${jwt}`,
      "Origin": RAIL3_CROSSMINT_CLIENT_ORIGIN,
      "Content-Type": "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
