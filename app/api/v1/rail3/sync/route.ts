import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/features/platform-management/auth/session";
import { extractBearerJwt } from "@/features/platform-management/auth/extract-bearer-jwt";
import { storage } from "@/server/storage";
import {
  listPaymentMethods,
  listOrderIntents,
  ownerUidToUserLocator,
  mapCrossmintPmToDbColumns,
  generateRail3CardId,
  CrossmintApiError,
  type CrossmintPaymentMethod,
  type OrderIntent,
  type CrossmintMandate,
} from "@/features/payment-rails/rail3";
import { randomCardName } from "@/features/payment-rails/card/card-naming";
import type { Rail3Card, Rail3PaymentMethod } from "@/shared/schema";

// POST /api/v1/rail3/sync
// Reconciles owner's local Rail-3 state against Crossmint authoritative state.
// Two upstream calls: listPaymentMethods + listOrderIntents. Diffs, writes,
// returns a change summary for the informational modal.

interface PmChange { payment_method_id: string; brand?: string | null; last4?: string | null; reason?: string }
interface CardChange { card_id: string; card_name: string; order_intent_id: string; fields?: string[]; reason?: string }

interface SyncResult {
  payment_methods: { added: PmChange[]; removed: PmChange[]; removed_blocked: PmChange[]; changed: PmChange[] };
  cards: { added: CardChange[]; removed: CardChange[]; changed: CardChange[] };
  errors: string[];
  synced_at: string;
}

function deriveIntentMode(mandates: CrossmintMandate[]): "limited" | "open" {
  const maxAmount = mandates.find((m): m is Extract<CrossmintMandate, { type: "maxAmount" }> => m.type === "maxAmount");
  if (maxAmount && maxAmount.value === "100000.00" && maxAmount.details.period === "yearly") return "open";
  return "limited";
}

function deriveLimit(mandates: CrossmintMandate[]): { limitAmountCents: number | null; limitPeriod: string | null } {
  const maxAmount = mandates.find((m): m is Extract<CrossmintMandate, { type: "maxAmount" }> => m.type === "maxAmount");
  if (!maxAmount) return { limitAmountCents: null, limitPeriod: null };
  const usd = parseFloat(maxAmount.value);
  if (!Number.isFinite(usd)) return { limitAmountCents: null, limitPeriod: null };
  return { limitAmountCents: Math.round(usd * 100), limitPeriod: maxAmount.details.period };
}

function pmFieldsChanged(local: Rail3PaymentMethod, remoteCols: Partial<Rail3PaymentMethod>): boolean {
  const keys: (keyof Rail3PaymentMethod)[] = [
    "cardholderName", "cardLast4", "cardBrand", "cardFirst6", "expMonth", "expYear",
    "fundingType", "isDefault", "displayImageUrl",
  ];
  return keys.some((k) => (remoteCols as any)[k] !== undefined && (remoteCols as any)[k] !== (local as any)[k]);
}

// Canonical stringify — sort array of mandates by type AND recursively sort
// nested object keys. Crossmint sometimes reorders `details` keys
// (e.g. {period, currency} vs {currency, period}) which would otherwise read
// as drift on every sync.
function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

function canonicalizeMandates(mandates: CrossmintMandate[]): string {
  return stableStringify([...mandates].sort((a, b) => a.type.localeCompare(b.type)));
}

