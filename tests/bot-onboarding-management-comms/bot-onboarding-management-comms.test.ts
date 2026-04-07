import { describe, it, expect } from "vitest";
import {
  generateBotId,
  generateApiKey,
  generateClaimToken,
  hashApiKey,
  verifyApiKey,
  getApiKeyPrefix,
  generateWebhookSecret,
} from "@/features/platform-management/agent-management/crypto";
import { signPayload } from "@/features/agent-interaction/webhooks/delivery";
import { getExpiryForEvent } from "@/features/platform-management/agent-management/bot-messaging/expiry";
import { registerBotRequestSchema, claimBotRequestSchema } from "@/shared/schema";
import { createHmac } from "crypto";

describe("Bot Identity — ID generation", () => {
  it("generates bot IDs with bot_ prefix", () => {
    const id = generateBotId();
    expect(id).toMatch(/^bot_[0-9a-f]{8}$/);
  });

  it("generates unique bot IDs", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateBotId()));
    expect(ids.size).toBe(50);
  });

  it("generates API keys with cck_live_ prefix", () => {
    const key = generateApiKey();
    expect(key).toMatch(/^cck_live_[0-9a-f]{48}$/);
  });

  it("generates unique API keys", () => {
    const keys = new Set(Array.from({ length: 20 }, () => generateApiKey()));
    expect(keys.size).toBe(20);
  });

  it("extracts correct 12-char prefix from API key", () => {
    const key = generateApiKey();
    const prefix = getApiKeyPrefix(key);
    expect(prefix).toBe(key.substring(0, 12));
    expect(prefix).toBe("cck_live_" + key.substring(9, 12));
    expect(prefix.length).toBe(12);
  });
});

describe("Bot Identity — claim tokens", () => {
  it("generates claim tokens in word-CODE format", () => {
    const token = generateClaimToken();
    expect(token).toMatch(/^[a-z]+-[A-HJ-NP-Z2-9]{4}$/);
  });

  it("generates unique claim tokens", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateClaimToken()));
    expect(tokens.size).toBe(50);
  });

  it("claim tokens exclude ambiguous characters (0, 1, I, O)", () => {
    for (let i = 0; i < 100; i++) {
      const token = generateClaimToken();
      const code = token.split("-")[1];
      expect(code).not.toMatch(/[01IO]/);
    }
  });
});

describe("Bot Identity — API key hashing", () => {
  it("hashes and verifies an API key correctly", async () => {
    const key = generateApiKey();
    const hash = await hashApiKey(key);
    const valid = await verifyApiKey(key, hash);
    expect(valid).toBe(true);
  });

  it("rejects wrong API key against hash", async () => {
    const key = generateApiKey();
    const hash = await hashApiKey(key);
    const wrongKey = generateApiKey();
    const valid = await verifyApiKey(wrongKey, hash);
    expect(valid).toBe(false);
  });

  it("produces different hashes for same key (bcrypt salt)", async () => {
    const key = generateApiKey();
    const hash1 = await hashApiKey(key);
    const hash2 = await hashApiKey(key);
    expect(hash1).not.toBe(hash2);
    expect(await verifyApiKey(key, hash1)).toBe(true);
    expect(await verifyApiKey(key, hash2)).toBe(true);
  });
});

describe("Bot Identity — webhook secrets", () => {
  it("generates webhook secrets with whsec_ prefix", () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^whsec_[0-9a-f]{48}$/);
  });

  it("generates unique webhook secrets", () => {
    const secrets = new Set(Array.from({ length: 20 }, () => generateWebhookSecret()));
    expect(secrets.size).toBe(20);
  });
});

