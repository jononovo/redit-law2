import type { AgentCheckout } from "@/shared/schema";

// snake_case API shape shared by all /api/v1/agent-checkouts responses.
export function serializeAgentCheckout(row: AgentCheckout) {
  return {
    checkout_id: row.checkoutId,
    status: row.status,
    card_id: row.cardId,
    product_url: row.productUrl,
    request: row.request,
    merchant_context: row.merchantContext,
    max_cost_cents: row.maxCostCents,
    last_event: row.lastEvent,
    receipt: row.receipt,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