function cardFieldsChanged(local: Rail3Card, remote: OrderIntent): string[] {
  const changed: string[] = [];
  if (local.status !== remote.phase) changed.push("status");
  if (canonicalizeMandates(local.mandates as CrossmintMandate[]) !== canonicalizeMandates(remote.mandates)) {
    changed.push("mandates");
  }
  if (local.paymentMethodId !== remote.payment.paymentMethodId) changed.push("payment_method_id");
  return changed;
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const jwt = extractBearerJwt(request);
  if (!jwt) {
    return NextResponse.json(
      { error: "bearer_required", message: "Firebase ID token required in Authorization header." },
      { status: 401 },
    );
  }

  const result: SyncResult = {
    payment_methods: { added: [], removed: [], removed_blocked: [], changed: [] },
    cards: { added: [], removed: [], changed: [] },
    errors: [],
    synced_at: new Date().toISOString(),
  };

  // Fetch authoritative state from Crossmint (parallel) and local state.
  let remotePms: CrossmintPaymentMethod[] = [];
  let remoteIntents: OrderIntent[] = [];
  try {
    [remotePms, remoteIntents] = await Promise.all([
      listPaymentMethods({ userLocator: ownerUidToUserLocator(user.uid) }),
      listOrderIntents({ jwt }),
    ]);
  } catch (err) {
    const status = err instanceof CrossmintApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "crossmint_list_failed";
    console.error("[Rail3 sync] upstream list failed:", message);
    return NextResponse.json({ error: "crossmint_list_failed", message }, { status });
  }

  const [localPms, localCards] = await Promise.all([
    storage.getRail3PaymentMethodsByOwnerUid(user.uid),
    storage.getAllRail3CardsByOwnerUid(user.uid),
  ]);

  const remotePmIds = new Set(remotePms.map((p) => p.paymentMethodId));
  const localPmById = new Map(localPms.map((p) => [p.paymentMethodId, p]));
  const remoteIntentIds = new Set(remoteIntents.map((i) => i.orderIntentId));
  const localCardByIntentId = new Map(localCards.map((c) => [c.orderIntentId, c]));

  // ----- PMs: add + update -----
  for (const remote of remotePms) {
    const cols = mapCrossmintPmToDbColumns(remote);
    const local = localPmById.get(remote.paymentMethodId);
    if (!local) {
      try {
        await storage.createRail3PaymentMethod({
          paymentMethodId: remote.paymentMethodId,
          ownerUid: user.uid,
          status: "active",
          ...cols,
        });
        result.payment_methods.added.push({
          payment_method_id: remote.paymentMethodId,
          brand: remote.card.brand,
          last4: remote.card.last4,
        });
      } catch (e: any) {
        result.errors.push(`create pm ${remote.paymentMethodId}: ${e.message}`);
      }
    } else if (pmFieldsChanged(local, cols)) {
      try {
        await storage.updateRail3PaymentMethod(remote.paymentMethodId, cols);
        result.payment_methods.changed.push({
          payment_method_id: remote.paymentMethodId,
          brand: remote.card.brand,
          last4: remote.card.last4,
        });
      } catch (e: any) {
        result.errors.push(`update pm ${remote.paymentMethodId}: ${e.message}`);
      }
    }
  }

  // ----- Cards: add + update -----
  for (const remote of remoteIntents) {
    const local = localCardByIntentId.get(remote.orderIntentId);
    if (!local) {
      // Only import if the parent PM exists locally (either pre-existing or just added above).
      const pmExists = remotePmIds.has(remote.payment.paymentMethodId) || localPmById.has(remote.payment.paymentMethodId);
      if (!pmExists) {
        result.errors.push(`skip import intent ${remote.orderIntentId}: parent pm ${remote.payment.paymentMethodId} not found`);
        continue;
      }
      const mode = deriveIntentMode(remote.mandates);
      const { limitAmountCents, limitPeriod } = deriveLimit(remote.mandates);
      const cardName = randomCardName();
      const cardId = generateRail3CardId();
      try {
        await storage.createRail3Card({
          cardId,
          ownerUid: user.uid,
          paymentMethodId: remote.payment.paymentMethodId,
          cardName,
          cardColor: null,
          category: null,
          orderIntentId: remote.orderIntentId,
          intentMode: mode,
          mandates: remote.mandates,
          limitAmountCents: mode === "limited" ? limitAmountCents : null,
          limitPeriod: mode === "limited" ? limitPeriod : null,
          status: remote.phase,
          isFrozen: false,
          botId: null,
        });
        result.cards.added.push({ card_id: cardId, card_name: cardName, order_intent_id: remote.orderIntentId });
      } catch (e: any) {
        result.errors.push(`create card ${remote.orderIntentId}: ${e.message}`);
      }
    } else {
      const fields = cardFieldsChanged(local, remote);
      if (fields.length > 0) {
        // Mandates drive intentMode/limitAmountCents/limitPeriod — recompute
        // when mandates change so display-derived fields stay in sync.
        const mode = deriveIntentMode(remote.mandates);
        const { limitAmountCents, limitPeriod } = deriveLimit(remote.mandates);
        try {
          await storage.updateRail3Card(local.cardId, {
            status: remote.phase,
            mandates: remote.mandates,
            paymentMethodId: remote.payment.paymentMethodId,
            intentMode: mode,
            limitAmountCents: mode === "limited" ? limitAmountCents : null,
            limitPeriod: mode === "limited" ? limitPeriod : null,
          });
          result.cards.changed.push({
            card_id: local.cardId,
            card_name: local.cardName,
            order_intent_id: local.orderIntentId,
            fields,
          });
        } catch (e: any) {
          result.errors.push(`update card ${local.cardId}: ${e.message}`);
        }
      }
    }
  }

  // ----- Cards: remove (intent not in remote list = no longer exists on Crossmint) -----
  // Done BEFORE PM removal so a PM whose only dependents got removed in this
  // same sync is freed up for deletion in step below (single-pass convergence).
  const deletedCardIds = new Set<string>();
  for (const local of localCards) {
    if (remoteIntentIds.has(local.orderIntentId)) continue;
    try {
      await storage.deleteRail3Card(local.cardId);
      deletedCardIds.add(local.cardId);
      result.cards.removed.push({
        card_id: local.cardId,
        card_name: local.cardName,
        order_intent_id: local.orderIntentId,
      });
    } catch (e: any) {
      result.errors.push(`delete card ${local.cardId}: ${e.message}`);
    }
  }

  // ----- PMs: remove (only if no still-live local non-revoked cards reference it) -----
  for (const local of localPms) {
    if (remotePmIds.has(local.paymentMethodId)) continue;
    const dependents = localCards.filter(
      (c) =>
        c.paymentMethodId === local.paymentMethodId &&
        c.status !== "revoked" &&
        !deletedCardIds.has(c.cardId),
    );
    if (dependents.length > 0) {
      result.payment_methods.removed_blocked.push({
        payment_method_id: local.paymentMethodId,
        brand: local.cardBrand,
        last4: local.cardLast4,
        reason: `${dependents.length} local card(s) still reference it`,
      });
      continue;
    }
    try {
      await storage.deleteRail3PaymentMethod(local.paymentMethodId);
      result.payment_methods.removed.push({
        payment_method_id: local.paymentMethodId,
        brand: local.cardBrand,
        last4: local.cardLast4,
      });
    } catch (e: any) {
      result.errors.push(`delete pm ${local.paymentMethodId}: ${e.message}`);
    }
  }

  return NextResponse.json(result);
}
