import { NextResponse } from "next/server";
import { z } from "zod";
import { withBotApi } from "@/features/platform-management/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { fetchOneTimeCredentials, CrossmintApiError } from "@/features/payment-rails/rail3";
import { evaluateMasterGuardrails } from "@/features/agent-interaction/guardrails/master";
import { getFreshIdToken, ReauthRequiredError, TokenExchangeTransientError } from "@/features/platform-management/auth/firebase-token-exchange";

// Agent mint-on-request: the agent asks for fresh card numbers for its linked
// card right before a purchase — no transaction record, no merchant commitment
// required (defaults to a generic descriptor). Mints headless via the owner's
// stored refresh token, saves the numbers on the card row, and returns them.
// For a full tracked checkout (transaction + confirm flow) use
// POST /api/v1/bot/rail3/checkout instead.
const bodySchema = z.object({
  merchant: z
    .object({
      name: z.string().min(1).max(200),
      url: z.string().url(),
      country_code: z.string().length(2),
    })
    .optional(),
});

export const POST = withBotApi("/api/v1/bot/rail3/cards/[cardId]/credentials", async (request, { bot }) => {
  // withBotApi's handler context has no route params — extract from the path,
  // same pattern as /api/v1/bot/checkout-pages/[id].
  const segments = new URL(request.url).pathname.split("/");
  const cardId = segments[segments.length - 2];
  if (!cardId || cardId === "cards") return NextResponse.json({ error: "card_id_required" }, { status: 400 });

  const card = await storage.getRail3CardByCardId(cardId);
  if (!card) return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  // A null card.botId (vault-only card) is forbidden to every agent until the owner links one.
  if (card.botId !== bot.botId) {
    return NextResponse.json({ error: "card_not_linked", message: "This card is not linked to your agent." }, { status: 403 });
  }
  if (card.isFrozen) {
    return NextResponse.json({ error: "card_frozen", message: "Card is frozen by the owner." }, { status: 403 });
  }
  if (card.status !== "active") {
    return NextResponse.json({ error: "card_not_active", message: `Card status is "${card.status}".` }, { status: 403 });
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
    return NextResponse.json({ error: "validation_error", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Amount is unknown at mint time (Crossmint enforces limits via mandates at the
  // network level), but an owner-paused account must not be able to pull numbers.
  const masterDecision = await evaluateMasterGuardrails(card.ownerUid, 0);
  if (masterDecision.action === "block") {
    return NextResponse.json({ error: "master_guardrail", message: masterDecision.reason }, { status: 403 });
  }

  let ownerIdToken: string;
  try {
    ownerIdToken = await getFreshIdToken(card.ownerUid);
  } catch (err) {
    if (err instanceof ReauthRequiredError) {
      return NextResponse.json(
        { error: "reauth_required", message: "Owner must sign in to enable autonomous purchases." },
        { status: 412 },
      );
    }
    if (err instanceof TokenExchangeTransientError) {
      return NextResponse.json(
        { error: "auth_transient", message: "Temporary auth-provider issue; retry shortly." },
        { status: 503 },
      );
    }
    throw err;
  }

  const merchant = parsed.data.merchant
    ? {
        name: parsed.data.merchant.name,
        url: parsed.data.merchant.url,
        countryCode: parsed.data.merchant.country_code.toUpperCase(),
      }
    : { name: card.cardName, url: "https://creditclaw.com", countryCode: "US" };

  let creds;
  try {
    creds = await fetchOneTimeCredentials({ jwt: ownerIdToken, orderIntentId: card.orderIntentId, merchant });
  } catch (err) {
    const status = err instanceof CrossmintApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "credential_mint_failed";
    console.error(`[Rail3] Agent mint-on-request failed for ${cardId}:`, message);
    if (message.toLowerCase().includes("expired")) {
      return NextResponse.json(
        { error: "card_expired", message: "This card's permission has expired — ask the owner for a new virtual card." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "credential_mint_failed", message }, { status });
  }

  await storage.updateRail3Card(cardId, {
    cardNumber: creds.card.number,
    cardExpirationMonth: creds.card.expirationMonth,
    cardExpirationYear: creds.card.expirationYear,
    cardCvc: creds.card.cvc,
    credentialExpiresAt: creds.expiresAt ? new Date(creds.expiresAt) : null,
    credentialMerchant: merchant,
    credentialFetchedAt: new Date(),
    lastUsedAt: new Date(),
  });

  const pm = await storage.getRail3PaymentMethodById(card.paymentMethodId);

  return NextResponse.json({
    card_id: cardId,
    card_number: creds.card.number,
    exp_month: creds.card.expirationMonth,
    exp_year: creds.card.expirationYear,
    cvc: creds.card.cvc,
    cardholder_name: pm?.cardholderName || null,
    credential_expires_at: creds.expiresAt ?? null,
    credential_merchant: merchant,
    usage_notes: [
      "Mint fresh numbers immediately before each purchase — do not cache these across purchases.",
      `Minted with merchant descriptor ${merchant.name} (${merchant.url}). Pass a merchant body matching the real merchant for best acceptance.`,
      "For a tracked checkout with confirm flow, use POST /api/v1/bot/rail3/checkout instead.",
    ],
  });
});
