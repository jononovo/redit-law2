import "server-only";

export function getRail3BaseUrl(): string {
  return process.env.CROSSMINT_ENV === "staging"
    ? "https://staging.crossmint.com/api/unstable"
    : "https://www.crossmint.com/api/unstable";
}

export function getRail3ServerApiKey(): string {
  const key = process.env.CROSSMINT_SERVER_API_KEY;
  if (!key) throw new Error("CROSSMINT_SERVER_API_KEY is required for Rail 3 (Card Permissions)");
  return key;
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
