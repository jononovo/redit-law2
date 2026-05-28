import { NextResponse } from "next/server";
import { withBotApi } from "@/features/platform-management/agent-management/agent-api/middleware";
import { storage } from "@/server/storage";
import { rail3BotCheckoutSchema } from "@/shared/schema";
import {
  generateRail3TransactionId, fetchOneTimeCredentials, CrossmintApiError,
} from "@/features/payment-rails/rail3";
import { evaluateMasterGuardrails } from "@/features/agent-interaction/guardrails/master";
import { getFreshIdToken, ReauthRequiredError, TokenExchangeTransientError } from "@/features/platform-management/auth/firebase-token-exchange";

export const POST = withBotApi("/api/v1/bot/rail3/checkout", async (request, { bot }) => {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const parsed = rail3BotCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { card_id, merchant } = parsed.data;

  const card = await storage.getRail3CardByCardId(card_id);
  if (!card) return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  // A null card.botId (vault-only card) is forbidden to every bot until the owner links one.
  if (card.botId !== bot.botId) {
    return NextResponse.json({ error: "card_not_linked", message: "This card is not linked to your bot." }, { status: 403 });
  }
  if (card.isFrozen) {
    return NextResponse.json({ error: "card_frozen", message: "Card is frozen by the owner." }, { status: 403 });
  }
  // Lifecycle (= Crossmint orderIntent.phase + terminal owner action). Anything other than
  // "active" means PM enrollment / passkey verification incomplete, or the card is expired/revoked.
  if (card.status !== "active") {
    return NextResponse.json(
      { error: "card_not_active", message: `Card status is "${card.status}".` },
      { status: 403 }
    );
  }

  const pm = await storage.getRail3PaymentMethodById(card.paymentMethodId);
  if (!pm) return NextResponse.json({ error: "payment_method_not_found" }, { status: 404 });

  // Amount is unknown at credential-issuance time (Crossmint enforces per-tx limits at the
  // network level via mandates). We still check the master block flag so an owner-paused account
  // can't pull new credentials.
  const masterDecision = await evaluateMasterGuardrails(card.ownerUid, 0);
  if (masterDecision.action === "block") {
    return NextResponse.json(
      { error: "master_guardrail", message: masterDecision.reason },
      { status: 403 }
    );
  }

  const transactionId = generateRail3TransactionId();

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

  try {
    const { card: credCard, expiresAt } = await fetchOneTimeCredentials({
      jwt: ownerIdToken,
      orderIntentId: card.orderIntentId,
      merchant: { name: merchant.name, url: merchant.url, countryCode: merchant.country_code },
    });

    await storage.createRail3Transaction({
      transactionId,
      cardId: card.cardId,
      ownerUid: card.ownerUid,
      botId: bot.botId,
      orderIntentId: card.orderIntentId,
      merchantName: merchant.name,
      merchantUrl: merchant.url,
      merchantCountry: merchant.country_code,
      status: "credentials_issued",
      credentialIssuedAt: new Date(),
      metadata: { credentialsExpiresAt: expiresAt },
    });

    await storage.updateRail3Card(card.cardId, { lastUsedAt: new Date() });

    // Rail-5-shaped response so the existing OpenClaw fill-card flow plugs in unchanged.
    const checkoutSteps = [
      `Use the card_number, exp_month, exp_year, and cvc returned in this response to fill the checkout form at ${merchant.name} (${merchant.url}).`,
      `Cardholder name: ${pm.cardholderName || "use the cardholder name field below"}.`,
      `If the checkout requires a shipping address, read .creditclaw/shipping.md or call GET /api/v1/bot/shipping-addresses.`,
      `These credentials are merchant-locked to ${merchant.name} and expire at ${expiresAt} — they only work for this one purchase.`,
      `Call POST /api/v1/bot/rail3/confirm with { "transaction_id": "${transactionId}", "amount_cents": <charged_amount> } after the charge clears.`,
      `Discard the card_number and cvc immediately after submitting checkout.`,
    ];
    const spawnPayload = {
      task: [
        "You are a checkout agent. Complete a purchase using a one-time virtual card.",
        "",
        `Merchant: ${merchant.name}`,
        `URL: ${merchant.url}`,
        "",
        "Steps:",
        ...checkoutSteps.map((s, i) => `${i + 1}. ${s}`),
      ].join("\n"),
      cleanup: "Discard all card credentials.",
      runTimeoutSeconds: 600,
      label: `Rail3 checkout at ${merchant.name}`,
    };

    return NextResponse.json({
      approved: true,
      transaction_id: transactionId,
      checkout_id: transactionId,
      card_number: credCard.number,
      exp_month: credCard.expirationMonth,
      exp_year: credCard.expirationYear,
      cvc: credCard.cvc,
      cardholder_name: pm.cardholderName,
      expires_at: expiresAt,
      checkout_steps: checkoutSteps,
      spawn_payload: spawnPayload,
    });
  } catch (err) {
    const status = err instanceof CrossmintApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "credential_fetch_failed";
    console.error("[Rail3] Credential fetch failed:", message);
    return NextResponse.json({ error: "credential_fetch_failed", message }, { status });
  }
});
