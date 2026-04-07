import { createDecipheriv } from "crypto";
import { readFileSync } from "fs";

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

export function extractEncryptedBlob(filePath: string): Buffer {
  const raw = readFileSync(filePath, "utf8");
  const match = raw.match(/ENCRYPTED_CARD_START\n([\s\S]+?)\nENCRYPTED_CARD_END/);
  if (!match) {
    throw new Error(`No encrypted card data found in ${filePath}`);
  }
  return Buffer.from(match[1].trim(), "base64");
}

export function decryptCard(
  encryptedData: Buffer,
  keyHex: string,
  ivHex: string,
  tagHex: string
): CardData {
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const ciphertext = encryptedData.slice(0, -16);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plain = decipher.update(ciphertext) + decipher.final("utf8");

  key.fill(0);
  iv.fill(0);
  tag.fill(0);

  return JSON.parse(plain) as CardData;
}

export function wipeCardData(card: CardData): void {
  card.number = "0".repeat(card.number.length);
  card.cvv = "0".repeat(card.cvv.length);
  card.name = "0".repeat(card.name.length);
  card.exp_month = 0;
  card.exp_year = 0;
  if (card.address) card.address = "0".repeat(card.address.length);
  if (card.city) card.city = "0".repeat(card.city.length);
  if (card.state) card.state = "0".repeat(card.state.length);
  if (card.zip) card.zip = "0".repeat(card.zip.length);
  if (card.country) card.country = "0".repeat(card.country.length);
}
