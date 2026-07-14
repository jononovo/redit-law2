import { randomBytes } from "crypto";

export function generateAgentCheckoutId(): string {
  return "achk_" + randomBytes(8).toString("hex");
}
