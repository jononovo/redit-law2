import { describe, it, expect } from "vitest";
import {
  generateRail5CardId,
  generateRail5TransactionId,
  validateKeyMaterial,
  buildCheckoutSteps,
  buildSpawnPayload,
} from "@/features/payment-rails/rail5/index";
import { evaluateCardGuardrails } from "@/features/agent-interaction/guardrails/evaluate";
import { GUARDRAIL_DEFAULTS } from "@/features/agent-interaction/guardrails/defaults";
import {
  rail5InitializeSchema,
  rail5SubmitKeySchema,
  rail5CheckoutRequestSchema,
  rail5ConfirmSchema,
} from "@/shared/schema";
import {
  bufToHex,
  buildEncryptedCardFile,
} from "@/features/payment-rails/card/onboarding-rail5/encrypt";

describe("Rail 5 — ID generation", () => {
  it("generates card IDs with r5card_ prefix", () => {
    const id = generateRail5CardId();
    expect(id).toMatch(/^r5card_[0-9a-f]{16}$/);
  });

  it("generates unique card IDs", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateRail5CardId()));
    expect(ids.size).toBe(50);
  });

  it("generates transaction IDs with r5chk_ prefix", () => {
    const id = generateRail5TransactionId();
    expect(id).toMatch(/^r5chk_[0-9a-f]{16}$/);
  });

  it("generates unique transaction IDs", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateRail5TransactionId()));
    expect(ids.size).toBe(50);
  });
});

describe("Rail 5 — key material validation", () => {
  const validKey = "a".repeat(64);
  const validIv = "b".repeat(24);
  const validTag = "c".repeat(32);

  it("accepts valid hex key material", () => {
    const result = validateKeyMaterial(validKey, validIv, validTag);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects key_hex that is too short", () => {
    const result = validateKeyMaterial("abcd", validIv, validTag);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("key_hex");
  });

  it("rejects key_hex that is too long", () => {
    const result = validateKeyMaterial("a".repeat(66), validIv, validTag);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("key_hex");
  });

  it("rejects iv_hex that is wrong length", () => {
    const result = validateKeyMaterial(validKey, "bb", validTag);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("iv_hex");
  });

  it("rejects tag_hex that is wrong length", () => {
    const result = validateKeyMaterial(validKey, validIv, "cc");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("tag_hex");
  });

  it("rejects non-hex characters in key", () => {
    const result = validateKeyMaterial("g".repeat(64), validIv, validTag);
    expect(result.valid).toBe(false);
  });

  it("accepts uppercase hex", () => {
    const result = validateKeyMaterial("A".repeat(64), "B".repeat(24), "C".repeat(32));
    expect(result.valid).toBe(true);
  });

  it("accepts mixed-case hex", () => {
    const result = validateKeyMaterial("aAbBcCdDeEfF".repeat(5) + "aAbB", "aAbBcC".repeat(4), "aAbBcCdD".repeat(4));
    expect(result.valid).toBe(true);
  });
});

