import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { createManagedAgentCheckoutSchema } from "@/shared/schema";
import { startCheckout } from "@/features/managed-agents/crossmint-checkout/service";
import { mapAgentCheckoutError, authorizeAgentCheckoutRequest } from "@/features/managed-agents/crossmint-checkout/api-errors";
import { serializeAgentCheckout } from "@/features/managed-agents/crossmint-checkout/serialize";
import { CROSSMINT_CHECKOUT_RUNTIME } from "@/lib/managed-agents";

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

  const parsed = createManagedAgentCheckoutSchema.safeParse(body);
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

  const [rows, managed] = await Promise.all([
    storage.getManagedAgentCheckoutsByOwnerUid(auth.user.uid),
    storage.getManagedAgent(auth.user.uid, CROSSMINT_CHECKOUT_RUNTIME),
  ]);
  // Null-safe: no managed_agents row yet → no default set. (The row is created
  // on the first checkout or the first default-card PATCH.)
  return NextResponse.json({
    checkouts: rows.map(serializeAgentCheckout),
    default_card_id: managed?.defaultCardId ?? null,
  });
}
