import { randomBytes } from "crypto";

export function generateManagedAgentCheckoutId(): string {
  return "mac_" + randomBytes(8).toString("hex");
}
