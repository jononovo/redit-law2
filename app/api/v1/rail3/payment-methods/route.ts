import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { rail3SavePaymentMethodSchema } from "@/shared/schema";
import { lookupIssuer } from "@/features/payment-rails/card/bin-lookup";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const pms = await storage.getRail3PaymentMethodsByOwnerUid(user.uid);
  const cards = await storage.getRail3CardsByOwnerUid(user.uid);
  const cardCounts = new Map<string, number>();
  for (const c of cards) {
    cardCounts.set(c.paymentMethodId, (cardCounts.get(c.paymentMethodId) || 0) + 1);
  }

  return NextResponse.json({
    payment_methods: pms.map((p) => ({
      payment_method_id: p.paymentMethodId,
      card_brand: p.cardBrand,
      card_last4: p.cardLast4,
      issuer_name: p.cardFirst6 ? (lookupIssuer(p.cardFirst6) || null) : null,
      cardholder_name: p.cardholderName,
      exp_month: p.expMonth,
      exp_year: p.expYear,
      virtual_card_count: cardCounts.get(p.paymentMethodId) || 0,
      created_at: p.createdAt.toISOString(),
      last_used_at: p.lastUsedAt?.toISOString() || null,
    })),
  });
}

// Save a Crossmint-vaulted payment method. Called by the wizard after the SDK
// emits a payment-method-selected event with the newly-created paymentMethodId.
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const parsed = rail3SavePaymentMethodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await storage.getRail3PaymentMethodById(parsed.data.payment_method_id);
  if (existing) {
    if (existing.ownerUid !== user.uid) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({
      payment_method_id: existing.paymentMethodId,
      already_saved: true,
    });
  }

  const pm = await storage.createRail3PaymentMethod({
    paymentMethodId: parsed.data.payment_method_id,
    ownerUid: user.uid,
    cardholderName: parsed.data.cardholder_name,
    cardLast4: parsed.data.card_last4,
    cardBrand: parsed.data.card_brand,
    cardFirst6: parsed.data.card_first6 || "",
    expMonth: parsed.data.exp_month,
    expYear: parsed.data.exp_year,
    status: "active",
  });

  return NextResponse.json({ payment_method_id: pm.paymentMethodId });
}
