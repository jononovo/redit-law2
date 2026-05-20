import "server-only";
import {
  CROSSMINT_HOST,
  CROSSMINT_SERVER_API_KEY,
  CROSSMINT_CLIENT_API_KEY,
} from "@/features/payment-rails/crossmint-env";

export function getRail3BaseUrl(): string {
  return `${CROSSMINT_HOST}/api/unstable`;
}

export function getRail3ServerApiKey(): string {
  if (!CROSSMINT_SERVER_API_KEY) {
    throw new Error("Crossmint server API key is missing — set the env var referenced in features/payment-rails/crossmint-env.ts");
  }
  return CROSSMINT_SERVER_API_KEY;
}

/**
 * Build the `userLocator` query value for a Firebase owner UID.
 * Maps to the `sub` claim Crossmint receives when our BFF acts on behalf of the owner.
 */
export function ownerUidToUserLocator(ownerUid: string): string {
  return `userId:${ownerUid}`;
}

export interface CrossmintCardsFetchOptions {
  method?: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  body?: unknown;
  /**
   * Mutually exclusive auth modes:
   * - `jwt`: client-key + Authorization: Bearer <Firebase ID token>. Required
   *   for the agentic-commerce write endpoints (`/agents`, `/order-intents`,
   *   `/payment-methods/:id/agentic-enrollment`, etc.) which Crossmint
   *   explicitly rejects when called with a server key.
   * - `userLocator`: server-key + ?userLocator=userId:<uid>. Used by the older
   *   read paths that still accept the server-key path.
   * If both are supplied, `jwt` wins. If neither is supplied, the call is
   * made with the server key and no `userLocator` query.
   */
  jwt?: string;
  userLocator?: string;
  headers?: Record<string, string>;
}

export async function crossmintCardsFetch(
  path: string,
  options: CrossmintCardsFetchOptions = {},
): Promise<Response> {
  const { method = "GET", body, jwt, userLocator, headers = {} } = options;

  let url = `${getRail3BaseUrl()}${path}`;

  let apiKey: string;
  const authHeaders: Record<string, string> = {};
  if (jwt) {
    if (!CROSSMINT_CLIENT_API_KEY) {
      throw new Error("Crossmint client API key is missing — set the env var referenced in features/payment-rails/crossmint-env.ts");
    }
    apiKey = CROSSMINT_CLIENT_API_KEY;
    authHeaders["Authorization"] = `Bearer ${jwt}`;
  } else {
    apiKey = getRail3ServerApiKey();
    if (userLocator) {
      const sep = path.includes("?") ? "&" : "?";
      url += `${sep}userLocator=${encodeURIComponent(userLocator)}`;
    }
  }

  return fetch(url, {
    method,
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
      ...authHeaders,
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export class CrossmintApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message);
    this.name = "CrossmintApiError";
  }
}

export async function unwrapCrossmint<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new CrossmintApiError(res.status, body, `${label} failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return res.json() as Promise<T>;
}
