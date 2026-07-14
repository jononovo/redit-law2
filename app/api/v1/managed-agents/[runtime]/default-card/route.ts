import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/server/storage";
import { authorizeAgentCheckoutRequest } from "@/features/managed-agents/crossmint-checkout/api-errors";
import { isManagedRuntime } from "@/lib/managed-agents";

const bodySchema = z.object({
  card_id: z.string().min(1).nullable(),
});

// Set (or clear, with null) the managed agent's preferred virtual card.
// Preference only — a per-checkout override in the form never writes this.
// Precedent: PATCH /api/v1/bots/default-rail, shipping-addresses set-default.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ runtime: string }> }
) {
  const { runtime } = await params;
  if (!isManagedRuntime(runtime)) {
    return NextResponse.json({ error: "unknown_runtime" }, { status: 404 });
  }

  const auth = await authorizeAgentCheckoutRequest(request);
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

  const cardId = parsed.data.card_id;
  if (cardId !== null) {
    // Ownership + active only — setting a preference isn't spend, so no
    // guardrail evaluation (unlike the checkout gates).
    const card = await storage.getRail3CardByCardId(cardId);
    if (!card || card.ownerUid !== auth.user.uid) {
      return NextResponse.json({ error: "card_not_found" }, { status: 404 });
    }
    if (card.status !== "active") {
      return NextResponse.json(
        { error: "card_not_active", message: `Card status is "${card.status}".` },
        { status: 403 }
      );
    }
  }

  // Materialize the managed_agents row first (get-or-create) so the write
  // targets an existing row — otherwise the UPDATE would silently no-op and
  // the preference would be lost behind a 200. Needs the owner email for the
  // bot; fall back to the owners record when the JWT email is empty.
  const email = auth.user.email || (await storage.getOwnerByUid(auth.user.uid))?.email;
  if (!email) return NextResponse.json({ error: "owner_email_missing" }, { status: 422 });
  await storage.ensureManagedAgent(auth.user.uid, email, runtime);

  await storage.setManagedAgentDefaultCard(auth.user.uid, runtime, cardId);
  const managed = await storage.getManagedAgent(auth.user.uid, runtime);
  return NextResponse.json({ default_card_id: managed?.defaultCardId ?? null });
}
