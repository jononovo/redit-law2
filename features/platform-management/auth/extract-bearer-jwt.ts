import type { NextRequest } from "next/server";

// Pull the Firebase ID token out of an Authorization header set by the
// browser's authFetch helper. Crossmint's client-key + JWT endpoints
// (POST /agents, /order-intents, /payment-methods/:id/agentic-enrollment, etc.)
// need this as `Authorization: Bearer …` — the httpOnly session cookie is a
// Firebase *session cookie*, not an ID token, so it can't be forwarded.
export function extractBearerJwt(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
