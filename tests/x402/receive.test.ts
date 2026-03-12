import { describe, it, expect } from "vitest";
import {
  parseXPaymentHeader,
  validateX402Payment,
  buildX402DedupeKey,
  type X402PaymentParams,
} from "@/lib/x402/receive";

const USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

function makeValidPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    from: "0x1111111111111111111111111111111111111111",
    to: "0x2222222222222222222222222222222222222222",
    value: "5000000",
    validAfter: 0,
    validBefore: Math.floor(Date.now() / 1000) + 3600,
    nonce: "0x" + "ab".repeat(32),
    signature: "0x" + "cd".repeat(65),
    chainId: 8453,
    token: USDC_CONTRACT,
    ...overrides,
  };
}

function encode(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
}

describe("parseXPaymentHeader", () => {
  it("parses a valid base64-encoded header", () => {
    const payload = makeValidPayload();
    const result = parseXPaymentHeader(encode(payload));

    expect(result.from).toBe(payload.from);
    expect(result.to).toBe(payload.to);
    expect(result.value).toBe("5000000");
    expect(result.nonce).toBe(payload.nonce);
    expect(result.chainId).toBe(8453);
    expect(result.token).toBe(USDC_CONTRACT);
  });

  it("throws on invalid base64", () => {
    expect(() => parseXPaymentHeader("!!!not-base64!!!")).toThrow();
  });

  it("throws when from is missing", () => {
    const payload = makeValidPayload();
    delete (payload as Record<string, unknown>).from;
    expect(() => parseXPaymentHeader(encode(payload))).toThrow("missing required fields");
  });

  it("throws when to is missing", () => {
    const payload = makeValidPayload();
    delete (payload as Record<string, unknown>).to;
    expect(() => parseXPaymentHeader(encode(payload))).toThrow("missing required fields");
  });

  it("throws when value is missing", () => {
    const payload = makeValidPayload();
    delete (payload as Record<string, unknown>).value;
    expect(() => parseXPaymentHeader(encode(payload))).toThrow("missing required fields");
  });

  it("throws when signature is missing", () => {
    const payload = makeValidPayload();
    delete (payload as Record<string, unknown>).signature;
    expect(() => parseXPaymentHeader(encode(payload))).toThrow("missing required fields");
  });

  it("throws when nonce is missing", () => {
    const payload = makeValidPayload();
    delete (payload as Record<string, unknown>).nonce;
    expect(() => parseXPaymentHeader(encode(payload))).toThrow("missing required fields");
  });

  it("throws when validBefore is missing", () => {
    const payload = makeValidPayload();
    delete (payload as Record<string, unknown>).validBefore;
    expect(() => parseXPaymentHeader(encode(payload))).toThrow("validBefore is required");
  });

  it("throws when validBefore is not a number", () => {
    const payload = makeValidPayload({ validBefore: "not-a-number" });
    expect(() => parseXPaymentHeader(encode(payload))).toThrow("must be numbers");
  });

  it("throws when value is zero", () => {
    const payload = makeValidPayload({ value: "0" });
    expect(() => parseXPaymentHeader(encode(payload))).toThrow("positive number");
  });

  it("throws when value is negative", () => {
    const payload = makeValidPayload({ value: "-100" });
    expect(() => parseXPaymentHeader(encode(payload))).toThrow("positive number");
  });

  it("defaults chainId to 8453 when not provided", () => {
    const payload = makeValidPayload();
    delete (payload as Record<string, unknown>).chainId;
    const result = parseXPaymentHeader(encode(payload));
    expect(result.chainId).toBe(8453);
  });

  it("defaults token to USDC when not provided", () => {
    const payload = makeValidPayload();
    delete (payload as Record<string, unknown>).token;
    const result = parseXPaymentHeader(encode(payload));
    expect(result.token).toBe(USDC_CONTRACT);
  });

  it("defaults validAfter to 0 when not provided", () => {
    const payload = makeValidPayload();
    delete (payload as Record<string, unknown>).validAfter;
    const result = parseXPaymentHeader(encode(payload));
    expect(result.validAfter).toBe(0);
  });
});

