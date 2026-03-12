import { describe, it, expect } from "vitest";
import {
  buildTransferWithAuthorizationTypedData,
  generateNonce,
  buildXPaymentHeader,
  formatUsdc,
  usdToMicroUsdc,
  microUsdcToUsd,
} from "@/lib/rail1/x402";

const USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

describe("buildTransferWithAuthorizationTypedData", () => {
  it("builds correct EIP-712 typed data", () => {
    const result = buildTransferWithAuthorizationTypedData({
      from: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      to: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      value: BigInt(5_000_000),
      validAfter: 0,
      validBefore: 1700000000,
      nonce: "0x" + "ab".repeat(32),
    });

    expect(result.domain.name).toBe("USD Coin");
    expect(result.domain.version).toBe("2");
    expect(result.domain.chainId).toBe(8453);
    expect(result.domain.verifyingContract).toBe(USDC_CONTRACT);
    expect(result.primaryType).toBe("TransferWithAuthorization");
    expect(result.types.TransferWithAuthorization).toHaveLength(6);
    expect(result.message.value).toBe(BigInt(5_000_000));
    expect(result.message.validAfter).toBe(BigInt(0));
    expect(result.message.validBefore).toBe(BigInt(1700000000));
  });

  it("has all required EIP-712 type fields", () => {
    const result = buildTransferWithAuthorizationTypedData({
      from: "0x1111111111111111111111111111111111111111",
      to: "0x2222222222222222222222222222222222222222",
      value: BigInt(1),
      validAfter: 0,
      validBefore: 9999999999,
      nonce: "0x" + "00".repeat(32),
    });

    const fieldNames = result.types.TransferWithAuthorization.map((f) => f.name);
    expect(fieldNames).toContain("from");
    expect(fieldNames).toContain("to");
    expect(fieldNames).toContain("value");
    expect(fieldNames).toContain("validAfter");
    expect(fieldNames).toContain("validBefore");
    expect(fieldNames).toContain("nonce");
  });
});

describe("generateNonce", () => {
  it("returns a hex string starting with 0x", () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^0x[0-9a-f]+$/);
  });

  it("returns a 66-character string (0x + 64 hex chars = 32 bytes)", () => {
    const nonce = generateNonce();
    expect(nonce.length).toBe(66);
  });

  it("generates unique nonces", () => {
    const nonces = new Set(Array.from({ length: 50 }, () => generateNonce()));
    expect(nonces.size).toBe(50);
  });
});

describe("buildXPaymentHeader", () => {
  it("returns a valid base64 string", () => {
    const header = buildXPaymentHeader({
      signature: "0xSIG",
      from: "0xFROM",
      to: "0xTO",
      value: "5000000",
      validAfter: 0,
      validBefore: 1700000000,
      nonce: "0xNONCE",
      chainId: 8453,
    });

    expect(() => Buffer.from(header, "base64")).not.toThrow();
    const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf-8"));
    expect(decoded.signature).toBe("0xSIG");
    expect(decoded.from).toBe("0xFROM");
    expect(decoded.to).toBe("0xTO");
    expect(decoded.value).toBe("5000000");
  });

  it("always includes chainId 8453 and USDC token", () => {
    const header = buildXPaymentHeader({
      signature: "0x",
      from: "0x",
      to: "0x",
      value: "1",
      validAfter: 0,
      validBefore: 1,
      nonce: "0x",
      chainId: 8453,
    });

    const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf-8"));
    expect(decoded.chainId).toBe(8453);
    expect(decoded.token).toBe(USDC_CONTRACT);
  });

  it("overrides chainId to 8453 even when a different value is passed", () => {
    const header = buildXPaymentHeader({
      signature: "0x",
      from: "0x",
      to: "0x",
      value: "1",
      validAfter: 0,
      validBefore: 1,
      nonce: "0x",
      chainId: 1,
    });

    const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf-8"));
    expect(decoded.chainId).toBe(8453);
    expect(decoded.token).toBe(USDC_CONTRACT);
  });
});

describe("formatUsdc", () => {
  it("formats 1 USDC correctly", () => {
    expect(formatUsdc(1_000_000)).toBe("$1.00");
  });

  it("formats fractional USDC", () => {
    expect(formatUsdc(1_500_000)).toBe("$1.50");
  });

  it("formats zero", () => {
    expect(formatUsdc(0)).toBe("$0.00");
  });

  it("formats small amounts", () => {
    expect(formatUsdc(1000)).toBe("$0.00");
  });

  it("formats large amounts", () => {
    expect(formatUsdc(100_000_000)).toBe("$100.00");
  });
});

describe("usdToMicroUsdc", () => {
  it("converts 1 USD to 1000000 micro USDC", () => {
    expect(usdToMicroUsdc(1)).toBe(1_000_000);
  });

  it("converts fractional USD", () => {
    expect(usdToMicroUsdc(0.5)).toBe(500_000);
  });

  it("rounds to nearest integer", () => {
    expect(usdToMicroUsdc(1.5)).toBe(1_500_000);
    expect(usdToMicroUsdc(1.0000005)).toBe(1_000_001);
  });

  it("converts zero", () => {
    expect(usdToMicroUsdc(0)).toBe(0);
  });
});

describe("microUsdcToUsd", () => {
  it("converts 1000000 micro USDC to 1 USD", () => {
    expect(microUsdcToUsd(1_000_000)).toBe(1);
  });

  it("converts fractional", () => {
    expect(microUsdcToUsd(500_000)).toBe(0.5);
  });

  it("converts zero", () => {
    expect(microUsdcToUsd(0)).toBe(0);
  });
});
