export interface CardData {
  number: string;
  cvv: string;
  exp_month: number;
  exp_year: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface EncryptionResult {
  keyHex: string;
  ivHex: string;
  tagHex: string;
  ciphertextBytes: Uint8Array;
}

export function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function encryptCardDetails(cardData: CardData): Promise<EncryptionResult> {
  const cardJson = JSON.stringify(cardData);

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(cardJson)
  );

  const rawKey = await crypto.subtle.exportKey("raw", key);
  const ciphertextBytes = new Uint8Array(ciphertext);
  const tagBytes = ciphertextBytes.slice(-16);

  const keyHex = bufToHex(rawKey);
  const ivHex = bufToHex(iv);
  const tagHex = bufToHex(tagBytes);

  return { keyHex, ivHex, tagHex, ciphertextBytes };
}

export function buildEncryptedCardFile(
  ciphertextBytes: Uint8Array,
  cardName: string,
  cardLast4: string,
  cardId: string,
): string {
  const b64 = btoa(String.fromCharCode(...ciphertextBytes));
  const lines = [
    `# CreditClaw Encrypted Card — ${cardName} (****${cardLast4})`,
    "",
    `Card ID: ${cardId}`,
    "",
    "This file contains your encrypted card details for Rail 5 sub-agent checkout.",
    "Do not edit or share this file. Place it in your bot's `.creditclaw/cards/` folder.",
    "",
    "## Quick Start",
    "",
    "1. Save this file to `.creditclaw/cards/`",
    "2. Your bot will receive the decryption key at checkout time via CreditClaw API",
    "3. Use the decrypt script below to extract card details when needed",
    "",
    "Full docs: https://creditclaw.com/skill.md#rail-5",
    "",
    "## Decrypt Script",
    "",
    "DECRYPT_SCRIPT_START",
    'const crypto = require("crypto");',
    'const fs = require("fs");',
    "const [,, keyHex, ivHex, tagHex, filePath] = process.argv;",
    "",
    'const raw = fs.readFileSync(filePath, "utf8");',
    'const match = raw.match(/ENCRYPTED_CARD_START\\n([\\s\\S]+?)\\nENCRYPTED_CARD_END/);',
    "const b64 = match[1].trim();",
    'const data = Buffer.from(b64, "base64");',
    "",
    "const decipher = crypto.createDecipheriv(",
    '  "aes-256-gcm",',
    '  Buffer.from(keyHex, "hex"),',
    '  Buffer.from(ivHex, "hex")',
    ");",
    'decipher.setAuthTag(Buffer.from(tagHex, "hex"));',
    'const plain = decipher.update(data.slice(0, -16)) + decipher.final("utf8");',
    "process.stdout.write(plain);",
    "DECRYPT_SCRIPT_END",
    "",
    "## Encrypted Card Data",
    "",
    "ENCRYPTED_CARD_START",
    b64,
    "ENCRYPTED_CARD_END",
    "",
  ];
  return lines.join("\n");
}

export function downloadEncryptedFile(mdContent: string, filename: string): void {
  const blob = new Blob([mdContent], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
