import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/server/storage";
import { rail5SubmitKeySchema } from "@/shared/schema";
import { validateKeyMaterial } from "@/lib/rail5";

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = rail5SubmitKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const {
    card_id, key_hex, iv_hex, tag_hex, card_last4, card_brand,
    card_first4, exp_month, exp_year, cardholder_name,
    billing_address, billing_city, billing_state, billing_zip, billing_country,
    spending_limit_cents, daily_limit_cents, monthly_limit_cents,
  } = parsed.data;

  const keyValidation = validateKeyMaterial(key_hex, iv_hex, tag_hex);
  if (!keyValidation.valid) {
    return NextResponse.json({ error: "invalid_key_material", message: keyValidation.error }, { status: 400 });
  }

  const card = await storage.getRail5CardByCardId(card_id);
  if (!card) {
    return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  }

  if (card.ownerUid !== user.uid) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (card.status !== "pending_setup") {
    return NextResponse.json({ error: "key_already_submitted", message: "Card has already been set up." }, { status: 409 });
  }

  const updates: Record<string, unknown> = {
    encryptedKeyHex: key_hex,
    encryptedIvHex: iv_hex,
    encryptedTagHex: tag_hex,
    status: "pending_delivery",
  };

  if (card_last4) updates.cardLast4 = card_last4;
  if (card_brand) updates.cardBrand = card_brand;
  if (card_first4) updates.cardFirst4 = card_first4;
  if (exp_month) updates.expMonth = exp_month;
  if (exp_year) updates.expYear = exp_year;
  if (cardholder_name) updates.cardholderName = cardholder_name;
  if (billing_address) updates.billingAddress = billing_address;
  if (billing_city) updates.billingCity = billing_city;
  if (billing_state) updates.billingState = billing_state;
  if (billing_zip) updates.billingZip = billing_zip;
  if (billing_country) updates.billingCountry = billing_country;

  await storage.updateRail5Card(card_id, updates);

  const guardrailUpdates: Record<string, unknown> = {};
  if (spending_limit_cents !== undefined) guardrailUpdates.maxPerTxCents = spending_limit_cents;
  if (daily_limit_cents !== undefined) guardrailUpdates.dailyBudgetCents = daily_limit_cents;
  if (monthly_limit_cents !== undefined) guardrailUpdates.monthlyBudgetCents = monthly_limit_cents;

  if (Object.keys(guardrailUpdates).length > 0) {
    await storage.upsertRail5Guardrails(card_id, guardrailUpdates);
  }

  return NextResponse.json({ card_id, status: "pending_delivery" });
}
