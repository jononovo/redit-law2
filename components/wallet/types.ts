export type RailType = "rail1" | "rail2" | "rail3" | "rail5";

// Crypto wallet lifecycle (rail1/rail2). Owner-controlled freeze is a separate boolean (is_frozen), not a lifecycle state.
export type WalletStatus = "active" | "pending" | "pending_setup" | "awaiting_bot";

// Card lifecycle. Owner-controlled freeze is a separate boolean (is_frozen), not a lifecycle state.
// rail5: pending_setup | pending_delivery | confirmed | active
// rail3: requires-verification | active | expired | revoked
export type CardLifecycleStatus = string;

export interface BotInfo {
  bot_id: string;
  bot_name: string;
}

export interface CryptoWalletGuardrails {
  max_per_tx_usdc: number;
  daily_budget_usdc: number;
  monthly_budget_usdc: number;
}

export interface CardWalletGuardrails extends CryptoWalletGuardrails {
  allowlisted_merchants: string[] | null;
  blocklisted_merchants: string[] | null;
}

export interface Rail1WalletInfo {
  id: number;
  bot_id: string;
  bot_name: string;
  address: string;
  balance_usdc: number;
  balance_display: string;
  status: string;
  is_frozen: boolean;
  guardrails: CryptoWalletGuardrails | null;
  created_at: string;
}

export interface Rail2WalletInfo {
  id: number;
  bot_id: string;
  bot_name: string;
  address: string;
  balance_usdc: number;
  balance_display: string;
  chain: string;
  status: string;
  is_frozen: boolean;
  guardrails: CardWalletGuardrails | null;
  created_at: string;
}

export type CryptoWalletInfo = Rail1WalletInfo | Rail2WalletInfo;

export interface Rail5CardInfo {
  card_id: string;
  card_name: string;
  card_brand: string;
  card_last4: string;
  status: CardLifecycleStatus;
  is_frozen: boolean;
  bot_id: string | null;
  bot_name: string | null;
  card_color: string | null;
  issuer_name: string | null;
  spending_limit_cents: number;
  daily_limit_cents: number;
  monthly_limit_cents: number;
  created_at: string;
}

export interface Rail3CardInfo {
  card_id: string;
  card_name: string;
  card_color: string | null;
  category: string | null;
  status: CardLifecycleStatus;
  is_frozen: boolean;
  bot_id: string | null;
  bot_name: string | null;
  payment_method_id: string;
  card_brand: string | null;
  card_last4: string | null;
  issuer_name: string | null;
  intent_mode: "limited" | "open";
  limit_amount_cents: number | null;
  limit_period: "weekly" | "monthly" | "yearly" | null;
  order_intent_id: string;
  created_at: string;
}

export interface Rail3PaymentMethodInfo {
  payment_method_id: string;
  card_brand: string | null;
  card_last4: string | null;
  issuer_name: string | null;
  cardholder_name: string | null;
  exp_month: number | null;
  exp_year: number | null;
  virtual_card_count: number;
  created_at: string;
  last_used_at: string | null;
}

export type CreditCardInfo = Rail5CardInfo | Rail3CardInfo;

export function normalizeRail3Card(card: Rail3CardInfo, basePath: string): NormalizedCard {
  const isLimited = card.intent_mode === "limited" && card.limit_amount_cents !== null && card.limit_period !== null;
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const brand = card.card_brand || "card";
  const last4 = card.card_last4 || "••••";
  return {
    card_id: card.card_id,
    card_name: card.card_name,
    status: card.status,
    is_frozen: card.is_frozen,
    bot_id: card.bot_id,
    bot_name: card.bot_name,
    card_color: resolveCardColor(card.card_color, card.card_id),
    balance: isLimited ? formatCentsToUsd(card.limit_amount_cents!) : "—",
    balanceLabel: isLimited ? `${capitalize(card.limit_period!)} Limit` : "No Limit",
    balanceTooltip: isLimited
      ? `Crossmint enforces this limit per ${card.limit_period}.`
      : "Agent can use this card at any merchant. Each charge still uses a one-time merchant-scoped number.",
    last4,
    brand,
    issuer: card.issuer_name || null,
    line1: card.category || null,
    line2: null,
    detailPath: `${basePath}/${card.card_id}`,
  };
}