describe("validateX402Payment", () => {
  const recipient = "0x2222222222222222222222222222222222222222";

  function makePayment(overrides: Partial<X402PaymentParams> = {}): X402PaymentParams {
    return {
      from: "0x1111111111111111111111111111111111111111",
      to: recipient,
      value: "5000000",
      validAfter: 0,
      validBefore: Math.floor(Date.now() / 1000) + 3600,
      nonce: "0x" + "ab".repeat(32),
      signature: "0x" + "cd".repeat(65),
      chainId: 8453,
      token: USDC_CONTRACT,
      ...overrides,
    };
  }

  it("validates a correct payment", () => {
    const result = validateX402Payment(makePayment(), recipient, 5_000_000);
    expect(result.valid).toBe(true);
  });

  it("rejects unsupported chain", () => {
    const result = validateX402Payment(makePayment({ chainId: 1 }), recipient, 5_000_000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unsupported chain");
  });

  it("rejects unsupported token", () => {
    const result = validateX402Payment(
      makePayment({ token: "0x0000000000000000000000000000000000000000" }),
      recipient,
      5_000_000
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unsupported token");
  });

  it("rejects recipient mismatch", () => {
    const result = validateX402Payment(
      makePayment({ to: "0x3333333333333333333333333333333333333333" }),
      recipient,
      5_000_000
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Recipient mismatch");
  });

  it("is case-insensitive for recipient matching", () => {
    const result = validateX402Payment(
      makePayment({ to: recipient.toUpperCase() }),
      recipient.toLowerCase(),
      5_000_000
    );
    expect(result.valid).toBe(true);
  });

  it("rejects expired signature", () => {
    const result = validateX402Payment(
      makePayment({ validBefore: Math.floor(Date.now() / 1000) - 60 }),
      recipient,
      5_000_000
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("expired");
  });

  it("rejects signature not yet valid", () => {
    const result = validateX402Payment(
      makePayment({ validAfter: Math.floor(Date.now() / 1000) + 3600 }),
      recipient,
      5_000_000
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not yet valid");
  });

  it("rejects unsupported token", () => {
    const result = validateX402Payment(
      makePayment({ token: "0x0000000000000000000000000000000000000000" }),
      recipient,
      5_000_000
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unsupported token");
  });

  it("accepts null expected amount (open-price)", () => {
    const result = validateX402Payment(makePayment({ value: "999999" }), recipient, null);
    expect(result.valid).toBe(true);
  });

  it("accepts amount within 1% tolerance (lower bound)", () => {
    const result = validateX402Payment(makePayment({ value: "4950001" }), recipient, 5_000_000);
    expect(result.valid).toBe(true);
  });

  it("accepts amount within 1% tolerance (upper bound)", () => {
    const result = validateX402Payment(makePayment({ value: "5049999" }), recipient, 5_000_000);
    expect(result.valid).toBe(true);
  });

  it("rejects amount below 1% tolerance", () => {
    const result = validateX402Payment(makePayment({ value: "4900000" }), recipient, 5_000_000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Amount mismatch");
  });

  it("rejects amount above 1% tolerance", () => {
    const result = validateX402Payment(makePayment({ value: "5100000" }), recipient, 5_000_000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Amount mismatch");
  });
});

describe("buildX402DedupeKey", () => {
  it("builds a deterministic key from from, to, and nonce", () => {
    const payment: X402PaymentParams = {
      from: "0xAAAA",
      to: "0xBBBB",
      value: "100",
      validAfter: 0,
      validBefore: 9999999999,
      nonce: "0xNONCE123",
      signature: "0xSIG",
      chainId: 8453,
      token: USDC_CONTRACT,
    };
    const key = buildX402DedupeKey(payment);
    expect(key).toBe("x402:0xaaaa:0xbbbb:0xNONCE123");
  });

  it("lowercases from and to addresses", () => {
    const payment: X402PaymentParams = {
      from: "0xABCDEF",
      to: "0xFEDCBA",
      value: "100",
      validAfter: 0,
      validBefore: 9999999999,
      nonce: "0x123",
      signature: "0xSIG",
      chainId: 8453,
      token: USDC_CONTRACT,
    };
    const key = buildX402DedupeKey(payment);
    expect(key).toContain("0xabcdef");
    expect(key).toContain("0xfedcba");
  });

  it("produces different keys for different nonces", () => {
    const base: X402PaymentParams = {
      from: "0xAAAA",
      to: "0xBBBB",
      value: "100",
      validAfter: 0,
      validBefore: 9999999999,
      nonce: "0xNONCE_A",
      signature: "0xSIG",
      chainId: 8453,
      token: USDC_CONTRACT,
    };
    const key1 = buildX402DedupeKey(base);
    const key2 = buildX402DedupeKey({ ...base, nonce: "0xNONCE_B" });
    expect(key1).not.toBe(key2);
  });
});
