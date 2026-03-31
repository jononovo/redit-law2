import type { VendorSkill } from "../types";
import { computeAgentFriendliness, CAPABILITY_LABELS, CHECKOUT_METHOD_LABELS, SECTOR_LABELS } from "../types";

export function generateDescriptionMd(vendor: VendorSkill, version: string): string {
  const friendliness = computeAgentFriendliness(vendor);

  let md = `# ${vendor.name}\n\n`;

  md += `| Field | Value |\n`;
  md += `|-------|-------|\n`;
  md += `| **Slug** | \`${vendor.slug}\` |\n`;
  md += `| **Version** | ${version} |\n`;
  md += `| **Sector** | ${SECTOR_LABELS[vendor.sector] || vendor.sector} |\n`;
  md += `| **URL** | ${vendor.url} |\n`;
  md += `| **Maturity** | ${vendor.maturity} |\n`;
  md += `| **ASX Score** | ${friendliness * 20}/100 |\n\n`;

  md += `## Description\n\n`;
  const caps = vendor.capabilities.map(c => CAPABILITY_LABELS[c] || c).join(", ");
  const methods = vendor.checkoutMethods.map(m => CHECKOUT_METHOD_LABELS[m] || m).join(", ");
  md += `Procurement skill for ${vendor.name} (${SECTOR_LABELS[vendor.sector] || vendor.sector}). `;
  md += `Supports: ${caps}. `;
  md += `Checkout via: ${methods}.\n\n`;

  md += `## Capabilities\n\n`;
  for (const cap of vendor.capabilities) {
    md += `- ${CAPABILITY_LABELS[cap] || cap}\n`;
  }
  md += `\n`;

  md += `## Checkout Methods\n\n`;
  for (const method of vendor.checkoutMethods) {
    md += `- ${CHECKOUT_METHOD_LABELS[method] || method}\n`;
  }
  md += `\n`;

  md += `---\n`;
  md += `*Powered by [CreditClaw](https://creditclaw.com) — Prepaid spending controls for AI agents.*\n`;

  return md;
}
