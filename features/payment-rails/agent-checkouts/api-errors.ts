import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { extractBearerJwt } from "@/features/platform-management/auth/extract-bearer-jwt";
import { storage } from "@/server/storage";
import type { AgentCheckout } from "@/shared/schema";
import { AgentCheckoutError } from "./service";
import { ShippingAddressRequiredError } from "./buyer-profile";
import { CrossmintApiError } from "./client";

// Shared preamble for every agent-checkouts route: session auth, optional
// Bearer JWT (needed only when the route will call Crossmint), and — when a
// checkoutId is given — row lookup + ownership. Returns either the context or
// the NextResponse to send straight back.
type AuthorizedContext = {
  user: { uid: string; email: string | null };
  jwt: string | null;
  row: AgentCheckout | null;
};

export async function authorizeAgentCheckoutRequest(
  request: NextRequest,
  opts: { checkoutId?: string; requireJwt?: boolean } = {},
): Promise<AuthorizedContext | NextResponse> {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const jwt = extractBearerJwt(request);
  if (opts.requireJwt && !jwt) {
    // Cookie-authenticated but Firebase client not hydrated yet — pollers
    // retry silently on this (see plan doc: user-present auth caveat).
    return NextResponse.json(
      { error: "bearer_required", message: "Sign-in is still completing — retry in a moment." },
      { status: 401 }
    );
  }

  let row: AgentCheckout | null = null;
  if (opts.checkoutId) {
    row = await storage.getAgentCheckoutByCheckoutId(opts.checkoutId);
    if (!row || row.ownerUid !== user.uid) {
      return NextResponse.json({ error: "checkout_not_found" }, { status: 404 });
    }
  }

  return { user: { uid: user.uid, email: user.email ?? null }, jwt, row };
}

// Shared error → JSON envelope mapping for all /api/v1/agent-checkouts routes.
export function mapAgentCheckoutError(err: unknown, label: string): NextResponse {
  if (err instanceof AgentCheckoutError) {
    return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
  }
  if (err instanceof ShippingAddressRequiredError) {
    return NextResponse.json(
      { error: "shipping_address_required", message: err.message },
      { status: 422 }
    );
  }
  if (err instanceof CrossmintApiError) {
    console.error(`[AgentCheckout] Crossmint error (${label}):`, err.status, err.body);
    return NextResponse.json(
      { error: "crossmint_error", message: err.message },
      { status: err.status >= 400 && err.status < 600 ? err.status : 502 }
    );
  }
  console.error(`[AgentCheckout] ${label} failed:`, err);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
