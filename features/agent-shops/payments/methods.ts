import type { PaymentMethodDef } from "./types";

export const PAYMENT_METHODS: Record<string, PaymentMethodDef> = {
  stripe_onramp: {
    id: "stripe_onramp",
    label: "Card / Bank",
    subtitle: "Secure payment powered by Stripe",
    iconEmoji: "💳",
    supportedRails: ["rail1"],
    supportedModes: ["topup", "checkout"],
    minAmount: 1,
  },
  base_pay: {
    id: "base_pay",
    label: "Base Pay",
    subtitle: "One-tap USDC from your Base wallet",
    iconEmoji: "🔵",
    supportedRails: ["rail1"],
    supportedModes: ["topup", "checkout"],
  },
  qr_wallet: {
    id: "qr_wallet",
    label: "Crypto Wallet",
    subtitle: "Send USDC from any wallet",
    iconEmoji: "📱",
    supportedRails: ["rail1"],
    supportedModes: ["topup"],
  },
  x402: {
    id: "x402",
    label: "Agent Pay (x402)",
    subtitle: "Send this to your AI agent",
    iconEmoji: "🤖",
    supportedRails: ["rail1"],
    supportedModes: ["checkout"],
  },
  testing: {
    id: "testing",
    label: "Testing (Card Capture)",
    subtitle: "Captures card details without processing — for testing only",
    iconEmoji: "🧪",
    supportedRails: ["rail1"],
    supportedModes: ["checkout"],
  },
};

export function getAvailableMethods(
  rail: "rail1" | "rail2",
  mode: "topup" | "checkout",
  allowedMethods?: string[],
): PaymentMethodDef[] {
  return Object.values(PAYMENT_METHODS).filter((m) => {
    if (!m.supportedRails.includes(rail)) return false;
    if (!m.supportedModes.includes(mode)) return false;
    if (allowedMethods && !allowedMethods.includes(m.id)) return false;
    return true;
  });
}