describe("Bot Registration — schema validation", () => {
  it("validates a minimal registration (name + email)", () => {
    const result = registerBotRequestSchema.safeParse({
      bot_name: "ShopBot",
      owner_email: "owner@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("validates a full registration with all optional fields", () => {
    const result = registerBotRequestSchema.safeParse({
      bot_name: "ShopBot",
      owner_email: "owner@example.com",
      description: "A shopping assistant",
      callback_url: "https://mybot.example.com/webhook",
      bot_type: "openclaw",
    });
    expect(result.success).toBe(true);
  });

  it("rejects registration with missing bot_name", () => {
    const result = registerBotRequestSchema.safeParse({
      owner_email: "owner@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects registration with missing owner_email", () => {
    const result = registerBotRequestSchema.safeParse({
      bot_name: "ShopBot",
    });
    expect(result.success).toBe(false);
  });

  it("rejects registration with invalid email", () => {
    const result = registerBotRequestSchema.safeParse({
      bot_name: "ShopBot",
      owner_email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects registration with empty bot_name", () => {
    const result = registerBotRequestSchema.safeParse({
      bot_name: "",
      owner_email: "owner@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects registration with bot_name over 100 chars", () => {
    const result = registerBotRequestSchema.safeParse({
      bot_name: "x".repeat(101),
      owner_email: "owner@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects registration with invalid callback_url", () => {
    const result = registerBotRequestSchema.safeParse({
      bot_name: "ShopBot",
      owner_email: "owner@example.com",
      callback_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects pairing code that isn't 6 digits", () => {
    const result = registerBotRequestSchema.safeParse({
      bot_name: "ShopBot",
      owner_email: "owner@example.com",
      pairing_code: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid 6-digit pairing code", () => {
    const result = registerBotRequestSchema.safeParse({
      bot_name: "ShopBot",
      owner_email: "owner@example.com",
      pairing_code: "123456",
    });
    expect(result.success).toBe(true);
  });

  it("accepts webhook_path starting with /", () => {
    const result = registerBotRequestSchema.safeParse({
      bot_name: "ShopBot",
      owner_email: "owner@example.com",
      webhook_path: "/hooks/creditclaw",
    });
    expect(result.success).toBe(true);
  });

  it("rejects webhook_path not starting with /", () => {
    const result = registerBotRequestSchema.safeParse({
      bot_name: "ShopBot",
      owner_email: "owner@example.com",
      webhook_path: "hooks/creditclaw",
    });
    expect(result.success).toBe(false);
  });
});

describe("Bot Claiming — schema validation", () => {
  it("validates a claim request with token", () => {
    const result = claimBotRequestSchema.safeParse({
      claim_token: "coral-AB23",
    });
    expect(result.success).toBe(true);
  });

  it("rejects claim with empty token", () => {
    const result = claimBotRequestSchema.safeParse({
      claim_token: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects claim with missing token", () => {
    const result = claimBotRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("Webhook Communication — HMAC signing", () => {
  it("produces a valid HMAC-SHA256 signature", () => {
    const payload = JSON.stringify({ event: "test", data: {} });
    const secret = "whsec_testsecret123";
    const sig = signPayload(payload, secret);

    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    expect(sig).toBe(expected);
  });

  it("different payloads produce different signatures", () => {
    const secret = "whsec_testsecret123";
    const sig1 = signPayload('{"event":"a"}', secret);
    const sig2 = signPayload('{"event":"b"}', secret);
    expect(sig1).not.toBe(sig2);
  });

  it("different secrets produce different signatures", () => {
    const payload = '{"event":"test"}';
    const sig1 = signPayload(payload, "secret_one");
    const sig2 = signPayload(payload, "secret_two");
    expect(sig1).not.toBe(sig2);
  });

  it("same payload + secret always produces same signature", () => {
    const payload = '{"event":"test","data":{"amount":100}}';
    const secret = "whsec_consistent";
    const sig1 = signPayload(payload, secret);
    const sig2 = signPayload(payload, secret);
    expect(sig1).toBe(sig2);
  });

  it("signature is a 64-char hex string (SHA256)", () => {
    const sig = signPayload("test", "secret");
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("Bot Messaging — event expiry", () => {
  it("rail5.card.delivered expires in 24 hours", () => {
    const before = Date.now();
    const expiry = getExpiryForEvent("rail5.card.delivered");
    const expectedMs = 24 * 60 * 60 * 1000;
    expect(expiry.getTime() - before).toBeGreaterThanOrEqual(expectedMs - 100);
    expect(expiry.getTime() - before).toBeLessThanOrEqual(expectedMs + 1000);
  });

  it("purchase.approved expires in 24 hours", () => {
    const before = Date.now();
    const expiry = getExpiryForEvent("purchase.approved");
    const expectedMs = 24 * 60 * 60 * 1000;
    expect(expiry.getTime() - before).toBeGreaterThanOrEqual(expectedMs - 100);
    expect(expiry.getTime() - before).toBeLessThanOrEqual(expectedMs + 1000);
  });

  it("wallet.activated expires in 168 hours (7 days)", () => {
    const before = Date.now();
    const expiry = getExpiryForEvent("wallet.activated");
    const expectedMs = 168 * 60 * 60 * 1000;
    expect(expiry.getTime() - before).toBeGreaterThanOrEqual(expectedMs - 100);
    expect(expiry.getTime() - before).toBeLessThanOrEqual(expectedMs + 1000);
  });

  it("unknown events default to 168 hours", () => {
    const before = Date.now();
    const expiry = getExpiryForEvent("some.unknown.event");
    const expectedMs = 168 * 60 * 60 * 1000;
    expect(expiry.getTime() - before).toBeGreaterThanOrEqual(expectedMs - 100);
    expect(expiry.getTime() - before).toBeLessThanOrEqual(expectedMs + 1000);
  });

  it("override hours takes precedence", () => {
    const before = Date.now();
    const expiry = getExpiryForEvent("wallet.activated", 1);
    const expectedMs = 1 * 60 * 60 * 1000;
    expect(expiry.getTime() - before).toBeGreaterThanOrEqual(expectedMs - 100);
    expect(expiry.getTime() - before).toBeLessThanOrEqual(expectedMs + 1000);
  });
});