export interface NormalizedCard {
  card_id: string;
  card_name: string;
  status: CardLifecycleStatus;
  is_frozen: boolean;
  bot_id: string | null;
  bot_name: string | null;
  card_color: "primary" | "blue" | "purple" | "dark";
  balance: string;
  balanceLabel: string;
  balanceTooltip?: string | null;
  last4: string;
  brand: string | null;
  issuer: string | null;
  line1: string | null;
  line2: string | null;
  detailPath: string;
}

export function normalizeRail5Card(card: Rail5CardInfo, basePath: string): NormalizedCard {
  return {
    card_id: card.card_id,
    card_name: card.card_name,
    status: card.status,
    is_frozen: card.is_frozen,
    bot_id: card.bot_id,
    bot_name: card.bot_name,
    card_color: resolveCardColor(card.card_color, card.card_id),
    balance: formatCentsToUsd(card.spending_limit_cents),
    balanceLabel: "Spending Limit",
    last4: card.card_last4,
    brand: card.card_brand,
    issuer: card.issuer_name || null,
    line1: `Daily: ${formatCentsToUsd(card.daily_limit_cents)}`,
    line2: `Monthly: ${formatCentsToUsd(card.monthly_limit_cents)}`,
    detailPath: `${basePath}/${card.card_id}`,
  };
}

export interface Rail1TransactionInfo {
  id: number;
  type: string;
  amount_usdc: number;
  amount_display: string;
  balance_after: number | null;
  balance_after_display: string | null;
  recipient_address: string | null;
  resource_url: string | null;
  tx_hash: string | null;
  status: string;
  created_at: string;
  metadata?: {
    direction?: "inbound" | "outbound";
    counterparty_address?: string;
    transfer_tier?: string;
    [key: string]: any;
  };
}

export interface Rail2TransactionInfo {
  id: number;
  type: string;
  amount_usdc: number;
  amount_display: string;
  balance_after: number | null;
  balance_after_display: string | null;
  product_locator: string | null;
  product_name: string | null;
  quantity: number;
  order_status: string | null;
  status: string;
  crossmint_order_id: string | null;
  shipping_address: Record<string, string> | null;
  tracking_info: Record<string, string> | null;
  metadata?: {
    direction?: "inbound" | "outbound";
    counterparty_address?: string;
    counterparty_wallet_id?: number;
    counterparty_rail?: string;
    tx_hash?: string;
    transfer_tier?: string;
    [key: string]: any;
  } | null;
  created_at: string;
}

export type TransactionInfo = Rail1TransactionInfo | Rail2TransactionInfo;

export interface Rail1ApprovalInfo {
  id: number;
  wallet_id: number;
  amount_usdc: number;
  amount_display: string;
  resource_url: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export interface Rail2ApprovalInfo {
  id: number;
  wallet_id: number;
  amount_usdc: number;
  amount_display: string;
  product_locator: string;
  product_name: string;
  shipping_address: Record<string, string> | null;
  status: string;
  expires_at: string;
  created_at: string;
  bot_name: string;
  wallet_balance_display: string;
}

export type ApprovalInfo = Rail1ApprovalInfo | Rail2ApprovalInfo;

export interface TransferDestinationWallet {
  id: number;
  rail: "privy" | "crossmint";
  address: string;
  label: string;
}

export function microUsdcToDisplay(microUsdc: number): string {
  return `$${(microUsdc / 1_000_000).toFixed(2)}`;
}

export function formatCentsToUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const CARD_COLORS: ("primary" | "blue" | "purple" | "dark")[] = ["purple", "dark", "blue", "primary"];

export function stableCardColor(cardId: string): "primary" | "blue" | "purple" | "dark" {
  let hash = 0;
  for (let i = 0; i < cardId.length; i++) {
    hash = ((hash << 5) - hash + cardId.charCodeAt(i)) | 0;
  }
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

export function resolveCardColor(color: string | null | undefined, cardId: string): "primary" | "blue" | "purple" | "dark" {
  if (color && CARD_COLORS.includes(color as any)) return color as "primary" | "blue" | "purple" | "dark";
  return stableCardColor(cardId);
}

export const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
};
