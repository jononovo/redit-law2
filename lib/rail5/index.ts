import { randomBytes } from "crypto";
import { storage } from "@/server/storage";

export const RAIL5_TEST_CHECKOUT_PAGE_ID = "cp_dd5f6ff666dcb31fce0f251a";
export const RAIL5_TEST_CHECKOUT_URL = `https://creditclaw.com/pay/${RAIL5_TEST_CHECKOUT_PAGE_ID}`;

export function generateRail5CardId(): string {
  return "r5card_" + randomBytes(8).toString("hex");
}

export function generateRail5CheckoutId(): string {
  return "r5chk_" + randomBytes(8).toString("hex");
}

export function validateKeyMaterial(keyHex: string, ivHex: string, tagHex: string): { valid: boolean; error?: string } {
  if (!/^[0-9a-f]{64}$/i.test(keyHex)) {
    return { valid: false, error: "key_hex must be 64 hex characters (32 bytes)" };
  }
  if (!/^[0-9a-f]{24}$/i.test(ivHex)) {
    return { valid: false, error: "iv_hex must be 24 hex characters (12 bytes)" };
  }
  if (!/^[0-9a-f]{32}$/i.test(tagHex)) {
    return { valid: false, error: "tag_hex must be 32 hex characters (16 bytes)" };
  }
  return { valid: true };
}

export async function getDailySpendCents(cardId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkouts = await storage.getRail5CheckoutsByCardId(cardId, 500);
  return checkouts
    .filter(c => c.status === "completed" && c.createdAt >= today)
    .reduce((sum, c) => sum + c.amountCents, 0);
}

export async function getMonthlySpendCents(cardId: string): Promise<number> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const checkouts = await storage.getRail5CheckoutsByCardId(cardId, 5000);
  return checkouts
    .filter(c => c.status === "completed" && c.createdAt >= monthStart)
    .reduce((sum, c) => sum + c.amountCents, 0);
}

export function buildCheckoutSteps(params: {
  checkoutId: string;
  merchantName: string;
  merchantUrl: string;
  itemName: string;
  amountCents: number;
  encryptedFilename: string;
}): string[] {
  const amountUsd = (params.amountCents / 100).toFixed(2);
  return [
    `Call POST /api/v1/bot/rail5/key with { "checkout_id": "${params.checkoutId}" } to get the decryption key.`,
    `Run: node decrypt.js <key_hex> <iv_hex> <tag_hex> ${params.encryptedFilename}`,
    `Use the decrypted card details to complete checkout at ${params.merchantName} (${params.merchantUrl}) for "${params.itemName}" — $${amountUsd}.`,
    `Call POST /api/v1/bot/rail5/confirm with { "checkout_id": "${params.checkoutId}", "status": "success" } when done.`,
    `If checkout fails, call confirm with { "checkout_id": "${params.checkoutId}", "status": "failed" } instead.`,
    `Announce the result: "Purchase of ${params.itemName} at ${params.merchantName} — SUCCESS" or "— FAILED".`,
  ];
}

export function buildSpawnPayload(params: {
  checkoutId: string;
  merchantName: string;
  merchantUrl: string;
  itemName: string;
  amountCents: number;
  encryptedFilename: string;
}): {
  task: string;
  cleanup: string;
  runTimeoutSeconds: number;
  label: string;
} {
  const amountUsd = (params.amountCents / 100).toFixed(2);
  return {
    task: [
      "You are a checkout agent. Your job is to complete a purchase.",
      "",
      `Merchant: ${params.merchantName}`,
      `URL: ${params.merchantUrl}`,
      `Item: ${params.itemName}`,
      `Amount: $${amountUsd}`,
      "",
      "Steps:",
      `1. Call POST /api/v1/bot/rail5/key with { "checkout_id": "${params.checkoutId}" } to get the decryption key.`,
      `2. Run: node decrypt.js <key_hex> <iv_hex> <tag_hex> ${params.encryptedFilename}`,
      "3. Use the decrypted card details to complete checkout at the merchant URL.",
      `4. Call POST /api/v1/bot/rail5/confirm with { "checkout_id": "${params.checkoutId}", "status": "success" } when done.`,
      '5. If checkout fails, call confirm with { "status": "failed" } instead.',
      `6. Announce the result: "Purchase of ${params.itemName} at ${params.merchantName} — SUCCESS" or "— FAILED".`,
    ].join("\n"),
    cleanup: "delete",
    runTimeoutSeconds: 300,
    label: `checkout-${params.merchantName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`,
  };
}
