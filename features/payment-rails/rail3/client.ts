import "server-only";
import { CROSSMINT_HOST, CROSSMINT_SERVER_API_KEY } from "@/features/payment-rails/crossmint-env";

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
  userLocator?: string;
  headers?: Record<string, string>;
}

export async function crossmintCardsFetch(
  path: string,
  options: CrossmintCardsFetchOptions = {},
): Promise<Response> {
  const { method = "GET", body, userLocator, headers = {} } = options;

  let url = `${getRail3BaseUrl()}${path}`;
  if (userLocator) {
    const sep = path.includes("?") ? "&" : "?";
    url += `${sep}userLocator=${encodeURIComponent(userLocator)}`;
  }

  return fetch(url, {
    method,
    headers: {
      "X-API-KEY": getRail3ServerApiKey(),
      "Content-Type": "application/json",
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
