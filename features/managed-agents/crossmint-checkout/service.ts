import "server-only";
import { storage } from "@/server/storage";
import type { ManagedAgentCheckout, Rail3Card } from "@/shared/schema";
import { evaluateMasterGuardrails } from "@/features/agent-interaction/guardrails/master";
import { fetchOneTimeCredentials } from "@/features/payment-rails/rail3/credentials";
import { generateRail3TransactionId } from "@/features/payment-rails/rail3/ids";
import { recordOrder } from "@/features/agent-interaction/orders/create";
import { agentCheckoutsFetch, unwrapCrossmint, CrossmintApiError } from "./client";
import { ensureBuyerProfile } from "./buyer-profile";
import { generateManagedAgentCheckoutId } from "./ids";
import { isTerminalAgentCheckoutStatus, safeHostname, extractReceiptAmountCents } from "@/lib/managed-agent-checkouts";
import { CROSSMINT_CHECKOUT_RUNTIME } from "@/lib/managed-agents";

// Typed gate/flow error the routes map to their snake_case envelope.
export class AgentCheckoutError extends Error {
  constructor(public code: string, public status: number, message: string) {
    super(message);
    this.name = "AgentCheckoutError";
  }
}

// ─── Crossmint payload (defensive: the API is unstable and only partially
// documented — we log the full payload on every sync so undocumented fields,
// e.g. a live-view/session-stream URL, get discovered from real traffic) ─────
interface CrossmintPendingUserAction {
  id: string;
  responseSchema?: { properties?: Record<string, unknown>; required?: string[] };
  expiresAt?: string;
  [key: string]: unknown;
}

interface CrossmintCheckout {
  id: string;
  status?: string;
  pendingUserAction?: CrossmintPendingUserAction;
  events?: Array<{ message?: string; label?: string; type?: string; [key: string]: unknown }>;
  receipt?: Record<string, unknown>;
  [key: string]: unknown;
}

// PAN-shaped digit runs (13-19 digits, optionally spaced/dashed) → masked.
function redactCardData(s: string): string {
  return s.replace(/\b(?:\d[ -]?){13,19}\b/g, (m) => `…${m.replace(/\D/g, "").slice(-4)}`);
}

function mapStatus(cmStatus: string | undefined): string {
  if (!cmStatus) return "running";
  if (isTerminalAgentCheckoutStatus(cmStatus)) return cmStatus;
  if (cmStatus === "awaiting_user_action") return "awaiting_user_action";
  return "running";
}

function lastEventOf(cm: CrossmintCheckout): string | null {
  const last = cm.events?.[cm.events.length - 1];
  return last?.message || last?.label || null;
}

// ─── Card gates — same set as app/api/v1/bot/rail3/checkout, minus bot
// linkage (the in-house agent uses any of the owner's cards, per-checkout) ───
async function assertCardUsable(cardId: string, ownerUid: string): Promise<Rail3Card> {
  const card = await storage.getRail3CardByCardId(cardId);
  if (!card) throw new AgentCheckoutError("card_not_found", 404, "Card not found.");
  if (card.ownerUid !== ownerUid) throw new AgentCheckoutError("forbidden", 403, "Card belongs to another account.");
  if (card.isFrozen) throw new AgentCheckoutError("card_frozen", 403, "Card is frozen.");
  if (card.status !== "active") throw new AgentCheckoutError("card_not_active", 403, `Card status is "${card.status}".`);
  if (card.expiresAt && card.expiresAt < new Date()) {
    throw new AgentCheckoutError("card_expired", 403, "This virtual card has expired. Create a new one.");
  }

  const guardrail = await evaluateMasterGuardrails(ownerUid, 0);
  if (guardrail.action === "block") {
    throw new AgentCheckoutError("master_guardrail", 403, guardrail.reason);
  }
  return card;
}

// ─── Card-action detection over Crossmint's responseSchema (heuristic — no
// documented example exists; unknown shapes fall through to the human) ───────
const CARD_NUMBER_RE = /(card.?number|^number$|\bpan\b)/i;
const CVC_RE = /(cvc|cvv|security.?code)/i;
const EXP_MONTH_RE = /exp.*month/i;
const EXP_YEAR_RE = /exp.*year/i;
const EXP_COMBINED_RE = /^(exp|expiry|expiration)(date)?$/i;
const CARDHOLDER_RE = /(holder|name.?on.?card|cardholder)/i;

