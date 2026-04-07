export type CheckoutMethod =
  | "native_api"
  | "acp"
  | "x402"
  | "crossmint_world"
  | "browser_automation";

export const CHECKOUT_METHOD_LABELS: Record<CheckoutMethod, string> = {
  native_api: "Native API",
  acp: "Agentic Checkout",
  x402: "x402 Protocol",
  crossmint_world: "CrossMint World",
  browser_automation: "Browser Automation",
};

export const CHECKOUT_METHOD_COLORS: Record<CheckoutMethod, string> = {
  native_api: "bg-green-100 text-green-700 border-green-200",
  acp: "bg-blue-100 text-blue-700 border-blue-200",
  x402: "bg-purple-100 text-purple-700 border-purple-200",
  crossmint_world: "bg-cyan-100 text-cyan-700 border-cyan-200",
  browser_automation: "bg-neutral-100 text-neutral-600 border-neutral-200",
};
