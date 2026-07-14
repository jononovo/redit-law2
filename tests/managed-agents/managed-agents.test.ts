import { describe, it, expect, afterAll } from "vitest";
import { randomBytes } from "crypto";
import { getPool, closePool } from "../helpers";
import { isCardAction, mapCardActionProps, valuesFromMapping } from "@/features/managed-agents/crossmint-checkout/service";
import { buildBuyerProfileBody } from "@/features/managed-agents/crossmint-checkout/buyer-profile";
import { managedAgentMethods } from "@/server/storage/managed-agents";
import { MANAGED_BOT_TYPE, MANAGED_AGENT_RUNTIMES, CROSSMINT_CHECKOUT_RUNTIME, runtimeFromSlug, managedAgentRoute } from "@/lib/managed-agents";
import type { SavedShippingAddress } from "@/shared/schema";

const TEST_UID_PREFIX = "test_mac_uid_";

function testUid(): string {
  return TEST_UID_PREFIX + randomBytes(4).toString("hex");
}

const createdUids: string[] = [];

afterAll(async () => {
  const p = getPool();
  if (createdUids.length) {
    await p.query(`DELETE FROM managed_agent_checkouts WHERE owner_uid = ANY($1)`, [createdUids]);
    await p.query(`DELETE FROM managed_agents WHERE owner_uid = ANY($1)`, [createdUids]);
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

// ─── Registry slug routing ───────────────────────────────────────────────────

describe("runtimeFromSlug", () => {
  it("maps the agent slug to its runtime and builds the route", () => {
    expect(runtimeFromSlug(MANAGED_AGENT_RUNTIMES[CROSSMINT_CHECKOUT_RUNTIME].slug)).toBe(CROSSMINT_CHECKOUT_RUNTIME);
    expect(managedAgentRoute(CROSSMINT_CHECKOUT_RUNTIME)).toBe(
      `/managed-agents/${MANAGED_AGENT_RUNTIMES[CROSSMINT_CHECKOUT_RUNTIME].slug}`,
    );
  });

  it("returns null for unknown slugs (page renders not-found)", () => {
    expect(runtimeFromSlug("bogus")).toBeNull();
    expect(runtimeFromSlug("crossmint-checkout")).toBeNull(); // runtime id is NOT a slug
  });
});

// ─── ensureManagedAgent (creates bot + managed_agents row; race-safe) ────────

describe("ensureManagedAgent", () => {
  const runtime = CROSSMINT_CHECKOUT_RUNTIME;

  it("creates the bot + settings row once, then returns the same row", async () => {
    const uid = testUid();
    createdUids.push(uid);

    const first = await managedAgentMethods.ensureManagedAgent(uid, "mac-test@example.com", runtime);
    expect(first.runtime).toBe(runtime);
    expect(first.ownerUid).toBe(uid);
    expect(first.botId).toBeTruthy();

    // The bot row exists, is 'managed', active, and unclaimable.
    const p = getPool();
    const botRow = await p.query(`SELECT bot_type, wallet_status, claim_token, bot_name FROM bots WHERE bot_id = $1`, [first.botId]);
    expect(botRow.rows[0].bot_type).toBe(MANAGED_BOT_TYPE);
    expect(botRow.rows[0].wallet_status).toBe("active");
    expect(botRow.rows[0].claim_token).toBeNull();
    expect(botRow.rows[0].bot_name).toBe(MANAGED_AGENT_RUNTIMES[CROSSMINT_CHECKOUT_RUNTIME].displayName);

    const second = await managedAgentMethods.ensureManagedAgent(uid, "mac-test@example.com", runtime);
    expect(second.botId).toBe(first.botId);
    expect(second.id).toBe(first.id);
  });

  it("concurrent calls produce exactly one managed_agents row and one bot (no orphan)", async () => {
    const uid = testUid();
    createdUids.push(uid);

    const [a, b] = await Promise.all([
      managedAgentMethods.ensureManagedAgent(uid, "mac-race@example.com", runtime),
      managedAgentMethods.ensureManagedAgent(uid, "mac-race@example.com", runtime),
    ]);
    expect(a.botId).toBe(b.botId);

    const p = getPool();
    const agents = await p.query(`SELECT count(*)::int AS c FROM managed_agents WHERE owner_uid = $1`, [uid]);
    expect(agents.rows[0].c).toBe(1);
    // The losing transaction rolled back its bot insert — no orphan bot.
    const botsCount = await p.query(`SELECT count(*)::int AS c FROM bots WHERE owner_uid = $1 AND bot_type = $2`, [uid, MANAGED_BOT_TYPE]);
    expect(botsCount.rows[0].c).toBe(1);
  });

  it("settings setters persist on the managed_agents row", async () => {
    const uid = testUid();
    createdUids.push(uid);
    await managedAgentMethods.ensureManagedAgent(uid, "mac-set@example.com", runtime);

    await managedAgentMethods.setManagedAgentBuyerProfileId(uid, runtime, "bp_123");
    await managedAgentMethods.setManagedAgentDefaultCard(uid, runtime, "r3card_abc");
    const got = await managedAgentMethods.getManagedAgent(uid, runtime);
    expect(got?.buyerProfileId).toBe("bp_123");
    expect(got?.defaultCardId).toBe("r3card_abc");
  });
});

// ─── managed_agent_checkouts storage + atomic transition claim ──────────────

describe("managed_agent_checkouts storage", () => {
  it("round-trips a checkout row and claims transitions atomically", async () => {
    const uid = testUid();
    createdUids.push(uid);
    const checkoutId = "mac_test_" + randomBytes(4).toString("hex");

    const created = await managedAgentMethods.createManagedAgentCheckout({
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
    const winner = await managedAgentMethods.claimManagedAgentCheckoutCardMint(checkoutId, "act_1");
    expect(winner?.status).toBe("minting_card");
    const loser = await managedAgentMethods.claimManagedAgentCheckoutCardMint(checkoutId, "act_1");
    expect(loser).toBeNull();

    // After answering act_1, a still-pending act_1 can't re-mint even from a
    // claimable status — the answered-action guard rejects it.
    await managedAgentMethods.updateManagedAgentCheckout(checkoutId, { status: "running", answeredActionId: "act_1" });
    const reMint = await managedAgentMethods.claimManagedAgentCheckoutCardMint(checkoutId, "act_1");
    expect(reMint).toBeNull();
    // ...but a genuinely new action id can still claim.
    const newAction = await managedAgentMethods.claimManagedAgentCheckoutCardMint(checkoutId, "act_2");
    expect(newAction?.status).toBe("minting_card");

    // Only the first success finalization wins.
    const firstSuccess = await managedAgentMethods.claimManagedAgentCheckoutSuccess(checkoutId);
    expect(firstSuccess?.status).toBe("succeeded");
    const secondSuccess = await managedAgentMethods.claimManagedAgentCheckoutSuccess(checkoutId);
    expect(secondSuccess).toBeNull();

    const updated = await managedAgentMethods.updateManagedAgentCheckout(checkoutId, {
      status: "succeeded",
      receipt: { total: "12.99" },
    });
    expect(updated?.status).toBe("succeeded");

    const listed = await managedAgentMethods.getManagedAgentCheckoutsByOwnerUid(uid);
    expect(listed.map((r) => r.checkoutId)).toContain(checkoutId);
  });
});
