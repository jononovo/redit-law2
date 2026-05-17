import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { storage } from "@/server/storage";
import { rail3SetPermissionSchema } from "@/shared/schema";
import { buildMandates, createOrderIntent, revokeOrderIntent, type PermissionInput } from "@/features/payment-rails/rail3";

// Create or replace the default permission for a card. If one already exists, revoke first.
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

  if (card.verificationStatus !== "active") {
    return NextResponse.json(
      { error: "card_not_verified", message: "Verify the card before creating a permission." },
      { status: 400 }
    );
  }

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const parsed = rail3SetPermissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const input: PermissionInput = parsed.data.mode === "open"
    ? { mode: "open" }
    : {
        mode: "limited",
        maxAmountUsd: parsed.data.max_amount_usd!,
        period: parsed.data.period!,
        description: parsed.data.description,
      };

  const mandates = buildMandates(input);

  if (card.defaultOrderIntentId) {
    await revokeOrderIntent(card.defaultOrderIntentId).catch(() => {});
  }

  const intent = await createOrderIntent({
    agentId: card.agentId,
    paymentMethodId: card.paymentMethodId,
    mandates,
  });

  const limitMandate = mandates.find((m) => m.type === "maxAmount") as
    | { type: "maxAmount"; value: string; details: { period: "weekly" | "monthly" | "yearly" } }
    | undefined;

  const limitAmountCents = parsed.data.mode === "limited" && parsed.data.max_amount_usd !== undefined
    ? Math.round(parsed.data.max_amount_usd * 100)
    : null;
  const limitPeriod = parsed.data.mode === "limited" ? (parsed.data.period ?? null) : null;

  const updated = await storage.updateRail3Card(cardId, {
    defaultOrderIntentId: intent.orderIntentId,
    defaultIntentMode: parsed.data.mode,
    defaultMandates: mandates,
    defaultPermissionPhase: intent.phase,
    limitAmountCents,
    limitPeriod,
  });

  return NextResponse.json({
    card_id: cardId,
    order_intent_id: intent.orderIntentId,
    phase: intent.phase,
    mode: parsed.data.mode,
    limit_amount_cents: updated?.limitAmountCents ?? null,
    limit_period: updated?.limitPeriod ?? null,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { cardId } = await params;
  const card = await storage.getRail3CardByCardId(cardId);
  if (!card) return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  if (card.ownerUid !== user.uid) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (card.defaultOrderIntentId) {
    await revokeOrderIntent(card.defaultOrderIntentId).catch(() => {});
  }

  await storage.updateRail3Card(cardId, {
    defaultOrderIntentId: null,
    defaultIntentMode: null,
    defaultMandates: null,
    defaultPermissionPhase: null,
    limitAmountCents: null,
    limitPeriod: null,
  });

  return NextResponse.json({ ok: true });
}
