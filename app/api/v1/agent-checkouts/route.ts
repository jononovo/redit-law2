import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { createAgentCheckoutSchema } from "@/shared/schema";
import { startCheckout } from "@/features/payment-rails/agent-checkouts/service";
import { mapAgentCheckoutError, authorizeAgentCheckoutRequest } from "@/features/payment-rails/agent-checkouts/api-errors";
import { serializeAgentCheckout } from "@/features/payment-rails/agent-checkouts/serialize";

// Start an in-house agent checkout (owner-present; Firebase JWT relayed to Crossmint).
export async function POST(request: NextRequest) {
  const auth = await authorizeAgentCheckoutRequest(request, { requireJwt: true });
  if (auth instanceof NextResponse) return auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = createAgentCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const row = await startCheckout({
      ownerUid: auth.user.uid,
      ownerEmail: auth.user.email || "",
      jwt: auth.jwt!,
      input: parsed.data,
    });
    return NextResponse.json(serializeAgentCheckout(row), { status: 201 });
  } catch (err) {
    return mapAgentCheckoutError(err, "start");
  }
}

// List the owner's checkouts (history panel) + their default-card preference.
export async function GET(request: NextRequest) {
  const auth = await authorizeAgentCheckoutRequest(request);
  if (auth instanceof NextResponse) return auth;

  const [rows, owner] = await Promise.all([
    storage.getAgentCheckoutsByOwnerUid(auth.user.uid),
    storage.getOwnerByUid(auth.user.uid),
  ]);
  return NextResponse.json({
    checkouts: rows.map(serializeAgentCheckout),
    default_card_id: owner?.defaultAgentCheckoutCardId ?? null,
  });
}