export function isCardAction(action: CrossmintPendingUserAction): boolean {
  const props = Object.keys(action.responseSchema?.properties || {});
  return props.some((p) => CARD_NUMBER_RE.test(p)) && props.some((p) => CVC_RE.test(p));
}

export type CardSlot = "number" | "cvc" | "expMonth" | "expYear" | "expCombined" | "cardholder";

function slotFor(prop: string): CardSlot | null {
  if (CARD_NUMBER_RE.test(prop)) return "number";
  if (CVC_RE.test(prop)) return "cvc";
  if (EXP_COMBINED_RE.test(prop)) return "expCombined";
  if (EXP_MONTH_RE.test(prop)) return "expMonth";
  if (EXP_YEAR_RE.test(prop)) return "expYear";
  if (CARDHOLDER_RE.test(prop)) return "cardholder";
  return null;
}

// prop → slot mapping decided from the schema ALONE (no credentials). Returns
// null if any required field can't be filled — the caller must NOT mint in
// that case. This is the mappability gate the mint decision hangs on.
export function mapCardActionProps(action: CrossmintPendingUserAction): Record<string, CardSlot> | null {
  const props = Object.keys(action.responseSchema?.properties || {});
  const mapping: Record<string, CardSlot> = {};
  for (const prop of props) {
    const slot = slotFor(prop);
    if (slot) mapping[prop] = slot;
  }
  const required = action.responseSchema?.required || props;
  const unmapped = required.filter((p) => !(p in mapping));
  if (unmapped.length > 0) {
    console.error(`[ManagedAgentCheckout] card action has unmappable required fields: ${unmapped.join(", ")}`);
    return null;
  }
  return mapping;
}

// Fill the mapped fields from freshly minted credentials. Pure; the mapping
// comes from mapCardActionProps, which the caller MUST have validated before
// minting — so an unrecognized shape never burns a live one-time credential.
export function valuesFromMapping(
  mapping: Record<string, CardSlot>,
  creds: { number: string; expirationMonth: string; expirationYear: string; cvc: string },
  cardholderName: string | null,
): Record<string, string> {
  const slotValue: Record<CardSlot, string> = {
    number: creds.number,
    cvc: creds.cvc,
    expMonth: creds.expirationMonth,
    expYear: creds.expirationYear,
    expCombined: `${creds.expirationMonth.padStart(2, "0")}/${creds.expirationYear.slice(-2)}`,
    cardholder: cardholderName || "",
  };
  const values: Record<string, string> = {};
  for (const [prop, slot] of Object.entries(mapping)) values[prop] = slotValue[slot];
  return values;
}

// ─── Start ───────────────────────────────────────────────────────────────────
export async function startCheckout(params: {
  ownerUid: string;
  ownerEmail: string;
  jwt: string;
  input: { card_id: string; product_url: string; request: string; merchant_context?: string; max_cost_cents?: number };
}): Promise<ManagedAgentCheckout> {
  const { ownerUid, ownerEmail, jwt, input } = params;

  await assertCardUsable(input.card_id, ownerUid);
  // Provisions BOTH the bot and the managed_agents settings row, so
  // ensureBuyerProfile (below) always has a row to cache the profile id on.
  const agent = await storage.ensureManagedAgent(ownerUid, ownerEmail, CROSSMINT_CHECKOUT_RUNTIME);
  const buyerProfileId = await ensureBuyerProfile(ownerUid, ownerEmail, jwt);

  const request = input.merchant_context
    ? `${input.request}\n\nMerchant context:\n${input.merchant_context}`
    : input.request;

  const res = await agentCheckoutsFetch("", {
    jwt,
    method: "POST",
    body: {
      target: { kind: "direct_url", url: input.product_url, request },
      buyerProfileId,
      // Crossmint requires `constraints` to be present as an object even when
      // empty ("expected object, received undefined").
      constraints: input.max_cost_cents
        ? { maxCost: { amount: (input.max_cost_cents / 100).toFixed(2), currency: "USD" } }
        : {},
    },
  });
  const cm = await unwrapCrossmint<CrossmintCheckout>(res, "createManagedAgentCheckout");

  return storage.createManagedAgentCheckout({
    checkoutId: generateManagedAgentCheckoutId(),
    crossmintCheckoutId: cm.id,
    ownerUid,
    botId: agent.botId,
    cardId: input.card_id,
    productUrl: input.product_url,
    request: input.request,
    merchantContext: input.merchant_context || null,
    maxCostCents: input.max_cost_cents ?? null,
    status: mapStatus(cm.status),
  });
}

