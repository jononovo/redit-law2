import { describe, it, expect, afterAll } from "vitest";
import { randomBytes } from "crypto";
import { getPool, closePool } from "../helpers";
import { isCardAction, mapCardActionProps, valuesFromMapping } from "@/features/payment-rails/agent-checkouts/service";
import { buildBuyerProfileBody } from "@/features/payment-rails/agent-checkouts/buyer-profile";
import { agentCheckoutMethods } from "@/server/storage/payment-rails/agent-checkouts";
import { INHOUSE_BOT_TYPE, INHOUSE_AGENT_NAME } from "@/lib/inhouse-agent";
import type { SavedShippingAddress } from "@/shared/schema";

const TEST_UID_PREFIX = "test_achk_uid_";

function testUid(): string {
  return TEST_UID_PREFIX + randomBytes(4).toString("hex");
}

const createdUids: string[] = [];

afterAll(async () => {
  const p = getPool();
  if (createdUids.length) {
    await p.query(`DELETE FROM agent_checkouts WHERE owner_uid = ANY($1)`, [createdUids]);
    await p.query(`DELETE FROM bots WHERE owner_uid = ANY($1)`, [createdUids]);
  }
  await closePool();
});

// ─── Card-action detection (heuristic over Crossmint responseSchema) ────────

function action(props: string[], required?: string[]) {
  return {
    id: "act_1",
    responseSchema: {
      properties: Object.fromEntries(props.map((p) => [p, { type: "string" }])),
      ...(required ? { required } : {}),
    },
  };
}

const CREDS = { number: "4111111111111111", expirationMonth: "12", expirationYear: "2027", cvc: "123" };

describe("isCardAction", () => {
  it("detects card number + cvc field combinations", () => {
    expect(isCardAction(action(["cardNumber", "cvc"]))).toBe(true);
    expect(isCardAction(action(["number", "securityCode", "expMonth"]))).toBe(true);
    expect(isCardAction(action(["pan", "cvv"]))).toBe(true);
  });

  it("rejects non-card actions", () => {
    expect(isCardAction(action(["otp"]))).toBe(false);
    expect(isCardAction(action(["size", "color"]))).toBe(false);
    expect(isCardAction(action(["cardNumber"]))).toBe(false); // number without cvc
    expect(isCardAction({ id: "act_1" })).toBe(false); // no schema at all
  });
});

describe("mapCardActionProps + valuesFromMapping", () => {
  function fill(props: string[], cardholder: string | null, required?: string[]) {
    const mapping = mapCardActionProps(action(props, required));
    return mapping ? valuesFromMapping(mapping, CREDS, cardholder) : null;
  }

  it("maps split expiry fields", () => {
    expect(fill(["cardNumber", "cvc", "expMonth", "expYear", "cardholderName"], "Jon Doe")).toEqual({
      cardNumber: CREDS.number,
      cvc: CREDS.cvc,
      expMonth: "12",
      expYear: "2027",
      cardholderName: "Jon Doe",
    });
  });

  it("maps a combined expiry field to MM/YY", () => {
    expect(fill(["number", "cvv", "expiry"], null)).toEqual({
      number: CREDS.number,
      cvv: CREDS.cvc,
      expiry: "12/27",
    });
  });

  it("returns null mapping when a required field cannot be mapped (never guess card data)", () => {
    const mapping = mapCardActionProps(
      action(["cardNumber", "cvc", "favoriteColor"], ["cardNumber", "cvc", "favoriteColor"]),
    );
    expect(mapping).toBeNull();
  });

  it("does not hijack a non-expiry 'month'/'year' field (tightened regex)", () => {
    // birthMonth (optional) must never be filled with the expiry month.
    const mapping = mapCardActionProps(action(["cardNumber", "cvc", "birthMonth"], ["cardNumber", "cvc"]));
    expect(mapping).not.toBeNull();
    expect(Object.keys(mapping!)).not.toContain("birthMonth");
  });
});

// ─── Buyer-profile mapping (shippingAddresses row → Crossmint shape) ────────

