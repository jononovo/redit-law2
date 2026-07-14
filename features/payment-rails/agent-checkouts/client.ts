import "server-only";
import {
  RAIL3_CROSSMINT_HOST,
  RAIL3_CROSSMINT_CLIENT_ORIGIN,
  AGENT_CHECKOUT_CROSSMINT_CLIENT_KEY,
} from "@/features/payment-rails/crossmint-env";
import { unwrapCrossmint, CrossmintApiError } from "@/features/payment-rails/rail3/client";

export { unwrapCrossmint, CrossmintApiError };

// Crossmint Agent Checkouts — https://docs.crossmint.com/agents/agent-checkouts-quickstart
// Same host + origin lock as Rail 3, but a dedicated client key scoped to
// agent-checkouts + buyer-profiles. All endpoints require BOTH the client key
// and the owner's Firebase ID token (Bearer) — no server-key mode exists.
function getAgentCheckoutsBaseUrl(): string {
  return `${RAIL3_CROSSMINT_HOST}/api/unstable/agent-checkouts`;
}

function getAgentCheckoutsClientKey(): string {
  if (!AGENT_CHECKOUT_CROSSMINT_CLIENT_KEY) {
    throw new Error("CROSSMINT_AGENT_CHECKOUT_CLIENT_KEY is missing — set it in Replit Secrets / .env.local (see features/payment-rails/crossmint-env.ts)");
  }
  return AGENT_CHECKOUT_CROSSMINT_CLIENT_KEY;
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
