import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/server/storage";
import { authorizeAgentCheckoutRequest } from "@/features/payment-rails/agent-checkouts/api-errors";

const bodySchema = z.object({
  card_id: z.string().min(1).nullable(),
});

// Set (or clear, with null) the in-house agent's preferred virtual card.
// Preference only — a per-checkout override in the form never writes this.
// Precedent: PATCH /api/v1/bots/default-rail, shipping-addresses set-default.
export async function PATCH(request: NextRequest) {
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

  await storage.setOwnerDefaultCheckoutCard(auth.user.uid, cardId);
  return NextResponse.json({ default_card_id: cardId });
}