describe("Rail 5 — onboarding schema validation", () => {
  it("validates a correct initialize request", () => {
    const result = rail5InitializeSchema.safeParse({
      card_name: "My Visa",
      card_last4: "4242",
      card_brand: "visa",
    });
    expect(result.success).toBe(true);
  });

  it("rejects initialize with missing card_name", () => {
    const result = rail5InitializeSchema.safeParse({
      card_last4: "4242",
      card_brand: "visa",
    });
    expect(result.success).toBe(false);
  });

  it("rejects initialize with invalid last4 (letters)", () => {
    const result = rail5InitializeSchema.safeParse({
      card_name: "My Card",
      card_last4: "abcd",
      card_brand: "visa",
    });
    expect(result.success).toBe(false);
  });

  it("rejects initialize with invalid last4 (wrong length)", () => {
    const result = rail5InitializeSchema.safeParse({
      card_name: "My Card",
      card_last4: "123",
      card_brand: "visa",
    });
    expect(result.success).toBe(false);
  });

  it("rejects initialize with unsupported card brand", () => {
    const result = rail5InitializeSchema.safeParse({
      card_name: "My Card",
      card_last4: "4242",
      card_brand: "dogecoin",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all supported card brands", () => {
    for (const brand of ["visa", "mastercard", "amex", "discover", "jcb", "diners"]) {
      const result = rail5InitializeSchema.safeParse({
        card_name: "Test",
        card_last4: "0000",
        card_brand: brand,
      });
      expect(result.success).toBe(true);
    }
  });

  it("validates a correct submit-key request", () => {
    const result = rail5SubmitKeySchema.safeParse({
      card_id: "r5card_abc123",
      key_hex: "a".repeat(64),
      iv_hex: "b".repeat(24),
      tag_hex: "c".repeat(32),
    });
    expect(result.success).toBe(true);
  });

  it("rejects submit-key with invalid hex in key_hex", () => {
    const result = rail5SubmitKeySchema.safeParse({
      card_id: "r5card_abc123",
      key_hex: "x".repeat(64),
      iv_hex: "b".repeat(24),
      tag_hex: "c".repeat(32),
    });
    expect(result.success).toBe(false);
  });
});

describe("Rail 5 — checkout request schema validation", () => {
  it("validates a correct checkout request", () => {
    const result = rail5CheckoutRequestSchema.safeParse({
      merchant_name: "Nike",
      merchant_url: "https://nike.com/checkout",
      item_name: "Air Max 90",
      amount_cents: 12999,
    });
    expect(result.success).toBe(true);
  });

  it("accepts checkout with optional category", () => {
    const result = rail5CheckoutRequestSchema.safeParse({
      merchant_name: "Nike",
      merchant_url: "https://nike.com/checkout",
      item_name: "Air Max 90",
      amount_cents: 12999,
      category: "footwear",
    });
    expect(result.success).toBe(true);
  });

  it("rejects checkout with zero amount", () => {
    const result = rail5CheckoutRequestSchema.safeParse({
      merchant_name: "Nike",
      merchant_url: "https://nike.com",
      item_name: "Shoes",
      amount_cents: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects checkout with negative amount", () => {
    const result = rail5CheckoutRequestSchema.safeParse({
      merchant_name: "Nike",
      merchant_url: "https://nike.com",
      item_name: "Shoes",
      amount_cents: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects checkout with amount over 10M cents ($100k)", () => {
    const result = rail5CheckoutRequestSchema.safeParse({
      merchant_name: "Luxury",
      merchant_url: "https://luxury.com",
      item_name: "Watch",
      amount_cents: 10000001,
    });
    expect(result.success).toBe(false);
  });

  it("rejects checkout with empty merchant_name", () => {
    const result = rail5CheckoutRequestSchema.safeParse({
      merchant_name: "",
      merchant_url: "https://nike.com",
      item_name: "Shoes",
      amount_cents: 5000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects checkout with missing item_name", () => {
    const result = rail5CheckoutRequestSchema.safeParse({
      merchant_name: "Nike",
      merchant_url: "https://nike.com",
      amount_cents: 5000,
    });
    expect(result.success).toBe(false);
  });
});

describe("Rail 5 — confirm schema validation", () => {
  it("validates success confirmation", () => {
    const result = rail5ConfirmSchema.safeParse({
      checkout_id: "r5chk_abc123",
      status: "success",
    });
    expect(result.success).toBe(true);
  });

  it("validates failed confirmation", () => {
    const result = rail5ConfirmSchema.safeParse({
      checkout_id: "r5chk_abc123",
      status: "failed",
    });
    expect(result.success).toBe(true);
  });

  it("rejects confirmation with invalid status", () => {
    const result = rail5ConfirmSchema.safeParse({
      checkout_id: "r5chk_abc123",
      status: "maybe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects confirmation with missing checkout_id", () => {
    const result = rail5ConfirmSchema.safeParse({
      status: "success",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional merchant_name", () => {
    const result = rail5ConfirmSchema.safeParse({
      checkout_id: "r5chk_abc123",
      status: "success",
      merchant_name: "Nike",
    });
    expect(result.success).toBe(true);
  });
});

describe("Rail 5 — card guardrails (cents-based)", () => {
  const defaults = GUARDRAIL_DEFAULTS.rail5;
  const rules = {
    maxPerTxCents: defaults.maxPerTxCents,
    dailyBudgetCents: defaults.dailyBudgetCents,
    monthlyBudgetCents: defaults.monthlyBudgetCents,
    requireApprovalAbove: null as number | null,
    autoPauseOnZero: defaults.autoPauseOnZero,
  };

  it("allows transaction under per-tx limit", () => {
    const decision = evaluateCardGuardrails(rules, { amountCents: 2500 }, { dailyCents: 0, monthlyCents: 0 });
    expect(decision.action).toBe("allow");
  });

  it("blocks transaction over per-tx limit ($50 default)", () => {
    const decision = evaluateCardGuardrails(rules, { amountCents: 5001 }, { dailyCents: 0, monthlyCents: 0 });
    expect(decision.action).toBe("block");
    expect(decision.reason).toContain("per-transaction limit");
  });

  it("allows transaction exactly at per-tx limit", () => {
    const decision = evaluateCardGuardrails(rules, { amountCents: 5000 }, { dailyCents: 0, monthlyCents: 0 });
    expect(decision.action).toBe("allow");
  });

  it("blocks when daily budget would be exceeded", () => {
    const decision = evaluateCardGuardrails(rules, { amountCents: 3000 }, { dailyCents: 8000, monthlyCents: 8000 });
    expect(decision.action).toBe("block");
    expect(decision.reason).toContain("daily budget");
  });

  it("allows when daily spend is just under limit", () => {
    const decision = evaluateCardGuardrails(rules, { amountCents: 1000 }, { dailyCents: 9000, monthlyCents: 9000 });
    expect(decision.action).toBe("allow");
  });

  it("blocks when monthly budget would be exceeded", () => {
    const decision = evaluateCardGuardrails(rules, { amountCents: 2000 }, { dailyCents: 0, monthlyCents: 49000 });
    expect(decision.action).toBe("block");
    expect(decision.reason).toContain("monthly budget");
  });

  it("allows when monthly spend is just under limit", () => {
    const decision = evaluateCardGuardrails(rules, { amountCents: 1000 }, { dailyCents: 0, monthlyCents: 49000 });
    expect(decision.action).toBe("allow");
  });

  it("requires approval when threshold is set and exceeded", () => {
    const rulesWithApproval = { ...rules, requireApprovalAbove: 2000 };
    const decision = evaluateCardGuardrails(rulesWithApproval, { amountCents: 2500 }, { dailyCents: 0, monthlyCents: 0 });
    expect(decision.action).toBe("require_approval");
    expect(decision.reason).toContain("approval threshold");
  });

  it("allows when under approval threshold", () => {
    const rulesWithApproval = { ...rules, requireApprovalAbove: 2000 };
    const decision = evaluateCardGuardrails(rulesWithApproval, { amountCents: 1500 }, { dailyCents: 0, monthlyCents: 0 });
    expect(decision.action).toBe("allow");
  });

  it("per-tx block takes precedence over approval threshold", () => {
    const rulesWithApproval = { ...rules, requireApprovalAbove: 2000 };
    const decision = evaluateCardGuardrails(rulesWithApproval, { amountCents: 6000 }, { dailyCents: 0, monthlyCents: 0 });
    expect(decision.action).toBe("block");
  });
});

describe("Rail 5 — checkout step generation", () => {
  const params = {
    checkoutId: "r5chk_test123",
    merchantName: "Nike",
    merchantUrl: "https://nike.com/checkout",
    itemName: "Air Max 90",
    amountCents: 12999,
    encryptedFilename: "Card-My-Visa-4242.md",
  };

  it("buildCheckoutSteps returns an array of steps", () => {
    const steps = buildCheckoutSteps(params);
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBeGreaterThanOrEqual(5);
  });

  it("steps reference the correct checkout ID", () => {
    const steps = buildCheckoutSteps(params);
    const mentionsCheckoutId = steps.some(s => s.includes("r5chk_test123"));
    expect(mentionsCheckoutId).toBe(true);
  });

  it("steps reference the encrypted filename", () => {
    const steps = buildCheckoutSteps(params);
    const mentionsFile = steps.some(s => s.includes("Card-My-Visa-4242.md"));
    expect(mentionsFile).toBe(true);
  });

  it("steps include key delivery instruction", () => {
    const steps = buildCheckoutSteps(params);
    const mentionsKeyApi = steps.some(s => s.includes("/api/v1/bot/rail5/key"));
    expect(mentionsKeyApi).toBe(true);
  });

  it("steps include confirm instruction", () => {
    const steps = buildCheckoutSteps(params);
    const mentionsConfirm = steps.some(s => s.includes("/api/v1/bot/rail5/confirm"));
    expect(mentionsConfirm).toBe(true);
  });

  it("steps include decrypt command", () => {
    const steps = buildCheckoutSteps(params);
    const mentionsDecrypt = steps.some(s => s.includes("decrypt.js"));
    expect(mentionsDecrypt).toBe(true);
  });

  it("steps format amount correctly ($129.99)", () => {
    const steps = buildCheckoutSteps(params);
    const mentionsAmount = steps.some(s => s.includes("$129.99"));
    expect(mentionsAmount).toBe(true);
  });

  it("steps reference merchant name", () => {
    const steps = buildCheckoutSteps(params);
    const mentionsMerchant = steps.some(s => s.includes("Nike"));
    expect(mentionsMerchant).toBe(true);
  });
});

describe("Rail 5 — spawn payload generation", () => {
  const params = {
    checkoutId: "r5chk_test456",
    merchantName: "Allbirds",
    merchantUrl: "https://allbirds.com/checkout",
    itemName: "Tree Runners",
    amountCents: 9800,
    encryptedFilename: "Card-Green-Card-1234.md",
  };

  it("generates a spawn payload with task string", () => {
    const payload = buildSpawnPayload(params);
    expect(payload.task).toBeTruthy();
    expect(typeof payload.task).toBe("string");
  });

  it("payload includes correct merchant info", () => {
    const payload = buildSpawnPayload(params);
    expect(payload.task).toContain("Allbirds");
    expect(payload.task).toContain("https://allbirds.com/checkout");
  });

  it("payload includes correct amount ($98.00)", () => {
    const payload = buildSpawnPayload(params);
    expect(payload.task).toContain("$98.00");
  });

  it("payload includes checkout ID", () => {
    const payload = buildSpawnPayload(params);
    expect(payload.task).toContain("r5chk_test456");
  });

  it("payload has cleanup set to delete", () => {
    const payload = buildSpawnPayload(params);
    expect(payload.cleanup).toBe("delete");
  });

  it("payload has a reasonable timeout (300s)", () => {
    const payload = buildSpawnPayload(params);
    expect(payload.runTimeoutSeconds).toBe(300);
  });

  it("payload generates sanitized label from merchant name", () => {
    const payload = buildSpawnPayload(params);
    expect(payload.label).toMatch(/^checkout-allbirds$/);
  });

  it("label handles special characters in merchant name", () => {
    const payload = buildSpawnPayload({ ...params, merchantName: "H&M / Online" });
    expect(payload.label).toMatch(/^checkout-h-m-online$/);
  });
});

describe("Rail 5 — encrypted card file generation", () => {
  const fakeCiphertext = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

  it("builds a valid markdown file with card header", () => {
    const md = buildEncryptedCardFile(fakeCiphertext, "My Visa", "4242", "r5card_test");
    expect(md).toContain("# CreditClaw Encrypted Card — My Visa (****4242)");
  });

  it("includes card ID in the file", () => {
    const md = buildEncryptedCardFile(fakeCiphertext, "My Visa", "4242", "r5card_test");
    expect(md).toContain("Card ID: r5card_test");
  });

  it("includes encrypted data block", () => {
    const md = buildEncryptedCardFile(fakeCiphertext, "My Visa", "4242", "r5card_test");
    expect(md).toContain("ENCRYPTED_CARD_START");
    expect(md).toContain("ENCRYPTED_CARD_END");
  });

  it("includes decrypt script block", () => {
    const md = buildEncryptedCardFile(fakeCiphertext, "My Visa", "4242", "r5card_test");
    expect(md).toContain("DECRYPT_SCRIPT_START");
    expect(md).toContain("DECRYPT_SCRIPT_END");
    expect(md).toContain("aes-256-gcm");
  });

  it("includes card metadata when provided", () => {
    const md = buildEncryptedCardFile(fakeCiphertext, "My Visa", "4242", "r5card_test", {
      bin: "4242",
      expMonth: "3",
      expYear: "2028",
      cardholderName: "John Doe",
      brand: "visa",
      address: "123 Main St",
      city: "NYC",
      state: "NY",
      zip: "10001",
      country: "US",
    });
    expect(md).toContain("## Card Details");
    expect(md).toContain("4242");
    expect(md).toContain("03/2028");
    expect(md).toContain("John Doe");
    expect(md).toContain("## Billing Address");
    expect(md).toContain("123 Main St");
    expect(md).toContain("NYC");
    expect(md).toContain("10001");
  });

  it("base64 encodes the ciphertext", () => {
    const md = buildEncryptedCardFile(fakeCiphertext, "Test", "0000", "r5card_x");
    const match = md.match(/ENCRYPTED_CARD_START\n([\s\S]+?)\nENCRYPTED_CARD_END/);
    expect(match).not.toBeNull();
    const decoded = atob(match![1].trim());
    expect(decoded.length).toBe(fakeCiphertext.length);
  });
});

describe("Rail 5 — bufToHex utility", () => {
  it("converts empty buffer to empty string", () => {
    expect(bufToHex(new Uint8Array([]).buffer)).toBe("");
  });

  it("converts known bytes to correct hex", () => {
    expect(bufToHex(new Uint8Array([0, 1, 15, 16, 255]).buffer)).toBe("00010f10ff");
  });

  it("produces lowercase hex", () => {
    expect(bufToHex(new Uint8Array([171, 205]).buffer)).toBe("abcd");
  });
});

describe("Rail 5 — guardrail defaults are sensible", () => {
  it("default per-tx limit is $50", () => {
    expect(GUARDRAIL_DEFAULTS.rail5.maxPerTxCents).toBe(5000);
  });

  it("default daily budget is $100", () => {
    expect(GUARDRAIL_DEFAULTS.rail5.dailyBudgetCents).toBe(10000);
  });

  it("default monthly budget is $500", () => {
    expect(GUARDRAIL_DEFAULTS.rail5.monthlyBudgetCents).toBe(50000);
  });

  it("autoPauseOnZero is off for rail5", () => {
    expect(GUARDRAIL_DEFAULTS.rail5.autoPauseOnZero).toBe(false);
  });

  it("master default approval mode is ask_for_everything", () => {
    expect(GUARDRAIL_DEFAULTS.master.approvalMode).toBe("ask_for_everything");
  });
});
