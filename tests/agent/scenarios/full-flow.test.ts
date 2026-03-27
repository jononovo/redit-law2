import { describe, it, expect, beforeAll } from "vitest";
import { registerBot, getBotStatus } from "../lib/api-client";
import crypto from "crypto";

const TEST_PREFIX = `agenttest_${crypto.randomBytes(4).toString("hex")}`;

describe("Full Registration Flow", () => {
  beforeAll(() => {
    if (!process.env.TEST_BASE_URL) {
      throw new Error("TEST_BASE_URL must be set. Will not run flow tests against production by default.");
    }
  });
  it("register → status → verify claim info", { timeout: 15_000 }, async () => {
    const botName = `${TEST_PREFIX}_full`;
    const email = "test@creditclaw.com";

    // Step 1: Register
    const reg = await registerBot({ botName, ownerEmail: email });

    // Rate limited — skip gracefully
    if (reg.status === 429) {
      console.warn("Rate limited (3/hr) — skipping full flow test");
      return;
    }

    expect(reg.status).toBe(201);
    expect(reg.data).not.toBeNull();

    const { bot_id, api_key, claim_token, claim_url } = reg.data!;
    expect(bot_id).toBeTruthy();
    expect(api_key).toBeTruthy();
    expect(claim_token).toBeTruthy();

    // Step 2: Check status
    const status = await getBotStatus(api_key);
    expect(status.status).toBe(200);
    expect(status.data).not.toBeNull();
    expect(status.data!.bot_id).toBe(bot_id);

    // Step 3: Verify claim URL format (if returned)
    if (claim_url) {
      expect(claim_url).toContain(claim_token);
    }

    // Note: Full claim requires human action (Firebase login + Stripe payment method).
    // This test validates the API portion only.
  });
});
