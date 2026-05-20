import "server-only";
import { randomBytes } from "crypto";

export function generateRail3CardId(): string {
  return "r3card_" + randomBytes(8).toString("hex");
}

export function generateRail3TransactionId(): string {
  return "r3tx_" + randomBytes(8).toString("hex");
}
