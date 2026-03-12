import type { VendorSkill } from "../types";
import { inferRequiredRails } from "./skill-json";

const RAIL_LABELS: Record<string, string> = {
  stripe_wallet: "Stripe Wallet (Privy + x402)",
  card_wallet: "Card Wallet (CrossMint)",
  self_hosted: "Self-Hosted Card (Rail 4)",
};

export function generatePaymentsMd(vendor: VendorSkill): string {
  const rails = inferRequiredRails(vendor);

  let md = `# Payment Instructions — ${vendor.name}\n\n`;
  md += `All purchases through this skill are processed via CreditClaw.\n\n`;

  md += `## Required Payment Rails\n\n`;
  for (const rail of rails) {
    md += `- **${RAIL_LABELS[rail] || rail}**\n`;
  }

  md += `\n## Making a Purchase\n\n`;
  md += `1. Confirm the item and price with your owner's spending limits\n`;
  md += `2. Submit purchase request: \`POST /api/v1/bot/wallets/:walletId/purchase\`\n`;
  md += `3. Include the vendor, item details, and total amount\n`;
  md += `4. CreditClaw enforces guardrails (per-transaction caps, daily/monthly limits, category blocks)\n`;
  md += `5. If approved, payment is processed through the configured rail\n\n`;

  md += `## Spending Limits\n\n`;
  md += `Your spending limits are set by your owner and enforced by CreditClaw:\n`;
  md += `- Per-transaction maximum\n`;
  md += `- Daily spending cap\n`;
  md += `- Monthly spending cap\n`;
  md += `- Category-based restrictions\n\n`;

  md += `Do NOT use personal payment methods or bypass CreditClaw payment rails.\n`;

  return md;
}
