import { NextRequest, NextResponse } from "next/server";
import { syncCheckout, cancelCheckout } from "@/features/payment-rails/agent-checkouts/service";
import { mapAgentCheckoutError, authorizeAgentCheckoutRequest } from "@/features/payment-rails/agent-checkouts/api-errors";
import { serializeAgentCheckout } from "@/features/payment-rails/agent-checkouts/serialize";
import { isTerminalAgentCheckoutStatus } from "@/lib/agent-checkouts";

// Poll/sync one checkout. Non-terminal syncs proxy a Crossmint status fetch
// and auto-answer the card user-action server-side (card data never reaches
// the browser). Non-card user actions are returned for the UI to render.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ checkoutId: string }> }
) {
  const { checkoutId } = await params;
  const auth = await authorizeAgentCheckoutRequest(request, { checkoutId });
  if (auth instanceof NextResponse) return auth;
  const row = auth.row!;

  if (isTerminalAgentCheckoutStatus(row.status)) {
    return NextResponse.json({ ...serializeAgentCheckout(row), pending_user_action: null });
  }

  if (!auth.jwt) {
    // Cookie-authenticated but Firebase client not hydrated yet — the poller
    // silently retries (see plan doc: user-present auth caveat).
    return NextResponse.json(
      { error: "bearer_required", message: "Sign-in is still completing — retry in a moment." },
      { status: 401 }
    );
  }

  try {
    const result = await syncCheckout(row, auth.jwt);
    return NextResponse.json({
      ...serializeAgentCheckout(result.row),
      pending_user_action: result.pendingUserAction
        ? {
            id: result.pendingUserAction.id,
            response_schema: result.pendingUserAction.responseSchema ?? null,
            expires_at: result.pendingUserAction.expiresAt ?? null,
            card_action_unmappable: result.cardActionUnmappable,
          }
        : null,
    });
  } catch (err) {
    return mapAgentCheckoutError(err, "sync");
  }
}

// Cancel a running checkout. Terminal rows are returned untouched — a stale
// tab's cancel must never overwrite a completed (charged) purchase.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ checkoutId: string }> }
) {
  const { checkoutId } = await params;
  const auth = await authorizeAgentCheckoutRequest(request, { checkoutId, requireJwt: true });
  if (auth instanceof NextResponse) return auth;
  const row = auth.row!;

  if (isTerminalAgentCheckoutStatus(row.status)) {
    return NextResponse.json(serializeAgentCheckout(row));
  }

  try {
    const updated = await cancelCheckout(row, auth.jwt!);
    return NextResponse.json(serializeAgentCheckout(updated));
  } catch (err) {
    return mapAgentCheckoutError(err, "cancel");
  }
}
