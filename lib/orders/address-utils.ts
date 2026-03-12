import type { ShippingAddress } from "@/lib/procurement/types";
import type { ShippingAddressFields, SavedShippingAddress } from "@/shared/schema";

export function toShippingAddressFields(addr: ShippingAddress & { phone?: string; email?: string }): ShippingAddressFields {
  return {
    name: addr.name,
    line1: addr.line1,
    line2: addr.line2,
    city: addr.city,
    state: addr.state,
    postalCode: addr.postalCode,
    country: addr.country,
    ...(addr.phone ? { phone: addr.phone } : {}),
    ...(addr.email ? { email: addr.email } : {}),
  };
}

export function toShippingAddress(fields: ShippingAddressFields): ShippingAddress {
  return {
    name: fields.name,
    line1: fields.line1,
    line2: fields.line2,
    city: fields.city,
    state: fields.state,
    postalCode: fields.postalCode,
    country: fields.country,
  };
}

export function savedAddressToFields(saved: SavedShippingAddress): ShippingAddressFields {
  return {
    name: saved.name,
    line1: saved.line1,
    line2: saved.line2 ?? undefined,
    city: saved.city,
    state: saved.state,
    postalCode: saved.postalCode,
    country: saved.country,
    ...(saved.phone ? { phone: saved.phone } : {}),
    ...(saved.email ? { email: saved.email } : {}),
  };
}

export function savedAddressToProcurement(saved: SavedShippingAddress): ShippingAddress {
  return {
    name: saved.name,
    line1: saved.line1,
    line2: saved.line2 ?? undefined,
    city: saved.city,
    state: saved.state,
    postalCode: saved.postalCode,
    country: saved.country,
  };
}
