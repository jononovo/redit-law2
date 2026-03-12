import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const CLAIM_WORDS = [
  "coral", "amber", "cedar", "delta", "ember", "frost", "grove", "haven",
  "ivory", "jade", "kite", "lunar", "maple", "noble", "opal", "pearl",
  "quartz", "reef", "solar", "tidal", "ultra", "vivid", "willow", "zenith",
  "blaze", "crest", "dune", "flint", "glow", "haze",
];

export function generateBotId(): string {
  return "bot_" + randomBytes(4).toString("hex");
}

export function generateApiKey(): string {
  return "cck_live_" + randomBytes(24).toString("hex");
}

export function generateClaimToken(): string {
  const word = CLAIM_WORDS[Math.floor(Math.random() * CLAIM_WORDS.length)];
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${word}-${code}`;
}

export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, 10);
}

export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(apiKey, hash);
}

export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 12);
}

export function generateWebhookSecret(): string {
  return "whsec_" + randomBytes(24).toString("hex");
}

export function generateCardId(): string {
  return "card_" + randomBytes(6).toString("hex");
}