// ─── Sync (one poll step; auto-answers the card action server-side) ─────────
export interface SyncResult {
  row: ManagedAgentCheckout;
  pendingUserAction: CrossmintPendingUserAction | null;
  cardActionUnmappable: boolean;
}

export async function syncCheckout(row: ManagedAgentCheckout, jwt: string): Promise<SyncResult> {
  if (isTerminalAgentCheckoutStatus(row.status) || !row.crossmintCheckoutId) {
    return { row, pendingUserAction: null, cardActionUnmappable: false };
  }

  const res = await agentCheckoutsFetch(`/${row.crossmintCheckoutId}`, { jwt });
  const cm = await unwrapCrossmint<CrossmintCheckout>(res, "getAgentCheckout");
  // Discovery logging for the undocumented parts of the payload (live-view
  // URL, screenshot events): default logs are a safe whitelist; the full
  // payload (PAN-redacted) only under AGENT_CHECKOUT_DEBUG=1.
  if (process.env.AGENT_CHECKOUT_DEBUG === "1") {
    console.log(`[ManagedAgentCheckout] ${row.checkoutId} payload:`, redactCardData(JSON.stringify(cm)));
  } else {
    console.log(
      `[ManagedAgentCheckout] ${row.checkoutId} status=${cm.status} keys=${Object.keys(cm).join(",")} action=${cm.pendingUserAction?.id ?? "none"}`,
    );
  }

  const status = mapStatus(cm.status);
  const lastEvent = lastEventOf(cm) ?? row.lastEvent;

  if (status === "awaiting_user_action" && cm.pendingUserAction && isCardAction(cm.pendingUserAction)) {
    return handleCardAction(row, jwt, cm);
  }

  if (status === "succeeded") {
    // Only the first poll to observe success finalizes (records the order,
    // charges the tx) — concurrent polls that lose the claim just return.
    const claimed = await storage.claimManagedAgentCheckoutSuccess(row.checkoutId);
    if (!claimed) {
      const current = (await storage.getManagedAgentCheckoutByCheckoutId(row.checkoutId)) ?? row;
      return { row: current, pendingUserAction: null, cardActionUnmappable: false };
    }
    const updated = await finalizeSuccess(claimed, cm, lastEvent);
    return { row: updated, pendingUserAction: null, cardActionUnmappable: false };
  }

  const updated = (await storage.updateManagedAgentCheckout(row.checkoutId, {
    status,
    lastEvent,
    ...(isTerminalAgentCheckoutStatus(status) ? { receipt: (cm.receipt as object) ?? null } : {}),
  })) ?? row;

  return {
    row: updated,
    pendingUserAction: status === "awaiting_user_action" ? (cm.pendingUserAction ?? null) : null,
    cardActionUnmappable: false,
  };
}

