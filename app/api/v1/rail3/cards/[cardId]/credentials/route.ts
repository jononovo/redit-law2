import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { extractBearerJwt } from "@/features/platform-management/auth/extract-bearer-jwt";
import { storage } from "@/server/storage";
import { fetchOneTimeCredentials } from "@/features/payment-rails/rail3/credentials";
import { CrossmintApiError } from "@/features/payment-rails/rail3";

// Mint the card numbers for a virtual card and save them on the row.
// Called right after issuance (verification complete) and on demand from the
// card detail page. Merchant is optional — open-mode cards default to a
// generic descriptor.
const bodySchema = z.object({
  merchant: z
    .object({
      name: z.string().min(1).max(200),
      url: z.string().url(),
      country_code: z.string().length(2),
    })
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { cardId } = await params;
  const card = await storage.getRail3CardByCardId(cardId);
  if (!card) return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  if (card.ownerUid !== user.uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (card.status !== "active") {
    return NextResponse.json(
      { error: "card_not_active", message: "Card numbers can only be minted for an active card." },
      { status: 409 }
    );
  }
  if (card.isFrozen) {
    return NextResponse.json({ error: "card_frozen", message: "Unfreeze the card first." }, { status: 409 });
  }

  const jwt = extractBearerJwt(request);
  if (!jwt) {
    return NextResponse.json(
      { error: "bearer_required", message: "Firebase ID token required in Authorization header for Crossmint card operations." },
      { status: 401 }
    );
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
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

  // Crossmint requires a merchant descriptor on every credential mint. When
  // none is given (open-mode cards / issuance-time mint), use a generic one.
  const merchant = parsed.data.merchant
    ? {
        name: parsed.data.merchant.name,
        url: parsed.data.merchant.url,
        countryCode: parsed.data.merchant.country_code.toUpperCase(),
      }
    : { name: card.cardName, url: "https://creditclaw.com", countryCode: "US" };

  let creds;
  try {
    creds = await fetchOneTimeCredentials({ jwt, orderIntentId: card.orderIntentId, merchant });
  } catch (err) {
    const status = err instanceof CrossmintApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "credential_mint_failed";
    console.error(`[Rail3] credential mint failed for ${cardId}:`, message);
    if (message.toLowerCase().includes("expired")) {
      return NextResponse.json(
        { error: "card_expired", message: "This card's permission has expired — create a new virtual card." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "credential_mint_failed", message }, { status });
  }

  const updated = await storage.updateRail3Card(cardId, {
    cardNumber: creds.card.number,
    cardExpirationMonth: creds.card.expirationMonth,
    cardExpirationYear: creds.card.expirationYear,
    cardCvc: creds.card.cvc,
    credentialExpiresAt: creds.expiresAt ? new Date(creds.expiresAt) : null,
    credentialMerchant: merchant,
    credentialFetchedAt: new Date(),
  });

  return NextResponse.json({
    card_id: cardId,
    card_number: creds.card.number,
    card_expiration_month: creds.card.expirationMonth,
    card_expiration_year: creds.card.expirationYear,
    card_cvc: creds.card.cvc,
    credential_expires_at: creds.expiresAt ?? null,
    credential_merchant: merchant,
    credential_fetched_at: updated?.credentialFetchedAt?.toISOString() ?? new Date().toISOString(),
  });
}
