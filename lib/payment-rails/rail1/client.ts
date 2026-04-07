import { PrivyClient } from "@privy-io/node";
import crypto from "crypto";
import canonicalize from "canonicalize";

function getPrivyAppId(): string {
  return process.env.NEXT_PUBLIC_PRIVY_APP_ID || process.env.PRIVY_APP_ID || "";
}

function getPrivyAppSecret(): string {
  return process.env.PRIVY_APP_SECRET || "";
}

function getPrivyAuthKey(): string {
  return process.env.PRIVY_AUTHORIZATION_KEY || "";
}

let privyClient: PrivyClient | null = null;

export function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    const appId = getPrivyAppId();
    const appSecret = getPrivyAppSecret();
    if (!appId || !appSecret) {
      throw new Error("PRIVY_APP_ID and PRIVY_APP_SECRET are required for Rail 1");
    }
    privyClient = new PrivyClient({ appId, appSecret });
  }
  return privyClient;
}

export function getAuthorizationSignature(url: string, body: object): string {
  const authKey = getPrivyAuthKey();
  if (!authKey) {
    throw new Error("PRIVY_AUTHORIZATION_KEY is required for wallet operations");
  }

  const payload = {
    version: 1,
    method: "POST",
    url,
    body,
    headers: { "privy-app-id": getPrivyAppId() },
  };

  const serializedPayload = canonicalize(payload) as string;
  const serializedPayloadBuffer = Buffer.from(serializedPayload);

  const privateKeyAsString = authKey.replace("wallet-auth:", "");
  const privateKeyAsPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyAsString}\n-----END PRIVATE KEY-----`;
  const privateKey = crypto.createPrivateKey({
    key: privateKeyAsPem,
    format: "pem",
  });

  const signature = crypto.sign(null, serializedPayloadBuffer, privateKey);
  return signature.toString("base64");
}

export { getPrivyAppId, getPrivyAppSecret };
