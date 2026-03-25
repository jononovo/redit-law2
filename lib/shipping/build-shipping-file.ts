import { type SavedShippingAddress } from "@/shared/schema";

export function buildShippingFile(addresses: SavedShippingAddress[]): string {
  if (addresses.length === 0) {
    return [
      "# Shipping Addresses",
      "",
      "No shipping addresses configured.",
      "Ask the card owner to add a shipping address in CreditClaw settings.",
      "",
    ].join("\n");
  }

  const sorted = [...addresses].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.id - b.id;
  });

  const sections: string[] = [
    "# Shipping Addresses",
    "",
  ];

  for (const addr of sorted) {
    const label = addr.label || "Unlabeled";
    const defaultTag = addr.isDefault ? " (DEFAULT)" : "";
    sections.push(`## ${label}${defaultTag}`);
    sections.push("");
    sections.push(`- **Name:** ${addr.name}`);
    sections.push(`- **Street:** ${addr.line1}`);
    if (addr.line2) {
      sections.push(`- **Street 2:** ${addr.line2}`);
    }
    sections.push(`- **City:** ${addr.city}`);
    sections.push(`- **State:** ${addr.state}`);
    sections.push(`- **ZIP:** ${addr.postalCode}`);
    sections.push(`- **Country:** ${addr.country}`);
    if (addr.phone) {
      sections.push(`- **Phone:** ${addr.phone}`);
    }
    if (addr.email) {
      sections.push(`- **Email:** ${addr.email}`);
    }
    sections.push("");
  }

  return sections.join("\n");
}
