import "server-only";
import { storage } from "@/server/storage";
import type { SavedShippingAddress } from "@/shared/schema";
import { CROSSMINT_CHECKOUT_RUNTIME } from "@/lib/managed-agents";
import { agentCheckoutsFetch, unwrapCrossmint } from "./client";

export class ShippingAddressRequiredError extends Error {
  constructor() {
    super("A default shipping address is required before the in-house agent can buy anything.");
    this.name = "ShippingAddressRequiredError";
  }
}

// Crossmint buyer-profile shape (verified against docs 2026-07-13):
// name is split first/last; region is ISO-3166-2 ("US-CA").
export function buildBuyerProfileBody(addr: SavedShippingAddress, fallbackEmail: string) {
  const nameParts = addr.name.trim().split(/\s+/);
  const first = nameParts[0] || addr.name;
  const last = nameParts.slice(1).join(" ") || first;

  return {
    label: addr.label || "Home",
    name: { first, last },
    contact: { email: addr.email || fallbackEmail },
    shipping: {
      addressLines: [addr.line1, ...(addr.line2 ? [addr.line2] : [])],
      locality: addr.city,
      administrativeAreaCode: `${addr.country}-${addr.state}`,
      postalCode: addr.postalCode,
      countryCode: addr.country,
    },
  };
}

// One buyer profile per owner, created lazily from the default (or first)
// shipping address and cached on managed_agents.buyer_profile_id.
export async function ensureBuyerProfile(ownerUid: string, ownerEmail: string, jwt: string): Promise<string> {
  // Cached on the managed_agents row (guaranteed to exist: startCheckout calls
  // ensureManagedAgent before this). The owners lookup stays only for the
  // contact-email fallback when the JWT-derived email is empty.
  const managed = await storage.getManagedAgent(ownerUid, CROSSMINT_CHECKOUT_RUNTIME);
  if (managed?.buyerProfileId) return managed.buyerProfileId;

  const owner = await storage.getOwnerByUid(ownerUid);
  const addr =
    (await storage.getDefaultShippingAddress(ownerUid)) ||
    (await storage.getShippingAddressesByOwner(ownerUid))[0];
  if (!addr) throw new ShippingAddressRequiredError();

  const res = await agentCheckoutsFetch("/buyer-profiles", {
    jwt,
    method: "POST",
    body: buildBuyerProfileBody(addr, owner?.email || ownerEmail),
  });
  const profile = await unwrapCrossmint<{ id: string }>(res, "createBuyerProfile");

  await storage.setManagedAgentBuyerProfileId(ownerUid, CROSSMINT_CHECKOUT_RUNTIME, profile.id);
  return profile.id;
}
