// Shared (client + server) helpers for the in-house agent's checkouts.
// Single source of truth for status semantics — imported by the service,
// storage, routes, and UI so the sets can never drift apart.

export const AGENT_CHECKOUT_TERMINAL_STATUSES = ["succeeded", "failed", "cancelled"] as const;

const TERMINAL_SET: ReadonlySet<string> = new Set(AGENT_CHECKOUT_TERMINAL_STATUSES);

export function isTerminalAgentCheckoutStatus(status: string): boolean {
  return TERMINAL_SET.has(status);
}

// mm:ss for elapsed timers and action countdowns.
export function formatMmSs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Crossmint's receipt shape is undocumented — parse defensively.
// Accepts { total | amount | totalAmount } as number, numeric string,
// or { amount } object; returns integer cents or null.
export function extractReceiptAmountCents(receipt: unknown): number | null {
  if (!receipt || typeof receipt !== "object") return null;
  const r = receipt as Record<string, unknown>;
  const total = r.total ?? r.amount ?? r.totalAmount;
  const toCents = (v: unknown): number | null => {
    if (typeof v === "number") return Math.round(v * 100);
    if (typeof v === "string" && !Number.isNaN(parseFloat(v))) return Math.round(parseFloat(v) * 100);
    return null;
  };
  const direct = toCents(total);
  if (direct !== null) return direct;
  if (total && typeof total === "object" && "amount" in (total as object)) {
    return toCents((total as { amount: unknown }).amount);
  }
  return null;
}
