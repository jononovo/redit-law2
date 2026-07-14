import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { submitUserAction } from "@/features/payment-rails/agent-checkouts/service";
import { mapAgentCheckoutError, authorizeAgentCheckoutRequest } from "@/features/payment-rails/agent-checkouts/api-errors";
import { serializeAgentCheckout } from "@/features/payment-rails/agent-checkouts/serialize";

const bodySchema = z.object({
  values: z.record(z.string(), z.unknown()),
});

// Answer a non-card user action (OTP, choices, questions) on behalf of the owner.
// Card actions never reach this route — the sync handler answers those server-side,
// and the service rejects card-shaped actions submitted here.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ checkoutId: string; actionId: string }> }
) {
  const { checkoutId, actionId } = await params;
  const auth = await authorizeAgentCheckoutRequest(request, { checkoutId, requireJwt: true });
  if (auth instanceof NextResponse) return auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const updated = await submitUserAction(auth.row!, auth.jwt!, actionId, parsed.data.values);
    return NextResponse.json(serializeAgentCheckout(updated));
  } catch (err) {
    return mapAgentCheckoutError(err, "action");
  }
}
