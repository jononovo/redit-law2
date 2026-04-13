import { pgTable, serial, text, timestamp, integer, boolean, index, bigint, jsonb, numeric, uniqueIndex, customType } from "drizzle-orm/pg-core";
import { z } from "zod";
import { GUARDRAIL_DEFAULTS } from "@/features/agent-interaction/guardrails/defaults";

export const bots = pgTable("bots", {
  id: serial("id").primaryKey(),
  botId: text("bot_id").notNull().unique(),
  botName: text("bot_name").notNull(),
  description: text("description"),
  ownerEmail: text("owner_email").notNull(),
  ownerUid: text("owner_uid"),
  apiKeyHash: text("api_key_hash").notNull(),
  apiKeyPrefix: text("api_key_prefix").notNull(),
  claimToken: text("claim_token").unique(),
  walletStatus: text("wallet_status").notNull().default("pending"),
  callbackUrl: text("callback_url"),
  webhookSecret: text("webhook_secret"),
  webhookStatus: text("webhook_status").notNull().default("none"),
  webhookFailCount: integer("webhook_fail_count").notNull().default(0),
  defaultRail: text("default_rail"),
  signupTenant: text("signup_tenant"),
  botType: text("bot_type"),
  tunnelId: text("tunnel_id"),
  tunnelToken: text("tunnel_token"),
  tunnelStatus: text("tunnel_status").notNull().default("none"),
  tunnelLocalPort: integer("tunnel_local_port"),
  openclawHooksToken: text("openclaw_hooks_token"),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  ownerUid: text("owner_uid").notNull(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripePmId: text("stripe_pm_id").notNull().unique(),
  cardLast4: text("card_last4"),
  cardBrand: text("card_brand"),
  isDefault: boolean("is_default").notNull().default(false),
  label: text("label"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


export const apiAccessLogs = pgTable("api_access_logs", {
  id: serial("id").primaryKey(),
  botId: text("bot_id").notNull(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  responseTimeMs: integer("response_time_ms"),
  errorCode: text("error_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_access_logs_bot_created").on(table.botId, table.createdAt),
  index("idx_access_logs_bot_id").on(table.botId),
  index("idx_access_logs_created_at").on(table.createdAt),
]);

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: serial("id").primaryKey(),
  botId: text("bot_id").notNull(),
  eventType: text("event_type").notNull(),
  callbackUrl: text("callback_url").notNull(),
  payload: text("payload").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  lastAttemptAt: timestamp("last_attempt_at"),
  nextRetryAt: timestamp("next_retry_at"),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("webhook_deliveries_bot_created_idx").on(table.botId, table.createdAt),
  index("webhook_deliveries_status_retry_idx").on(table.status, table.nextRetryAt),
]);

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  ownerUid: text("owner_uid").notNull().unique(),
  transactionAlerts: boolean("transaction_alerts").notNull().default(true),
  budgetWarnings: boolean("budget_warnings").notNull().default(true),
  weeklySummary: boolean("weekly_summary").notNull().default(false),
  purchaseOverThresholdCents: integer("purchase_over_threshold_cents").notNull().default(5000),
  balanceLowCents: integer("balance_low_cents").notNull().default(500),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  ownerUid: text("owner_uid").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  botId: text("bot_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("notifications_owner_created_idx").on(table.ownerUid, table.createdAt),
]);

export const pairingCodes = pgTable("pairing_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  ownerUid: text("owner_uid").notNull(),
  botId: text("bot_id"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  claimedAt: timestamp("claimed_at"),
}, (table) => [
  index("pairing_codes_code_idx").on(table.code),
  index("pairing_codes_owner_idx").on(table.ownerUid),
]);

export const registerBotRequestSchema = z.object({
  bot_name: z.string().min(1).max(100),
  owner_email: z.string().email(),
  description: z.string().max(500).optional(),
  callback_url: z.string().url().optional(),
  pairing_code: z.string().length(6).regex(/^\d{6}$/).optional(),
  bot_type: z.string().max(50).optional(),
  local_port: z.number().int().min(1).max(65535).optional(),
  webhook_path: z.string().max(200).startsWith("/").optional(),
});

export const claimBotRequestSchema = z.object({
  claim_token: z.string().min(1),
});

export const purchaseRequestSchema = z.object({
  amount_cents: z.number().int().min(1).max(10000000),
  merchant: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
});

export type Bot = typeof bots.$inferSelect;
export type InsertBot = typeof bots.$inferInsert;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = typeof paymentMethods.$inferInsert;

export type ApiAccessLog = typeof apiAccessLogs.$inferSelect;
export type InsertApiAccessLog = typeof apiAccessLogs.$inferInsert;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type InsertWebhookDelivery = typeof webhookDeliveries.$inferInsert;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type PairingCode = typeof pairingCodes.$inferSelect;
export type InsertPairingCode = typeof pairingCodes.$inferInsert;

export const waitlistEntries = pgTable("waitlist_entries", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  source: text("source").notNull().default("hero"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type InsertWaitlistEntry = typeof waitlistEntries.$inferInsert;

export const waitlistEmailSchema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
});

export const updateNotificationPreferencesSchema = z.object({
  transaction_alerts: z.boolean().optional(),
  budget_warnings: z.boolean().optional(),
  weekly_summary: z.boolean().optional(),
  purchase_over_threshold_usd: z.number().min(0).max(100000).optional(),
  balance_low_usd: z.number().min(0).max(100000).optional(),
  email_enabled: z.boolean().optional(),
  in_app_enabled: z.boolean().optional(),
});

// ─── Rail 1: Stripe Wallet (Privy + x402) ───────────────────────────────────

export const privyWallets = pgTable("privy_wallets", {
  id: serial("id").primaryKey(),
  botId: text("bot_id").notNull(),
  ownerUid: text("owner_uid").notNull(),
  privyWalletId: text("privy_wallet_id").notNull(),
  address: text("address").notNull(),
  balanceUsdc: bigint("balance_usdc", { mode: "number" }).notNull().default(0),
  status: text("status").notNull().default("active"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("privy_wallets_bot_id_idx").on(table.botId),
  index("privy_wallets_owner_uid_idx").on(table.ownerUid),
  index("privy_wallets_address_idx").on(table.address),
]);

export const privyGuardrails = pgTable("privy_guardrails", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull(),
  maxPerTxUsdc: integer("max_per_tx_usdc").notNull().default(GUARDRAIL_DEFAULTS.rail1.maxPerTxUsdc),
  dailyBudgetUsdc: integer("daily_budget_usdc").notNull().default(GUARDRAIL_DEFAULTS.rail1.dailyBudgetUsdc),
  monthlyBudgetUsdc: integer("monthly_budget_usdc").notNull().default(GUARDRAIL_DEFAULTS.rail1.monthlyBudgetUsdc),
  recurringAllowed: boolean("recurring_allowed").notNull().default(GUARDRAIL_DEFAULTS.rail1.recurringAllowed),
  autoPauseOnZero: boolean("auto_pause_on_zero").notNull().default(GUARDRAIL_DEFAULTS.rail1.autoPauseOnZero),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"),
}, (table) => [
  index("privy_guardrails_wallet_id_idx").on(table.walletId),
]);

export const privyTransactions = pgTable("privy_transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull(),
  type: text("type").notNull(),
  amountUsdc: bigint("amount_usdc", { mode: "number" }).notNull(),
  recipientAddress: text("recipient_address"),
  resourceUrl: text("resource_url"),
  txHash: text("tx_hash"),
  status: text("status").notNull().default("pending"),
  stripeSessionId: text("stripe_session_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  balanceAfter: bigint("balance_after", { mode: "number" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
}, (table) => [
  index("privy_transactions_wallet_id_idx").on(table.walletId),
  index("privy_transactions_status_idx").on(table.status),
  index("privy_transactions_type_idx").on(table.type),
]);

export type PrivyWallet = typeof privyWallets.$inferSelect;
export type InsertPrivyWallet = typeof privyWallets.$inferInsert;
export type PrivyGuardrail = typeof privyGuardrails.$inferSelect;
export type InsertPrivyGuardrail = typeof privyGuardrails.$inferInsert;
export type PrivyTransaction = typeof privyTransactions.$inferSelect;
export type InsertPrivyTransaction = typeof privyTransactions.$inferInsert;

export const createPrivyWalletSchema = z.object({
  bot_id: z.string().min(1),
});

export const setPrivyGuardrailsSchema = z.object({
  wallet_id: z.number().int().positive(),
  max_per_tx_usdc: z.number().int().min(0).optional(),
  daily_budget_usdc: z.number().int().min(0).optional(),
  monthly_budget_usdc: z.number().int().min(0).optional(),
  recurring_allowed: z.boolean().optional(),
  auto_pause_on_zero: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const privyOnrampSessionSchema = z.object({
  wallet_id: z.number().int().positive(),
  amount_usd: z.number().min(1).max(10000).optional(),
});

export const privyBotSignSchema = z.object({
  bot_id: z.string().min(1),
  resource_url: z.string().min(1),
  amount_usdc: z.number().int().positive(),
  recipient_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  valid_before: z.number().int().positive().optional(),
});

// ─── Rail 2: Card Wallet (CrossMint + Commerce) ─────────────────────────────

export const crossmintWallets = pgTable("crossmint_wallets", {
  id: serial("id").primaryKey(),
  botId: text("bot_id").notNull(),
  ownerUid: text("owner_uid").notNull(),
  crossmintWalletId: text("crossmint_wallet_id").notNull(),
  address: text("address").notNull(),
  balanceUsdc: bigint("balance_usdc", { mode: "number" }).notNull().default(0),
  chain: text("chain").notNull().default("base"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastSyncedAt: timestamp("last_synced_at"),
}, (table) => [
  index("crossmint_wallets_bot_id_idx").on(table.botId),
  index("crossmint_wallets_owner_uid_idx").on(table.ownerUid),
  index("crossmint_wallets_address_idx").on(table.address),
]);

export const crossmintGuardrails = pgTable("crossmint_guardrails", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull(),
  maxPerTxUsdc: integer("max_per_tx_usdc").notNull().default(GUARDRAIL_DEFAULTS.rail2.maxPerTxUsdc),
  dailyBudgetUsdc: integer("daily_budget_usdc").notNull().default(GUARDRAIL_DEFAULTS.rail2.dailyBudgetUsdc),
  monthlyBudgetUsdc: integer("monthly_budget_usdc").notNull().default(GUARDRAIL_DEFAULTS.rail2.monthlyBudgetUsdc),
  recurringAllowed: boolean("recurring_allowed").notNull().default(GUARDRAIL_DEFAULTS.rail2.recurringAllowed),
  autoPauseOnZero: boolean("auto_pause_on_zero").notNull().default(GUARDRAIL_DEFAULTS.rail2.autoPauseOnZero),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"),
}, (table) => [
  index("crossmint_guardrails_wallet_id_idx").on(table.walletId),
]);

export const crossmintTransactions = pgTable("crossmint_transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull(),
  type: text("type").notNull(),
  amountUsdc: bigint("amount_usdc", { mode: "number" }).notNull(),
  crossmintOrderId: text("crossmint_order_id"),
  productLocator: text("product_locator"),
  productName: text("product_name"),
  quantity: integer("quantity").notNull().default(1),
  orderStatus: text("order_status"),
  shippingAddress: jsonb("shipping_address").$type<{
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  }>(),
  trackingInfo: jsonb("tracking_info").$type<{
    carrier?: string;
    tracking_number?: string;
    tracking_url?: string;
    estimated_delivery?: string;
  }>(),
  status: text("status").notNull().default("pending"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  balanceAfter: bigint("balance_after", { mode: "number" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("crossmint_transactions_wallet_id_idx").on(table.walletId),
  index("crossmint_transactions_status_idx").on(table.status),
  index("crossmint_transactions_type_idx").on(table.type),
  index("crossmint_transactions_order_id_idx").on(table.crossmintOrderId),
]);

export type CrossmintWallet = typeof crossmintWallets.$inferSelect;
export type InsertCrossmintWallet = typeof crossmintWallets.$inferInsert;
export type CrossmintGuardrail = typeof crossmintGuardrails.$inferSelect;
export type InsertCrossmintGuardrail = typeof crossmintGuardrails.$inferInsert;
export type CrossmintTransaction = typeof crossmintTransactions.$inferSelect;
export type InsertCrossmintTransaction = typeof crossmintTransactions.$inferInsert;

export const createCrossmintWalletSchema = z.object({
  bot_id: z.string().min(1),
});

export const setCrossmintGuardrailsSchema = z.object({
  wallet_id: z.number().int().positive(),
  max_per_tx_usdc: z.number().int().min(0).optional(),
  daily_budget_usdc: z.number().int().min(0).optional(),
  monthly_budget_usdc: z.number().int().min(0).optional(),
  recurring_allowed: z.boolean().optional(),
  auto_pause_on_zero: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const crossmintOnrampSessionSchema = z.object({
  wallet_id: z.number().int().positive(),
  amount_usd: z.number().min(1).max(10000).optional(),
});

export const crossmintBotPurchaseSchema = z.object({
  merchant: z.string().min(1).max(100),
  product_id: z.string().min(1).max(500),
  quantity: z.number().int().min(1).max(100).default(1),
  product_name: z.string().max(500).optional(),
  estimated_price_usd: z.number().positive().optional(),
  shipping_address: z.object({
    name: z.string().min(1).max(200),
    line1: z.string().min(1).max(500),
    line2: z.string().max(500).optional(),
    city: z.string().min(1).max(200),
    state: z.string().min(1).max(100),
    zip: z.string().min(1).max(20),
    country: z.string().length(2).default("US"),
  }).optional(),
});

// ─── Owners (local user records) ──────────────────────────────────────────────

export const owners = pgTable("owners", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  stripeCustomerId: text("stripe_customer_id"),
  flags: text("flags").array().notNull().default([]),
  signupTenant: text("signup_tenant"),
  onboardedAt: timestamp("onboarded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("owners_uid_idx").on(table.uid),
]);

export type Owner = typeof owners.$inferSelect;
export type InsertOwner = typeof owners.$inferInsert;

// ─── Master Guardrails (cross-rail spend limits) ─────────────────────────────

export const masterGuardrails = pgTable("master_guardrails", {
  id: serial("id").primaryKey(),
  ownerUid: text("owner_uid").notNull().unique(),
  maxPerTxUsdc: integer("max_per_tx_usdc").notNull().default(GUARDRAIL_DEFAULTS.master.maxPerTxUsdc),
  dailyBudgetUsdc: integer("daily_budget_usdc").notNull().default(GUARDRAIL_DEFAULTS.master.dailyBudgetUsdc),
  monthlyBudgetUsdc: integer("monthly_budget_usdc").notNull().default(GUARDRAIL_DEFAULTS.master.monthlyBudgetUsdc),
  approvalMode: text("approval_mode").notNull().default("ask_for_everything"),
  requireApprovalAbove: integer("require_approval_above"),
  enabled: boolean("enabled").notNull().default(GUARDRAIL_DEFAULTS.master.enabled),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("master_guardrails_owner_uid_idx").on(table.ownerUid),
]);

export type MasterGuardrail = typeof masterGuardrails.$inferSelect;
export type InsertMasterGuardrail = typeof masterGuardrails.$inferInsert;

export const upsertMasterGuardrailsSchema = z.object({
  max_per_tx_usdc: z.number().int().min(1).max(100000).optional(),
  daily_budget_usdc: z.number().int().min(1).max(1000000).optional(),
  monthly_budget_usdc: z.number().int().min(1).max(10000000).optional(),
  approval_mode: z.enum(["ask_for_everything", "auto_approve_under_threshold"]).optional(),
  require_approval_above: z.number().int().min(0).nullable().optional(),
  enabled: z.boolean().optional(),
});

// ─── Rail 5 Guardrails (card-rail, cents) ─────────────────────────────────────

export const rail5Guardrails = pgTable("rail5_guardrails", {
  id: serial("id").primaryKey(),
  cardId: text("card_id").notNull(),
  maxPerTxCents: integer("max_per_tx_cents").notNull().default(GUARDRAIL_DEFAULTS.rail5.maxPerTxCents),
  dailyBudgetCents: integer("daily_budget_cents").notNull().default(GUARDRAIL_DEFAULTS.rail5.dailyBudgetCents),
  monthlyBudgetCents: integer("monthly_budget_cents").notNull().default(GUARDRAIL_DEFAULTS.rail5.monthlyBudgetCents),
  recurringAllowed: boolean("recurring_allowed").notNull().default(GUARDRAIL_DEFAULTS.rail5.recurringAllowed),
  autoPauseOnZero: boolean("auto_pause_on_zero").notNull().default(GUARDRAIL_DEFAULTS.rail5.autoPauseOnZero),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"),
}, (table) => [
  index("rail5_guardrails_card_id_idx").on(table.cardId),
]);

export type Rail5Guardrail = typeof rail5Guardrails.$inferSelect;
export type InsertRail5Guardrail = typeof rail5Guardrails.$inferInsert;

export const upsertRail5GuardrailsSchema = z.object({
  card_id: z.string().min(1),
  max_per_tx_cents: z.number().int().min(0).max(10000000).optional(),
  daily_budget_cents: z.number().int().min(0).max(10000000).optional(),
  monthly_budget_cents: z.number().int().min(0).max(100000000).optional(),
  recurring_allowed: z.boolean().optional(),
  auto_pause_on_zero: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// ─── Procurement Controls ─────────────────────────────────────────────────────

export const procurementControls = pgTable("procurement_controls", {
  id: serial("id").primaryKey(),
  ownerUid: text("owner_uid").notNull(),
  scope: text("scope").notNull(),
  scopeRefId: text("scope_ref_id"),
  allowlistedDomains: jsonb("allowlisted_domains").$type<string[]>().default([]),
  blocklistedDomains: jsonb("blocklisted_domains").$type<string[]>().default([]),
  allowlistedMerchants: jsonb("allowlisted_merchants").$type<string[]>().default([]),
  blocklistedMerchants: jsonb("blocklisted_merchants").$type<string[]>().default([]),
  allowlistedCategories: jsonb("allowlisted_categories").$type<string[]>().default([]),
  blocklistedCategories: jsonb("blocklisted_categories").$type<string[]>().default([]),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"),
}, (table) => [
  index("procurement_controls_owner_uid_idx").on(table.ownerUid),
  index("procurement_controls_scope_idx").on(table.ownerUid, table.scope, table.scopeRefId),
]);

export type ProcurementControl = typeof procurementControls.$inferSelect;
export type InsertProcurementControl = typeof procurementControls.$inferInsert;

export const upsertProcurementControlsSchema = z.object({
  scope: z.enum(["master", "rail1", "rail2", "rail5"]),
  scope_ref_id: z.string().nullable().optional(),
  allowlisted_domains: z.array(z.string()).optional(),
  blocklisted_domains: z.array(z.string()).optional(),
  allowlisted_merchants: z.array(z.string()).optional(),
  blocklisted_merchants: z.array(z.string()).optional(),
  allowlisted_categories: z.array(z.string()).optional(),
  blocklisted_categories: z.array(z.string()).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const crossmintProductSearchSchema = z.object({
  product_url: z.string().url().min(1).max(2000),
});


// ─── Rail 5: Sub-Agent Cards (Encrypted + Ephemeral) ─────────────────────────

export const rail5Cards = pgTable("rail5_cards", {
  id: serial("id").primaryKey(),
  cardId: text("card_id").notNull().unique(),
  ownerUid: text("owner_uid").notNull(),
  botId: text("bot_id"),
  cardName: text("card_name").notNull().default("Untitled Card"),
  encryptedKeyHex: text("encrypted_key_hex").notNull().default(""),
  encryptedIvHex: text("encrypted_iv_hex").notNull().default(""),
  encryptedTagHex: text("encrypted_tag_hex").notNull().default(""),
  cardLast4: text("card_last4").notNull().default(""),
  cardBrand: text("card_brand").notNull().default("visa"),
  status: text("status").notNull().default("pending_setup"),
  cardColor: text("card_color"),
  cardFirst6: text("card_first6").notNull().default(""),
  expMonth: text("exp_month").notNull().default(""),
  expYear: text("exp_year").notNull().default(""),
  cardholderName: text("cardholder_name").notNull().default(""),
  billingAddress: text("billing_address"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingZip: text("billing_zip"),
  billingCountry: text("billing_country").notNull().default("US"),
  testToken: text("test_token"),
  testStartedAt: timestamp("test_started_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("rail5_cards_card_id_idx").on(table.cardId),
  index("rail5_cards_owner_uid_idx").on(table.ownerUid),
  index("rail5_cards_bot_id_idx").on(table.botId),
  index("rail5_cards_status_idx").on(table.status),
]);

export const rail5Transactions = pgTable("rail5_transactions", {
  id: serial("id").primaryKey(),
  checkoutId: text("checkout_id").notNull().unique(),
  cardId: text("card_id").notNull(),
  botId: text("bot_id").notNull(),
  ownerUid: text("owner_uid").notNull(),
  merchantName: text("merchant_name").notNull(),
  merchantUrl: text("merchant_url").notNull(),
  itemName: text("item_name").notNull(),
  amountCents: integer("amount_cents").notNull(),
  category: text("category"),
  status: text("status").notNull().default("approved"),
  keyDelivered: boolean("key_delivered").notNull().default(false),
  balanceAfter: integer("balance_after"),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("rail5_transactions_checkout_id_idx").on(table.checkoutId),
  index("rail5_transactions_card_id_idx").on(table.cardId),
  index("rail5_transactions_bot_id_idx").on(table.botId),
  index("rail5_transactions_status_idx").on(table.status),
]);

export type Rail5Card = typeof rail5Cards.$inferSelect;
export type InsertRail5Card = typeof rail5Cards.$inferInsert;
export type Rail5Transaction = typeof rail5Transactions.$inferSelect;
export type InsertRail5Transaction = typeof rail5Transactions.$inferInsert;

export const rail5InitializeSchema = z.object({
  card_name: z.string().min(1).max(200),
  card_last4: z.string().length(4).regex(/^\d{4}$/),
  card_brand: z.enum(["visa", "mastercard", "amex", "discover", "jcb", "diners"]),
  card_first6: z.string().min(4).max(6).regex(/^\d{4,6}$/).optional(),
});

export const rail5SubmitKeySchema = z.object({
  card_id: z.string().min(1),
  key_hex: z.string().length(64).regex(/^[0-9a-f]{64}$/i),
  iv_hex: z.string().length(24).regex(/^[0-9a-f]{24}$/i),
  tag_hex: z.string().length(32).regex(/^[0-9a-f]{32}$/i),
  card_last4: z.string().length(4).regex(/^\d{4}$/).optional(),
  card_brand: z.enum(["visa", "mastercard", "amex", "discover", "jcb", "diners"]).optional(),
  card_first6: z.string().min(4).max(6).regex(/^\d{4,6}$/).optional(),
  exp_month: z.string().min(1).max(2).optional(),
  exp_year: z.string().min(2).max(4).optional(),
  cardholder_name: z.string().min(1).max(200).optional(),
  billing_address: z.string().max(500).optional(),
  billing_city: z.string().max(200).optional(),
  billing_state: z.string().max(100).optional(),
  billing_zip: z.string().max(20).optional(),
  billing_country: z.string().length(2).optional(),
  spending_limit_cents: z.number().int().min(100).max(10000000).optional(),
  daily_limit_cents: z.number().int().min(100).max(10000000).optional(),
  monthly_limit_cents: z.number().int().min(100).max(100000000).optional(),
});

export const rail5CheckoutRequestSchema = z.object({
  merchant_name: z.string().min(1).max(200),
  merchant_url: z.string().min(1).max(2000),
  item_name: z.string().min(1).max(500),
  amount_cents: z.number().int().min(1).max(10000000),
  category: z.string().max(100).optional(),
});

export const rail5ConfirmSchema = z.object({
  checkout_id: z.string().min(1),
  status: z.enum(["success", "failed"]),
  merchant_name: z.string().max(200).optional(),
});



export const unifiedApprovals = pgTable("unified_approvals", {
  id: serial("id").primaryKey(),
  approvalId: text("approval_id").notNull().unique(),
  rail: text("rail").notNull(),
  ownerUid: text("owner_uid").notNull(),
  ownerEmail: text("owner_email").notNull(),
  botName: text("bot_name").notNull(),
  amountDisplay: text("amount_display").notNull(),
  amountRaw: integer("amount_raw").notNull(),
  merchantName: text("merchant_name").notNull(),
  itemName: text("item_name"),
  hmacToken: text("hmac_token").notNull(),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  decidedAt: timestamp("decided_at"),
  railRef: text("rail_ref").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("unified_approvals_approval_id_idx").on(table.approvalId),
  index("unified_approvals_owner_uid_idx").on(table.ownerUid),
  index("unified_approvals_status_idx").on(table.status),
  index("unified_approvals_rail_idx").on(table.rail),
]);

export type UnifiedApproval = typeof unifiedApprovals.$inferSelect;
export type InsertUnifiedApproval = typeof unifiedApprovals.$inferInsert;

export interface ShippingAddressFields {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface TrackingInfoFields {
  carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
  estimated_delivery?: string;
  delivered_at?: string;
  status?: string;
  last_updated?: string;
}

export interface VendorDetailsFields {
  url?: string;
  category?: string;
  vendorSlug?: string;
  vendorOrderUrl?: string;
  vendorCustomerId?: string;
  notes?: string;
}

export const shippingAddresses = pgTable("shipping_addresses", {
  id: serial("id").primaryKey(),
  ownerUid: text("owner_uid").notNull(),
  label: text("label"),
  isDefault: boolean("is_default").notNull().default(false),
  name: text("name").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull().default("US"),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("shipping_addresses_owner_uid_idx").on(table.ownerUid),
  index("shipping_addresses_is_default_idx").on(table.isDefault),
]);

export type SavedShippingAddress = typeof shippingAddresses.$inferSelect;
export type InsertShippingAddress = typeof shippingAddresses.$inferInsert;

export const insertShippingAddressSchema = z.object({
  ownerUid: z.string().min(1),
  label: z.string().max(100).optional().nullable(),
  isDefault: z.boolean().default(false),
  name: z.string().min(1).max(200),
  line1: z.string().min(1).max(500),
  line2: z.string().max(500).optional().nullable(),
  city: z.string().min(1).max(200),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2).default("US"),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
});

export const brandLoginAccounts = pgTable("brand_login_accounts", {
  id: serial("id").primaryKey(),
  ownerUid: text("owner_uid").notNull(),
  brandId: integer("brand_id").notNull(),
  botId: text("bot_id"),
  accountIdentifier: text("account_identifier"),
  encryptedCredentials: text("encrypted_credentials"),
  encryptionMethod: text("encryption_method"),
  status: text("status").notNull().default("active"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("brand_login_accounts_owner_uid_idx").on(table.ownerUid),
  index("brand_login_accounts_brand_id_idx").on(table.brandId),
]);

export type BrandLoginAccount = typeof brandLoginAccounts.$inferSelect;
export type InsertBrandLoginAccount = typeof brandLoginAccounts.$inferInsert;

export const insertBrandLoginAccountSchema = z.object({
  ownerUid: z.string().min(1),
  brandId: z.number().int().positive(),
  botId: z.string().optional().nullable(),
  accountIdentifier: z.string().max(500).optional().nullable(),
  encryptedCredentials: z.string().optional().nullable(),
  encryptionMethod: z.string().max(50).optional().nullable(),
  status: z.string().default("active"),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  ownerUid: text("owner_uid").notNull(),
  rail: text("rail").notNull(),
  botId: text("bot_id"),
  botName: text("bot_name"),
  walletId: integer("wallet_id"),
  cardId: text("card_id"),
  transactionId: integer("transaction_id"),
  externalOrderId: text("external_order_id"),
  status: text("status").notNull().default("pending"),
  vendor: text("vendor"),
  vendorId: integer("vendor_id"),
  vendorDetails: jsonb("vendor_details").$type<VendorDetailsFields>(),
  productName: text("product_name"),
  productImageUrl: text("product_image_url"),
  productUrl: text("product_url"),
  productShortDescription: text("product_short_description"),
  sku: text("sku"),
  quantity: integer("quantity").notNull().default(1),
  priceCents: integer("price_cents"),
  priceCurrency: text("price_currency").notNull().default("USD"),
  taxesCents: integer("taxes_cents"),
  shippingPriceCents: integer("shipping_price_cents"),
  shippingType: text("shipping_type"),
  shippingNote: text("shipping_note"),
  shippingAddress: jsonb("shipping_address").$type<ShippingAddressFields>(),
  trackingInfo: jsonb("tracking_info").$type<TrackingInfoFields>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("orders_owner_uid_idx").on(table.ownerUid),
  index("orders_rail_idx").on(table.rail),
  index("orders_bot_id_idx").on(table.botId),
  index("orders_wallet_id_idx").on(table.walletId),
  index("orders_card_id_idx").on(table.cardId),
  index("orders_external_order_id_idx").on(table.externalOrderId),
  index("orders_status_idx").on(table.status),
  index("orders_created_at_idx").on(table.createdAt),
  index("orders_vendor_id_idx").on(table.vendorId),
]);

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const insertOrderSchema = z.object({
  ownerUid: z.string().min(1),
  rail: z.enum(["rail1", "rail2", "rail5"]),
  botId: z.string().optional().nullable(),
  botName: z.string().optional().nullable(),
  walletId: z.number().int().optional().nullable(),
  cardId: z.string().optional().nullable(),
  transactionId: z.number().int().optional().nullable(),
  externalOrderId: z.string().optional().nullable(),
  status: z.string().default("pending"),
  vendor: z.string().optional().nullable(),
  vendorId: z.number().int().optional().nullable(),
  vendorDetails: z.record(z.string(), z.any()).optional().nullable(),
  productName: z.string().optional().nullable(),
  productImageUrl: z.string().optional().nullable(),
  productUrl: z.string().optional().nullable(),
  productShortDescription: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  quantity: z.number().int().default(1),
  priceCents: z.number().int().optional().nullable(),
  priceCurrency: z.string().default("USD"),
  taxesCents: z.number().int().optional().nullable(),
  shippingPriceCents: z.number().int().optional().nullable(),
  shippingType: z.string().optional().nullable(),
  shippingNote: z.string().optional().nullable(),
  shippingAddress: z.record(z.string(), z.any()).optional().nullable(),
  trackingInfo: z.record(z.string(), z.any()).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export const sellerProfiles = pgTable("seller_profiles", {
  id: serial("id").primaryKey(),
  ownerUid: text("owner_uid").notNull().unique(),
  businessName: text("business_name"),
  logoUrl: text("logo_url"),
  contactEmail: text("contact_email"),
  websiteUrl: text("website_url"),
  description: text("description"),
  slug: text("slug").unique(),
  shopPublished: boolean("shop_published").notNull().default(false),
  shopBannerUrl: text("shop_banner_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SellerProfile = typeof sellerProfiles.$inferSelect;
export type InsertSellerProfile = typeof sellerProfiles.$inferInsert;

export const upsertSellerProfileSchema = z.object({
  business_name: z.string().max(200).optional().nullable(),
  logo_url: z.string().url().max(2000).optional().nullable(),
  contact_email: z.string().email().max(200).optional().nullable(),
  website_url: z.string().url().max(2000).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  slug: z.string().max(100).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, "Slug must be lowercase letters, numbers, and hyphens").optional().nullable(),
  shop_published: z.boolean().optional(),
  shop_banner_url: z.string().url().max(2000).optional().nullable(),
});

export const checkoutPages = pgTable("checkout_pages", {
  id: serial("id").primaryKey(),
  checkoutPageId: text("checkout_page_id").notNull().unique(),
  ownerUid: text("owner_uid").notNull(),
  walletId: integer("wallet_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  amountUsdc: bigint("amount_usdc", { mode: "number" }),
  amountLocked: boolean("amount_locked").notNull().default(true),
  allowedMethods: text("allowed_methods").array().notNull().default(["x402", "usdc_direct", "stripe_onramp", "base_pay"]),
  status: text("status").notNull().default("active"),
  successUrl: text("success_url"),
  successMessage: text("success_message"),
  pageType: text("page_type").notNull().default("product"),
  shopVisible: boolean("shop_visible").notNull().default(false),
  shopOrder: integer("shop_order").notNull().default(0),
  imageUrl: text("image_url"),
  collectBuyerName: boolean("collect_buyer_name").notNull().default(false),
  digitalProductUrl: text("digital_product_url"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  viewCount: integer("view_count").notNull().default(0),
  paymentCount: integer("payment_count").notNull().default(0),
  totalReceivedUsdc: bigint("total_received_usdc", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (table) => [
  index("checkout_pages_owner_uid_idx").on(table.ownerUid),
  index("checkout_pages_wallet_id_idx").on(table.walletId),
  index("checkout_pages_status_idx").on(table.status),
  index("checkout_pages_checkout_page_id_idx").on(table.checkoutPageId),
]);

export type CheckoutPage = typeof checkoutPages.$inferSelect;
export type InsertCheckoutPage = typeof checkoutPages.$inferInsert;

export const createCheckoutPageSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  wallet_id: z.number().int(),
  amount_usd: z.number().positive().optional().nullable(),
  amount_locked: z.boolean().default(true),
  allowed_methods: z.array(z.enum(["x402", "usdc_direct", "stripe_onramp", "base_pay", "testing"])).min(1).default(["x402", "usdc_direct", "stripe_onramp", "base_pay"]),
  success_url: z.string().url().optional().nullable(),
  success_message: z.string().max(500).optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
  page_type: z.enum(["product", "event", "digital_product"]).default("product").optional(),
  image_url: z.string().url().max(2000).optional().nullable(),
  collect_buyer_name: z.boolean().default(false).optional(),
  digital_product_url: z.string().url().max(2000).optional().nullable(),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  saleId: text("sale_id").notNull().unique(),
  checkoutPageId: text("checkout_page_id").notNull(),
  ownerUid: text("owner_uid").notNull(),
  amountUsdc: bigint("amount_usdc", { mode: "number" }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("pending"),
  buyerType: text("buyer_type"),
  buyerIdentifier: text("buyer_identifier"),
  buyerIp: text("buyer_ip"),
  buyerUserAgent: text("buyer_user_agent"),
  buyerEmail: text("buyer_email"),
  buyerName: text("buyer_name"),
  txHash: text("tx_hash"),
  stripeOnrampSessionId: text("stripe_onramp_session_id"),
  privyTransactionId: integer("privy_transaction_id"),
  checkoutTitle: text("checkout_title"),
  checkoutDescription: text("checkout_description"),
  invoiceId: text("invoice_id"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  x402Nonce: text("x402_nonce"),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("sales_owner_uid_idx").on(table.ownerUid),
  index("sales_checkout_page_id_idx").on(table.checkoutPageId),
  index("sales_status_idx").on(table.status),
  index("sales_payment_method_idx").on(table.paymentMethod),
  index("sales_created_at_idx").on(table.createdAt),
  index("sales_buyer_identifier_idx").on(table.buyerIdentifier),
  index("sales_invoice_id_idx").on(table.invoiceId),
  index("sales_x402_nonce_idx").on(table.x402Nonce),
]);

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

export const botCreateCheckoutPageSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  amount_usd: z.number().positive().optional().nullable(),
  amount_locked: z.boolean().default(true),
  allowed_methods: z.array(z.enum(["x402", "usdc_direct", "stripe_onramp", "base_pay", "testing"])).min(1).default(["x402", "usdc_direct", "stripe_onramp", "base_pay"]),
  success_url: z.string().url().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
  page_type: z.enum(["product", "event", "digital_product"]).default("product").optional(),
  image_url: z.string().url().max(2000).optional().nullable(),
  collect_buyer_name: z.boolean().default(false).optional(),
  digital_product_url: z.string().url().max(2000).optional().nullable(),
  shop_visible: z.boolean().default(false).optional(),
  shop_order: z.number().int().min(0).default(0).optional(),
});

export const botUpdateCheckoutPageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  amount_usd: z.number().positive().nullable().optional(),
  amount_locked: z.boolean().optional(),
  allowed_methods: z.array(z.enum(["x402", "usdc_direct", "stripe_onramp", "base_pay", "testing"])).min(1).optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
  success_url: z.string().url().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  page_type: z.enum(["product", "event", "digital_product"]).optional(),
  image_url: z.string().url().max(2000).nullable().optional(),
  collect_buyer_name: z.boolean().optional(),
  digital_product_url: z.string().url().max(2000).nullable().optional(),
  shop_visible: z.boolean().optional(),
  shop_order: z.number().int().min(0).optional(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().unique(),
  ownerUid: text("owner_uid").notNull(),
  checkoutPageId: text("checkout_page_id").notNull(),
  referenceNumber: text("reference_number").notNull().unique(),
  status: text("status").notNull().default("draft"),
  recipientName: text("recipient_name"),
  recipientEmail: text("recipient_email"),
  recipientType: text("recipient_type"),
  lineItems: jsonb("line_items").notNull().$type<Array<{
    description: string;
    quantity: number;
    unitPriceUsd: number;
    amountUsd: number;
  }>>(),
  subtotalUsdc: bigint("subtotal_usdc", { mode: "number" }).notNull(),
  taxUsdc: bigint("tax_usdc", { mode: "number" }).notNull().default(0),
  totalUsdc: bigint("total_usdc", { mode: "number" }).notNull(),
  paymentUrl: text("payment_url").notNull(),
  pdfUrl: text("pdf_url"),
  pdfGeneratedAt: timestamp("pdf_generated_at"),
  dueDate: timestamp("due_date"),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  paidAt: timestamp("paid_at"),
  saleId: text("sale_id"),
  senderName: text("sender_name"),
  senderEmail: text("sender_email"),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("invoices_owner_uid_idx").on(table.ownerUid),
  index("invoices_checkout_page_id_idx").on(table.checkoutPageId),
  index("invoices_reference_number_idx").on(table.referenceNumber),
  index("invoices_status_idx").on(table.status),
  index("invoices_sale_id_idx").on(table.saleId),
]);

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

export const basePayPayments = pgTable("base_pay_payments", {
  id: serial("id").primaryKey(),
  txId: text("tx_id").notNull().unique(),
  sender: text("sender"),
  recipient: text("recipient").notNull(),
  amountUsdc: bigint("amount_usdc", { mode: "number" }).notNull(),
  type: text("type").notNull(),
  checkoutPageId: text("checkout_page_id"),
  saleId: text("sale_id"),
  payerEmail: text("payer_email"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
}, (table) => [
  index("base_pay_payments_tx_id_idx").on(table.txId),
  index("base_pay_payments_recipient_idx").on(table.recipient),
  index("base_pay_payments_status_idx").on(table.status),
]);

export type BasePayPayment = typeof basePayPayments.$inferSelect;
export type InsertBasePayPayment = typeof basePayPayments.$inferInsert;

export const qrPayments = pgTable("qr_payments", {
  id: serial("id").primaryKey(),
  paymentId: text("payment_id").notNull().unique(),
  ownerUid: text("owner_uid").notNull(),
  walletAddress: text("wallet_address").notNull(),
  amountUsdc: bigint("amount_usdc", { mode: "number" }).notNull(),
  eip681Uri: text("eip681_uri").notNull(),
  balanceBefore: bigint("balance_before", { mode: "number" }).notNull(),
  creditedUsdc: bigint("credited_usdc", { mode: "number" }),
  status: text("status").notNull().default("waiting"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [
  index("qr_payments_payment_id_idx").on(table.paymentId),
  index("qr_payments_owner_uid_idx").on(table.ownerUid),
  index("qr_payments_status_idx").on(table.status),
]);

export type QrPayment = typeof qrPayments.$inferSelect;
export type InsertQrPayment = typeof qrPayments.$inferInsert;

// ─── Bot Pending Messages ────────────────────────────────────────────────────

export const botPendingMessages = pgTable("bot_pending_messages", {
  id: serial("id").primaryKey(),
  botId: text("bot_id").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  stagedAt: timestamp("staged_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").notNull().default("pending"),
}, (table) => [
  index("bot_pending_messages_bot_id_idx").on(table.botId),
  index("bot_pending_messages_status_idx").on(table.status),
  index("bot_pending_messages_expires_at_idx").on(table.expiresAt),
]);

export type BotPendingMessage = typeof botPendingMessages.$inferSelect;
export type InsertBotPendingMessage = typeof botPendingMessages.$inferInsert;

export const insertBotPendingMessageSchema = z.object({
  botId: z.string().min(1),
  eventType: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  expiresAt: z.date(),
});

export type InsertBotPendingMessageInput = z.infer<typeof insertBotPendingMessageSchema>;

export const createInvoiceSchema = z.object({
  checkout_page_id: z.string().min(1),
  recipient_name: z.string().max(200).optional().nullable(),
  recipient_email: z.string().email().max(200).optional().nullable(),
  recipient_type: z.enum(["human", "bot", "agent"]).optional().nullable(),
  line_items: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unit_price_usd: z.number().min(0),
  })).min(1),
  tax_usd: z.number().min(0).optional().default(0),
  due_date: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

// ─── Brand Index (agent-searchable brand/vendor registry) ────────────────────

export const brandIndex = pgTable("brand_index", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  domain: text("domain").notNull().unique(),
  url: text("url").notNull(),
  logoUrl: text("logo_url"),
  description: text("description").notNull(),

  sector: text("sector").notNull(),
  subSectors: text("sub_sectors").array().notNull().default([]),
  tier: text("tier"),
  brandType: text("brand_type"),
  tags: text("tags").array().default([]),

  carriesBrands: text("carries_brands").array().default([]),

  hasMcp: boolean("has_mcp").notNull().default(false),
  mcpUrl: text("mcp_url"),
  hasApi: boolean("has_api").notNull().default(false),
  apiEndpoint: text("api_endpoint"),
  apiAuthRequired: boolean("api_auth_required").default(false),
  apiDocsUrl: text("api_docs_url"),
  hasCli: boolean("has_cli").notNull().default(false),
  cliInstallCommand: text("cli_install_command"),
  siteSearch: boolean("site_search").notNull().default(true),
  productFeed: boolean("product_feed").notNull().default(false),

  capabilities: text("capabilities").array().notNull().default([]),
  checkoutMethods: text("checkout_methods").array().notNull().default([]),

  ordering: text("ordering"),
  checkoutProvider: text("checkout_provider"),
  paymentMethodsAccepted: text("payment_methods_accepted").array().default([]),
  creditclawSupports: text("creditclaw_supports").array().default([]),
  businessAccount: boolean("business_account").default(false),
  taxExemptSupported: boolean("tax_exempt_supported").default(false),
  poNumberSupported: boolean("po_number_supported").default(false),

  deliveryOptions: text("delivery_options").array().default([]),
  freeShippingThreshold: numeric("free_shipping_threshold"),
  shipsInternationally: boolean("ships_internationally").default(false),
  supportedCountries: text("supported_countries").array().default([]),

  hasDeals: boolean("has_deals").default(false),
  dealsUrl: text("deals_url"),
  dealsApi: text("deals_api"),
  loyaltyProgram: text("loyalty_program"),

  maturity: text("maturity").notNull().default("draft"),
  claimedBy: text("claimed_by"),
  claimId: integer("claim_id"),
  submittedBy: text("submitted_by").notNull(),
  submitterType: text("submitter_type").notNull().default("ai_generated"),

  version: text("version").notNull().default("1.0.0"),
  lastVerified: text("last_verified"),
  activeVersionId: integer("active_version_id"),

  overallScore: integer("overall_score"),
  scoreBreakdown: jsonb("score_breakdown"),
  recommendations: jsonb("recommendations"),
  scanTier: text("scan_tier"),
  lastScannedAt: timestamp("last_scanned_at"),
  lastScannedBy: text("last_scanned_by"),

  ratingSearchAccuracy: numeric("rating_search_accuracy"),
  ratingStockReliability: numeric("rating_stock_reliability"),
  ratingCheckoutCompletion: numeric("rating_checkout_completion"),
  axsRating: numeric("axs_rating"),
  ratingCount: integer("rating_count").default(0),

  brandData: jsonb("brand_data").notNull(),
  skillMd: text("skill_md"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("brand_index_sector_idx").on(table.sector),
  index("brand_index_tier_idx").on(table.tier),
  index("brand_index_maturity_idx").on(table.maturity),
  index("brand_index_score_idx").on(table.overallScore),
]);

export type BrandIndex = typeof brandIndex.$inferSelect;
export type InsertBrandIndex = typeof brandIndex.$inferInsert;

// ─── Brand Feedback ──────────────────────────────────────────────────────────

export const brandFeedback = pgTable("brand_feedback", {
  id: serial("id").primaryKey(),
  brandSlug: text("brand_slug").notNull(),
  source: text("source").notNull().default("agent"),
  authenticated: boolean("authenticated").notNull().default(false),
  botId: text("bot_id"),
  reviewerUid: text("reviewer_uid"),
  searchAccuracy: integer("search_accuracy").notNull(),
  stockReliability: integer("stock_reliability").notNull(),
  checkoutCompletion: integer("checkout_completion").notNull(),
  checkoutMethod: text("checkout_method").notNull(),
  outcome: text("outcome").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("brand_feedback_slug_idx").on(table.brandSlug),
  index("brand_feedback_created_idx").on(table.createdAt),
  index("brand_feedback_slug_recent_idx").on(table.brandSlug, table.createdAt),
]);

export type BrandFeedback = typeof brandFeedback.$inferSelect;
export type InsertBrandFeedback = typeof brandFeedback.$inferInsert;

export const insertBrandFeedbackSchema = z.object({
  brandSlug: z.string().min(1),
  searchAccuracy: z.number().int().min(1).max(5),
  stockReliability: z.number().int().min(1).max(5),
  checkoutCompletion: z.number().int().min(1).max(5),
  checkoutMethod: z.enum(["native_api", "browser_automation", "x402", "acp", "crossmint_world"]),
  outcome: z.enum(["success", "checkout_failed", "search_failed", "out_of_stock", "price_mismatch", "flow_changed"]),
  comment: z.string().max(500).optional(),
});

// ─── Brand Claims ────────────────────────────────────────────────────────────

export const brandClaims = pgTable("brand_claims", {
  id: serial("id").primaryKey(),
  brandSlug: text("brand_slug").notNull(),
  claimerUid: text("claimer_uid").notNull(),
  claimerEmail: text("claimer_email").notNull(),
  claimType: text("claim_type").notNull().default("domain_match"),
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  verifiedAt: timestamp("verified_at"),
  revokedAt: timestamp("revoked_at"),
  reviewedBy: text("reviewed_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("brand_claims_brand_slug_idx").on(table.brandSlug),
  index("brand_claims_claimer_uid_idx").on(table.claimerUid),
  index("brand_claims_status_idx").on(table.status),
]);

export type BrandClaim = typeof brandClaims.$inferSelect;
export type InsertBrandClaim = typeof brandClaims.$inferInsert;

// ─── Scan Queue ──────────────────────────────────────────────────────────────

export const scanQueue = pgTable("scan_queue", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull(),
  status: text("status").notNull().default("pending"),
  priority: integer("priority").notNull().default(0),
  error: text("error"),
  resultSlug: text("result_slug"),
  resultScore: integer("result_score"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("scan_queue_status_idx").on(table.status),
  index("scan_queue_domain_idx").on(table.domain),
  index("scan_queue_priority_status_idx").on(table.priority, table.status),
]);

export type ScanQueueEntry = typeof scanQueue.$inferSelect;
export type InsertScanQueueEntry = typeof scanQueue.$inferInsert;

// ─── Google Product Taxonomy ─────────────────────────────────────────────────

export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  parentId: integer("parent_id"),
  depth: integer("depth").notNull().default(1),
  path: text("path").notNull(),
}, (table) => [
  index("product_categories_parent_idx").on(table.parentId),
  index("product_categories_depth_idx").on(table.depth),
  index("product_categories_slug_idx").on(table.slug),
]);

export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = typeof productCategories.$inferInsert;

export const brandCategories = pgTable("brand_categories", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").notNull(),
  categoryId: integer("category_id").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("brand_categories_brand_idx").on(table.brandId),
  index("brand_categories_category_idx").on(table.categoryId),
  uniqueIndex("brand_categories_brand_category_uniq").on(table.brandId, table.categoryId),
]);

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const categoryKeywords = pgTable("category_keywords", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  categoryName: text("category_name").notNull(),
  categoryPath: text("category_path").notNull(),
  keywords: text("keywords").array().notNull(),
  keywordsTsv: tsvector("keywords_tsv"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("category_keywords_category_id_uniq").on(table.categoryId),
  index("category_keywords_tsv_idx").using("gin", table.keywordsTsv),
]);

export type CategoryKeyword = typeof categoryKeywords.$inferSelect;
export type InsertCategoryKeyword = typeof categoryKeywords.$inferInsert;

const vector384 = customType<{ data: number[] }>({
  dataType() {
    return "vector(384)";
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown) {
    if (typeof value === "string") {
      return value.replace(/[\[\]]/g, "").split(",").map(Number);
    }
    return value as number[];
  },
});

export const productListings = pgTable("product_listings", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  inStock: boolean("in_stock").notNull().default(true),
  imageUrl: text("image_url"),
  productUrl: text("product_url").notNull(),
  categoryId: integer("category_id"),
  brandName: text("brand_name"),
  upc: text("upc"),
  gtin: text("gtin"),
  mpn: text("mpn"),
  feedSource: text("feed_source"),
  feedItemId: text("feed_item_id"),
  embedding: vector384("embedding"),
  lastSynced: timestamp("last_synced").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("product_listings_brand_feed_uniq").on(table.brandId, table.feedItemId),
  index("product_listings_brand_id_idx").on(table.brandId),
  index("product_listings_category_id_idx").on(table.categoryId),
]);

export type ProductListing = typeof productListings.$inferSelect;
export type InsertProductListing = typeof productListings.$inferInsert;

export const agentTestSessions = pgTable("agent_test_sessions", {
  id: serial("id").primaryKey(),
  testId: text("test_id").notNull().unique(),
  checkoutPageId: text("checkout_page_id").notNull(),
  checkoutType: text("checkout_type").notNull().default("basic"),
  expectedValues: jsonb("expected_values").notNull(),
  submittedValues: jsonb("submitted_values"),
  ownerUid: text("owner_uid"),
  cardId: text("card_id"),
  cardTestToken: text("card_test_token"),
  botId: text("bot_id"),
  approvalRequired: boolean("approval_required").notNull().default(false),
  status: text("status").notNull().default("created"),
  totalFields: integer("total_fields").notNull().default(6),
  fieldsFilled: integer("fields_filled").notNull().default(0),
  pageLoadedAt: timestamp("page_loaded_at"),
  firstInteractionAt: timestamp("first_interaction_at"),
  submittedAt: timestamp("submitted_at"),
  score: integer("score"),
  grade: text("grade"),
  report: jsonb("report"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (table) => [
  index("agent_test_sessions_card_id_idx").on(table.cardId),
  index("agent_test_sessions_owner_uid_idx").on(table.ownerUid),
  index("agent_test_sessions_status_idx").on(table.status),
]);

export type AgentTestSession = typeof agentTestSessions.$inferSelect;
export type InsertAgentTestSession = typeof agentTestSessions.$inferInsert;

export const agentTestFieldEvents = pgTable("agent_test_field_events", {
  id: serial("id").primaryKey(),
  testId: text("test_id").notNull(),
  eventType: text("event_type").notNull(),
  fieldName: text("field_name"),
  valueLength: integer("value_length").notNull().default(0),
  sequenceNum: integer("sequence_num").notNull(),
  eventTimestamp: timestamp("event_timestamp").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("agent_test_field_events_test_id_idx").on(table.testId),
  index("agent_test_field_events_test_id_seq_idx").on(table.testId, table.sequenceNum),
]);

export type AgentTestFieldEvent = typeof agentTestFieldEvents.$inferSelect;
export type InsertAgentTestFieldEvent = typeof agentTestFieldEvents.$inferInsert;