describe("buildBuyerProfileBody", () => {
  const addr: SavedShippingAddress = {
    id: 1,
    ownerUid: "uid",
    label: null,
    isDefault: true,
    name: "Ada Lovelace",
    line1: "1 Market St",
    line2: "Apt 2",
    city: "San Francisco",
    state: "CA",
    postalCode: "94105",
    country: "US",
    phone: null,
    email: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("splits name, composes ISO-3166-2 region, includes line2", () => {
    const body = buildBuyerProfileBody(addr, "fallback@example.com");
    expect(body).toEqual({
      label: "Home",
      name: { first: "Ada", last: "Lovelace" },
      contact: { email: "fallback@example.com" },
      shipping: {
        addressLines: ["1 Market St", "Apt 2"],
        locality: "San Francisco",
        administrativeAreaCode: "US-CA",
        postalCode: "94105",
        countryCode: "US",
      },
    });
  });

  it("prefers the address email and handles single-word names", () => {
    const body = buildBuyerProfileBody({ ...addr, name: "Cher", email: "cher@example.com", line2: null }, "x@y.z");
    expect(body.name).toEqual({ first: "Cher", last: "Cher" });
    expect(body.contact.email).toBe("cher@example.com");
    expect(body.shipping.addressLines).toEqual(["1 Market St"]);
  });
});

// ─── ensureInhouseBot (partial unique index race) ────────────────────────────

describe("ensureInhouseBot", () => {
  it("creates once, then returns the same row", async () => {
    const uid = testUid();
    createdUids.push(uid);

    const first = await agentCheckoutMethods.ensureInhouseBot(uid, "achk-test@example.com");
    expect(first.botType).toBe(INHOUSE_BOT_TYPE);
    expect(first.botName).toBe(INHOUSE_AGENT_NAME);
    expect(first.walletStatus).toBe("active");
    expect(first.ownerUid).toBe(uid);
    expect(first.claimToken).toBeNull();

    const second = await agentCheckoutMethods.ensureInhouseBot(uid, "achk-test@example.com");
    expect(second.botId).toBe(first.botId);
  });

  it("concurrent calls produce exactly one row (bots_inhouse_owner_uidx)", async () => {
    const uid = testUid();
    createdUids.push(uid);

    const [a, b] = await Promise.all([
      agentCheckoutMethods.ensureInhouseBot(uid, "achk-race@example.com"),
      agentCheckoutMethods.ensureInhouseBot(uid, "achk-race@example.com"),
    ]);
    expect(a.botId).toBe(b.botId);

    const p = getPool();
    const res = await p.query(
      `SELECT count(*)::int AS c FROM bots WHERE owner_uid = $1 AND bot_type = $2`,
      [uid, INHOUSE_BOT_TYPE],
    );
    expect(res.rows[0].c).toBe(1);
  });
});

// ─── agent_checkouts storage + atomic transition claim ──────────────────────

describe("agent_checkouts storage", () => {
  it("round-trips a checkout row and claims transitions atomically", async () => {
    const uid = testUid();
    createdUids.push(uid);
    const checkoutId = "achk_test_" + randomBytes(4).toString("hex");

    const created = await agentCheckoutMethods.createAgentCheckout({
      checkoutId,
      crossmintCheckoutId: "cm_" + randomBytes(4).toString("hex"),
      ownerUid: uid,
      botId: "agent_test",
      cardId: "r3card_test",
      productUrl: "https://example.com/product",
      request: "buy it",
      status: "created",
    });
    expect(created.status).toBe("created");

    // Winner claims the card mint; a concurrent poll for the same action gets null
    // (status is now minting_card, excluded from the claimable set).
    const winner = await agentCheckoutMethods.claimAgentCheckoutCardMint(checkoutId, "act_1");
    expect(winner?.status).toBe("minting_card");
    const loser = await agentCheckoutMethods.claimAgentCheckoutCardMint(checkoutId, "act_1");
    expect(loser).toBeNull();

    // After answering act_1, a still-pending act_1 can't re-mint even from a
    // claimable status — the answered-action guard rejects it.
    await agentCheckoutMethods.updateAgentCheckout(checkoutId, { status: "running", answeredActionId: "act_1" });
    const reMint = await agentCheckoutMethods.claimAgentCheckoutCardMint(checkoutId, "act_1");
    expect(reMint).toBeNull();
    // ...but a genuinely new action id can still claim.
    const newAction = await agentCheckoutMethods.claimAgentCheckoutCardMint(checkoutId, "act_2");
    expect(newAction?.status).toBe("minting_card");

    // Only the first success finalization wins.
    const firstSuccess = await agentCheckoutMethods.claimAgentCheckoutSuccess(checkoutId);
    expect(firstSuccess?.status).toBe("succeeded");
    const secondSuccess = await agentCheckoutMethods.claimAgentCheckoutSuccess(checkoutId);
    expect(secondSuccess).toBeNull();

    const updated = await agentCheckoutMethods.updateAgentCheckout(checkoutId, {
      status: "succeeded",
      receipt: { total: "12.99" },
    });
    expect(updated?.status).toBe("succeeded");

    const listed = await agentCheckoutMethods.getAgentCheckoutsByOwnerUid(uid);
    expect(listed.map((r) => r.checkoutId)).toContain(checkoutId);
  });
});
