const DEFAULT_API_BASE = "https://creditclaw.com/api/v1";

export interface KeyMaterial {
  key_hex: string;
  iv_hex: string;
  tag_hex: string;
}

export interface ApiError {
  error: string;
  message: string;
}

export async function getDecryptionKey(
  checkoutId: string,
  apiKey: string,
  apiBase: string = DEFAULT_API_BASE
): Promise<KeyMaterial> {
  const res = await fetch(`${apiBase}/bot/rail5/key`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ checkout_id: checkoutId }),
  });

  if (!res.ok) {
    let detail: ApiError;
    try {
      detail = (await res.json()) as ApiError;
    } catch {
      detail = { error: "unknown", message: `HTTP ${res.status}` };
    }

    if (res.status === 409) {
      throw new Error(`Key already delivered for checkout ${checkoutId}. Start a new checkout to retry.`);
    }
    if (res.status === 403) {
      throw new Error("Checkout not approved or does not belong to this bot.");
    }
    throw new Error(`Key retrieval failed with status ${res.status}. Check that the checkout_id is valid and approved.`);
  }

  return (await res.json()) as KeyMaterial;
}
