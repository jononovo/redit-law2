import "server-only";
import { storage } from "@/server/storage";

export class ReauthRequiredError extends Error {
  constructor(public ownerUid: string, public reason: string) {
    super(`Reauth required for owner ${ownerUid}: ${reason}`);
    this.name = "ReauthRequiredError";
  }
}

export class TokenExchangeTransientError extends Error {
  constructor(public ownerUid: string, public status: number, public detail: string) {
    super(`Transient token exchange failure for owner ${ownerUid} (status=${status}): ${detail}`);
    this.name = "TokenExchangeTransientError";
  }
}

// Google Identity Toolkit error codes that mean the refresh token itself is
// unusable and the owner must sign in again. Anything else (5xx, 429, network)
// is treated as transient — we keep the token and let the caller retry later.
const REAUTH_ERROR_CODES = new Set([
  "INVALID_REFRESH_TOKEN",
  "TOKEN_EXPIRED",
  "USER_DISABLED",
  "USER_NOT_FOUND",
  "INVALID_GRANT_TYPE",
  "MISSING_REFRESH_TOKEN",
]);

interface CachedToken {
  idToken: string;
  expiresAt: number;
}

const cache = new Map<string, CachedToken>();

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

interface GoogleTokenResponse {
  id_token: string;
  refresh_token?: string;
  expires_in: string;
}

/**
 * Mint a fresh Firebase ID token for the given owner, using their stored
 * refresh token. Cached in-process for ~55 minutes per owner so back-to-back
 * bot purchases don't hammer Google's token endpoint.
 *
 * Throws ReauthRequiredError if no refresh token is on file or Google rejects
 * the exchange. Callers should surface this as 412 to the bot.
 */
export async function getFreshIdToken(ownerUid: string): Promise<string> {
  const cached = cache.get(ownerUid);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.idToken;
  }

  if (!FIREBASE_API_KEY) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not set — cannot exchange refresh tokens");
  }

  const refreshToken = await storage.getFirebaseRefreshToken(ownerUid);
  if (!refreshToken) {
    throw new ReauthRequiredError(ownerUid, "no_refresh_token");
  }

  const res = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    },
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({} as any));
    const googleCode: string | undefined = errBody?.error?.message;
    const isReauthClass = googleCode && REAUTH_ERROR_CODES.has(googleCode);

    if (isReauthClass) {
      await storage.clearFirebaseRefreshToken(ownerUid);
      cache.delete(ownerUid);
      throw new ReauthRequiredError(ownerUid, googleCode!);
    }
    // Transient (5xx, 429, network-ish) — keep the token, surface a retryable error.
    throw new TokenExchangeTransientError(ownerUid, res.status, googleCode ?? "unknown");
  }

  const data = (await res.json()) as GoogleTokenResponse;

  // Google occasionally rotates the refresh token; persist if changed.
  if (data.refresh_token && data.refresh_token !== refreshToken) {
    await storage.setFirebaseRefreshToken(ownerUid, data.refresh_token);
  }

  const expiresInSec = Number(data.expires_in);
  const expiresAt = Date.now() + (expiresInSec - 60) * 1000;
  cache.set(ownerUid, { idToken: data.id_token, expiresAt });
  return data.id_token;
}
