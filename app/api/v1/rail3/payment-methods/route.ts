import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { rail3SavePaymentMethodSchema } from "@/shared/schema";
import { lookupIssuer } from "@/features/payment-rails/card/bin-lookup";
import {
  listPaymentMethods,
  mapCrossmintPmToDbColumns,
  ownerUidToUserLocator,
  type CrossmintPaymentMethod,
} from "@/features/payment-rails/rail3";

/**
 * Reconcile our `rail3_payment_methods` rows against Crossmint's authoritative
 * `listPaymentMethods` response: insert PMs that exist on Crossmint but not in
 * our DB (covers PMs created outside our wizard) and update existing rows with
 * any fields the client never sent (funding type, billing, image, source token,
 * default flag). One Crossmint call per call site; owners typically have <10 PMs.
 * Logs and continues on Crossmint failure — list endpoint still serves stale row.
 */
async function reconcileOwnerPaymentMethodsWithCrossmint(ownerUid: string) {
  let remotePms: CrossmintPaymentMethod[];
  try {
    remotePms = await listPaymentMethods({ userLocator: ownerUidToUserLocator(ownerUid) });
  } catch (err) {
    console.error("[rail3] listPaymentMethods failed during reconcile:", err);
    return;
  }

  for (const pm of remotePms) {
    const columns = mapCrossmintPmToDbColumns(pm);
    const existing = await storage.getRail3PaymentMethodById(pm.paymentMethodId);
    if (!existing) {
      await storage.createRail3PaymentMethod({
        ...columns,
        paymentMethodId: pm.paymentMethodId,
        ownerUid,
        status: "active",
      });
    } else if (existing.ownerUid === ownerUid) {
      await storage.updateRail3PaymentMethod(pm.paymentMethodId, columns);
    }
  }
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await reconcileOwnerPaymentMethodsWithCrossmint(user.uid);

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
      card_first6: p.cardFirst6 || null,
      issuer_name: p.cardFirst6 ? (lookupIssuer(p.cardFirst6) || null) : null,
      cardholder_name: p.cardholderName,
      exp_month: p.expMonth,
      exp_year: p.expYear,
      funding_type: p.fundingType,
      is_default: p.isDefault,
      display_image_url: p.displayImageUrl,
      billing_address: p.billingAddress,
      billing_phone: p.billingPhone,
      virtual_card_count: cardCounts.get(p.paymentMethodId) || 0,
      created_at: p.createdAt.toISOString(),
      last_used_at: p.lastUsedAt?.toISOString() || null,
    })),
  });
}

// Save (or refresh) a Crossmint-vaulted payment method. Called by the wizard
// after the SDK emits a payment-method-selected event. We trust only
// `payment_method_id` from the client — everything else (funding type,
// billing, source token, default flag) is pulled server-side from Crossmint's
// listPaymentMethods so we can't be fed bogus display data.
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

  const paymentMethodId = parsed.data.payment_method_id;

  // Look the PM up on Crossmint and pull the full record. If it isn't there,
  // there's nothing for us to save — fail loudly rather than persist a stub.
  let remotePms: CrossmintPaymentMethod[];
  try {
    remotePms = await listPaymentMethods({ userLocator: ownerUidToUserLocator(user.uid) });
  } catch (err) {
    console.error("[rail3] listPaymentMethods failed during save:", err);
    return NextResponse.json({ error: "crossmint_lookup_failed" }, { status: 502 });
  }
  const remote = remotePms.find((p) => p.paymentMethodId === paymentMethodId);
  if (!remote) {
    return NextResponse.json(
      { error: "payment_method_not_on_crossmint", message: "Crossmint does not have this payment method for this owner." },
      { status: 404 }
    );
  }

  const columns = mapCrossmintPmToDbColumns(remote);

  const existing = await storage.getRail3PaymentMethodById(paymentMethodId);
  if (existing) {
    if (existing.ownerUid !== user.uid) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const updated = await storage.updateRail3PaymentMethod(paymentMethodId, columns);
    return NextResponse.json({
      payment_method_id: updated!.paymentMethodId,
      refreshed: true,
    });
  }

  const pm = await storage.createRail3PaymentMethod({
    ...columns,
    paymentMethodId,
    ownerUid: user.uid,
    status: "active",
  });

  return NextResponse.json({ payment_method_id: pm.paymentMethodId });
}