async function handleCardAction(row: ManagedAgentCheckout, jwt: string, cm: CrossmintCheckout): Promise<SyncResult> {
  const action = cm.pendingUserAction!;

  // Idempotency: we already minted+submitted a credential for this exact
  // action id — do nothing (Crossmint just hasn't advanced past it yet).
  if (row.answeredActionId === action.id) {
    return { row, pendingUserAction: null, cardActionUnmappable: false };
  }

  // Mappability is decided from the schema ALONE, before any mint. An
  // unrecognized card-field shape must never burn a live one-time credential
  // on every 2s poll — surface it to the human instead.
  const mapping = mapCardActionProps(action);
  if (!mapping) {
    const updated = (await storage.updateManagedAgentCheckout(row.checkoutId, {
      status: "awaiting_user_action",
      lastEvent: "Payment requested in an unrecognized format",
    })) ?? row;
    return { row: updated, pendingUserAction: action, cardActionUnmappable: true };
  }

  // Atomic claim: wins only from a non-minting, non-terminal status AND only
  // if this action hasn't been answered — so neither a concurrent poll nor a
  // still-pending answered action can double-mint.
  const claimed = await storage.claimManagedAgentCheckoutCardMint(row.checkoutId, action.id);
  if (!claimed) {
    const current = (await storage.getManagedAgentCheckoutByCheckoutId(row.checkoutId)) ?? row;
    return { row: current, pendingUserAction: null, cardActionUnmappable: false };
  }

  const card = await assertCardUsable(claimed.cardId, claimed.ownerUid).catch(async (err) => {
    // Gate failed BEFORE any credential was minted → safe to release for retry.
    await storage.updateManagedAgentCheckout(claimed.checkoutId, { status: "awaiting_user_action" });
    throw err;
  });

  const pm = await storage.getRail3PaymentMethodById(card.paymentMethodId);
  const addr = await storage.getDefaultShippingAddress(claimed.ownerUid);
  const merchantUrl = new URL(claimed.productUrl);
  const merchant = {
    name: merchantUrl.hostname.replace(/^www\./, ""),
    url: merchantUrl.origin,
    countryCode: addr?.country || "US",
  };

  let creds;
  try {
    creds = await fetchOneTimeCredentials({ jwt, orderIntentId: card.orderIntentId, merchant }); // ← the money step
  } catch (err) {
    // No credential minted → release so the next poll (or the human) can retry.
    await storage.updateManagedAgentCheckout(claimed.checkoutId, { status: "awaiting_user_action" });
    throw err;
  }

  // A live credential now EXISTS. From here, EVERY exit path stamps
  // answeredActionId so this action can never mint again (the claim guard
  // rejects a matching answered id), even if submission below fails.
  try {
    const values = valuesFromMapping(mapping, creds.card, pm?.cardholderName ?? null);

    const transactionId = generateRail3TransactionId();
    await storage.createRail3Transaction({
      transactionId,
      cardId: card.cardId,
      ownerUid: claimed.ownerUid,
      botId: claimed.botId,
      orderIntentId: card.orderIntentId,
      merchantName: merchant.name,
      merchantUrl: merchant.url,
      merchantCountry: merchant.countryCode,
      status: "credentials_issued",
      credentialIssuedAt: new Date(),
      metadata: { agentCheckoutId: claimed.checkoutId, credentialsExpiresAt: creds.expiresAt },
    });
    await storage.updateRail3Card(card.cardId, { lastUsedAt: new Date() });

    const submitRes = await agentCheckoutsFetch(
      `/${claimed.crossmintCheckoutId}/actions/${action.id}`,
      { jwt, method: "POST", body: { action: "submit", values } },
    );
    await unwrapCrossmint(submitRes, "submitCardAction");

    const updated = (await storage.updateManagedAgentCheckout(claimed.checkoutId, {
      status: "running",
      rail3TransactionId: transactionId,
      answeredActionId: action.id,
      lastEvent: "Payment details submitted",
    })) ?? claimed;
    return { row: updated, pendingUserAction: null, cardActionUnmappable: false };
  } catch (err) {
    // Credential was already minted — mark the action answered so it can never
    // re-mint, and leave the run visible rather than silently dead.
    await storage.updateManagedAgentCheckout(claimed.checkoutId, {
      status: "awaiting_user_action",
      answeredActionId: action.id,
      lastEvent: "Payment attempt failed — check with support before retrying",
    });
    throw err;
  }
}

