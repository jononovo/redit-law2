import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import {
  deletePaymentMethod,
  listPaymentMethods,
  mapCrossmintPmToDbColumns,
  ownerUidToUserLocator,
  getEnrollment,
  CrossmintApiError,
} from "@/features/payment-rails/rail3";
import { extractBearerJwt } from "@/features/platform-management/auth/extract-bearer-jwt";
import { lookupIssuer } from "@/features/payment-rails/card/bin-lookup";

// Combined detail: local PM row + per-PM Crossmint reconciliation + linked
// virtual cards + live agentic-enrollment status. One request, everything the
// /real-cards/[id] page needs.
//
// Enrollment is optional (404 = "no enrollment yet, owner can start one"); we
// surface that as `enrollment: null` rather than erroring out the whole page.
// Bearer JWT is also optional — without it, enrollment is skipped instead of
// blocking the whole detail view.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentMethodId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { paymentMethodId } = await params;
  const existing = await storage.getRail3PaymentMethodById(paymentMethodId);
  if (!existing) return NextResponse.json({ error: "payment_method_not_found" }, { status: 404 });
  if (existing.ownerUid !== user.uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Refresh this PM from Crossmint before reading. Explicit failure if
  // Crossmint is unreachable — we don't want to serve stale detail data.
  try {
    const remotePms = await listPaymentMethods({ userLocator: ownerUidToUserLocator(user.uid) });
    const remote = remotePms.find((p) => p.paymentMethodId === paymentMethodId);
    if (remote) {
      await storage.updateRail3PaymentMethod(paymentMethodId, mapCrossmintPmToDbColumns(remote));
    }
  } catch (err) {
    console.error("[rail3] reconcile failed in detail GET:", err);
    return NextResponse.json(
      { error: "crossmint_reconcile_failed", message: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }

  const pm = (await storage.getRail3PaymentMethodById(paymentMethodId))!;
  const linkedCards = await storage.getRail3CardsByPaymentMethodId(paymentMethodId);

  // Best-effort live enrollment lookup.
  let enrollment: unknown | null = null;
  let enrollmentError: string | null = null;
  const jwt = extractBearerJwt(request);
  if (jwt) {
    try {
      enrollment = await getEnrollment({ jwt, paymentMethodId });
    } catch (err) {
      if (err instanceof CrossmintApiError && err.status === 404) {
        enrollment = null;
      } else {
        enrollmentError = err instanceof Error ? err.message : "enrollment_lookup_failed";
      }
    }
  }

  return NextResponse.json({
    payment_method_id: pm.paymentMethodId,
    card_brand: pm.cardBrand,
    card_last4: pm.cardLast4,
    card_first6: pm.cardFirst6 || null,
    issuer_name: pm.cardFirst6 ? (lookupIssuer(pm.cardFirst6) || null) : null,
    cardholder_name: pm.cardholderName,
    exp_month: pm.expMonth,
    exp_year: pm.expYear,
    funding_type: pm.fundingType,
    is_default: pm.isDefault,
    display_image_url: pm.displayImageUrl,
    billing_address: pm.billingAddress,
    billing_phone: pm.billingPhone,
    source_token_id: pm.sourceTokenId,
    network_token_id: pm.networkTokenId,
    created_at: pm.createdAt.toISOString(),
    last_used_at: pm.lastUsedAt?.toISOString() || null,
    enrollment,
    enrollment_error: enrollmentError,
    virtual_cards: linkedCards.map((c) => ({
      card_id: c.cardId,
      card_name: c.cardName,
      status: c.status,
      is_frozen: c.isFrozen,
      intent_mode: c.intentMode,
      limit_amount_cents: c.limitAmountCents,
      limit_period: c.limitPeriod,
      bot_id: c.botId,
      created_at: c.createdAt.toISOString(),
    })),
  });
}

// Remove a saved real card. Blocked if any virtual cards still reference it.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ paymentMethodId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { paymentMethodId } = await params;
  const pm = await storage.getRail3PaymentMethodById(paymentMethodId);
  if (!pm) return NextResponse.json({ error: "payment_method_not_found" }, { status: 404 });
  if (pm.ownerUid !== user.uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const cards = await storage.getRail3CardsByPaymentMethodId(paymentMethodId);
  if (cards.length > 0) {
    return NextResponse.json(
      {
        error: "has_virtual_cards",
        message: `This card backs ${cards.length} virtual card${cards.length === 1 ? "" : "s"}. Remove those first.`,
        virtual_card_count: cards.length,
      },
      { status: 409 }
    );
  }

  const jwt = extractBearerJwt(request);
  if (!jwt) {
    return NextResponse.json(
      { error: "bearer_required", message: "Firebase ID token required in Authorization header to delete a Crossmint payment method." },
      { status: 401 }
    );
  }
  await deletePaymentMethod({
    jwt,
    paymentMethodId,
  }).catch(() => {});
  await storage.deleteRail3PaymentMethod(paymentMethodId);

  return NextResponse.json({ ok: true });
}
