import { describe, it, expect, beforeAll } from "vitest";
import { registerBot, getBotStatus, duplicateRegisterBot } from "../lib/api-client";
import crypto from "crypto";

const TEST_PREFIX = `agenttest_${crypto.randomBytes(4).toString("hex")}`;

describe("Bot Registration", () => {
  beforeAll(() => {
    if (!process.env.TEST_BASE_URL) {
      throw new Error("TEST_BASE_URL must be set. Will not run registration tests against production by default.");
    }
  });

  let apiKey: string;

  it("registers a new bot successfully", async () => {
    const botName = `${TEST_PREFIX}_reg`;
    const { status, data } = await registerBot({
      botName,
      ownerEmail: "test@creditclaw.com",
    });

    expect(status).toBe(201);
    expect(data).not.toBeNull();
    expect(data!.bot_id).toBeTruthy();
    expect(data!.api_key).toBeTruthy();
    expect(data!.claim_token).toBeTruthy();

    apiKey = data!.api_key;
  });

  it("returns pending status for unclaimed bot", async () => {
    if (!apiKey) return;

    const { status, data } = await getBotStatus(apiKey);
    expect(status).toBe(200);
    expect(data).not.toBeNull();
    expect(data!.status).toMatch(/pending|unclaimed/);
  });

  it("rejects duplicate bot name registration", async () => {
    const botName = `${TEST_PREFIX}_dup`;

    // First registration
    const first = await registerBot({
      botName,
      ownerEmail: "test@creditclaw.com",
    });
    expect(first.status).toBe(201);

    // Duplicate registration
    const second = await duplicateRegisterBot({
      botName,
      ownerEmail: "test@creditclaw.com",
    });
    expect(second.status).toBe(409);
  });
});