async function finalizeSuccess(row: ManagedAgentCheckout, cm: CrossmintCheckout, lastEvent: string | null): Promise<ManagedAgentCheckout> {
  const receipt = (cm.receipt ?? null) as Record<string, unknown> | null;
  const amountCents = extractReceiptAmountCents(receipt);

  if (row.rail3TransactionId) {
    await storage.updateRail3Transaction(row.rail3TransactionId, {
      status: "charged",
      ...(amountCents ? { amountCents } : {}),
      settledAt: new Date(),
    });
  }

  recordOrder({
    ownerUid: row.ownerUid,
    rail: "rail3",
    botId: row.botId,
    cardId: row.cardId,
    status: "completed",
    vendor: safeHostname(row.productUrl),
    productName: row.request.slice(0, 200),
    productUrl: row.productUrl,
    priceCents: amountCents ?? undefined,
    priceCurrency: "USD",
    // rail3 transaction ids are strings — they ride in metadata, mirroring
    // app/api/v1/bot/rail3/confirm (OrderInput.transactionId is numeric/rail5).
    metadata: { agentCheckoutId: row.checkoutId, transactionId: row.rail3TransactionId },
  }).catch((err) => console.error("[ManagedAgentCheckout] recordOrder failed:", err));

  // claimManagedAgentCheckoutSuccess already set status — persist only the payload.
  return (
    (await storage.updateManagedAgentCheckout(row.checkoutId, {
      receipt: receipt as object | null,
      lastEvent: lastEvent ?? "Purchase complete",
    })) ?? row
  );
}



// ─── Non-card user action (OTP, choices — the human answers via the UI) ─────
export async function submitUserAction(row: ManagedAgentCheckout, jwt: string, actionId: string, values: Record<string, unknown>): Promise<ManagedAgentCheckout> {
  if (!row.crossmintCheckoutId) throw new AgentCheckoutError("checkout_not_found", 404, "Checkout has no remote id.");

  // Only the checkout's CURRENT pending action may be answered, and card
  // actions never take browser-supplied values — the sync handler answers
  // those server-side with minted credentials.
  const statusRes = await agentCheckoutsFetch(`/${row.crossmintCheckoutId}`, { jwt });
  const cm = await unwrapCrossmint<CrossmintCheckout>(statusRes, "getAgentCheckout");
  if (!cm.pendingUserAction || cm.pendingUserAction.id !== actionId) {
    throw new AgentCheckoutError("action_not_pending", 409, "That question is no longer pending.");
  }
  if (isCardAction(cm.pendingUserAction)) {
    throw new AgentCheckoutError("card_action_forbidden", 403, "Payment details are handled automatically.");
  }

  // Diagnostic: logs what Crossmint asked for (the schema) so schema-mismatch
  // 400s are debuggable from prod logs. Submitted values stay out of logs —
  // answers can contain OTP codes — only their keys and types are recorded.
  const valueShapes = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v]));
  console.log(
    `[ManagedAgentCheckout] submitUserAction ${row.checkoutId} action=${actionId} responseSchema=${JSON.stringify(cm.pendingUserAction.responseSchema)} valueShapes=${JSON.stringify(valueShapes)}`
  );

  const res = await agentCheckoutsFetch(`/${row.crossmintCheckoutId}/actions/${actionId}`, {
    jwt,
    method: "POST",
    // Crossmint requires the discriminator `action: "submit"` in the body
    // (its absence is the 400 "action: Invalid input"); the action id rides
    // in the path only.
    body: { action: "submit", values },
  });
  await unwrapCrossmint(res, "submitUserAction");

  return (
    (await storage.updateManagedAgentCheckout(row.checkoutId, { status: "running", lastEvent: "Answer submitted" })) ?? row
  );
}

// ─── Cancel ──────────────────────────────────────────────────────────────────
export async function cancelCheckout(row: ManagedAgentCheckout, jwt: string): Promise<ManagedAgentCheckout> {
  if (row.crossmintCheckoutId) {
    try {
      const res = await agentCheckoutsFetch(`/${row.crossmintCheckoutId}`, { jwt, method: "DELETE" });
      if (!res.ok && res.status !== 404) await unwrapCrossmint(res, "cancelAgentCheckout");
    } catch (err) {
      if (!(err instanceof CrossmintApiError && err.status === 404)) throw err;
    }
  }
  return (
    (await storage.updateManagedAgentCheckout(row.checkoutId, { status: "cancelled", lastEvent: "Cancelled by owner" })) ?? row
  );
}
