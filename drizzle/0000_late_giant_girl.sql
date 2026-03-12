CREATE TABLE "api_access_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"status_code" integer NOT NULL,
	"ip" text,
	"user_agent" text,
	"response_time_ms" integer,
	"error_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_pay_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tx_id" text NOT NULL,
	"sender" text,
	"recipient" text NOT NULL,
	"amount_usdc" bigint NOT NULL,
	"type" text NOT NULL,
	"checkout_page_id" text,
	"sale_id" text,
	"payer_email" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp,
	CONSTRAINT "base_pay_payments_tx_id_unique" UNIQUE("tx_id")
);
--> statement-breakpoint
CREATE TABLE "bots" (
	"id" serial PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"bot_name" text NOT NULL,
	"description" text,
	"owner_email" text NOT NULL,
	"owner_uid" text,
	"api_key_hash" text NOT NULL,
	"api_key_prefix" text NOT NULL,
	"claim_token" text,
	"wallet_status" text DEFAULT 'pending' NOT NULL,
	"callback_url" text,
	"webhook_secret" text,
	"default_rail" text,
	"claimed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bots_bot_id_unique" UNIQUE("bot_id"),
	CONSTRAINT "bots_claim_token_unique" UNIQUE("claim_token")
);
--> statement-breakpoint
CREATE TABLE "checkout_confirmations" (
	"id" serial PRIMARY KEY NOT NULL,
	"confirmation_id" text NOT NULL,
	"card_id" text NOT NULL,
	"bot_id" text NOT NULL,
	"profile_index" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"merchant_name" text NOT NULL,
	"merchant_url" text NOT NULL,
	"item_name" text NOT NULL,
	"category" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"hmac_token" text,
	"expires_at" timestamp,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_confirmations_confirmation_id_unique" UNIQUE("confirmation_id")
);
--> statement-breakpoint
CREATE TABLE "checkout_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"checkout_page_id" text NOT NULL,
	"owner_uid" text NOT NULL,
	"wallet_id" integer NOT NULL,
	"wallet_address" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"amount_usdc" bigint,
	"amount_locked" boolean DEFAULT true NOT NULL,
	"allowed_methods" text[] DEFAULT '{"x402","usdc_direct","stripe_onramp","base_pay"}' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"success_url" text,
	"success_message" text,
	"seller_name" text,
	"seller_logo_url" text,
	"seller_email" text,
	"page_type" text DEFAULT 'product' NOT NULL,
	"shop_visible" boolean DEFAULT false NOT NULL,
	"shop_order" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"collect_buyer_name" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"view_count" integer DEFAULT 0 NOT NULL,
	"payment_count" integer DEFAULT 0 NOT NULL,
	"total_received_usdc" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "checkout_pages_checkout_page_id_unique" UNIQUE("checkout_page_id")
);
--> statement-breakpoint
CREATE TABLE "crossmint_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"transaction_id" integer NOT NULL,
	"amount_usdc" bigint NOT NULL,
	"product_locator" text NOT NULL,
	"product_name" text,
	"shipping_address" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"decided_by" text,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crossmint_guardrails" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"max_per_tx_usdc" integer DEFAULT 5 NOT NULL,
	"daily_budget_usdc" integer DEFAULT 10 NOT NULL,
	"monthly_budget_usdc" integer DEFAULT 50 NOT NULL,
	"require_approval_above" integer DEFAULT 0 NOT NULL,
	"approval_mode" text DEFAULT 'ask_for_everything' NOT NULL,
	"recurring_allowed" boolean DEFAULT false NOT NULL,
	"auto_pause_on_zero" boolean DEFAULT true NOT NULL,
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "crossmint_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount_usdc" bigint NOT NULL,
	"crossmint_order_id" text,
	"product_locator" text,
	"product_name" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"order_status" text,
	"shipping_address" jsonb,
	"tracking_info" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"balance_after" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crossmint_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"owner_uid" text NOT NULL,
	"crossmint_wallet_id" text NOT NULL,
	"address" text NOT NULL,
	"balance_usdc" bigint DEFAULT 0 NOT NULL,
	"chain" text DEFAULT 'base' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"owner_uid" text NOT NULL,
	"checkout_page_id" text NOT NULL,
	"reference_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"recipient_name" text,
	"recipient_email" text,
	"recipient_type" text,
	"line_items" jsonb NOT NULL,
	"subtotal_usdc" bigint NOT NULL,
	"tax_usdc" bigint DEFAULT 0 NOT NULL,
	"total_usdc" bigint NOT NULL,
	"payment_url" text NOT NULL,
	"pdf_url" text,
	"pdf_generated_at" timestamp,
	"due_date" timestamp,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"paid_at" timestamp,
	"sale_id" text,
	"sender_name" text,
	"sender_email" text,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_id_unique" UNIQUE("invoice_id"),
	CONSTRAINT "invoices_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "master_guardrails" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_uid" text NOT NULL,
	"max_per_tx_usdc" integer DEFAULT 5 NOT NULL,
	"daily_budget_usdc" integer DEFAULT 20 NOT NULL,
	"monthly_budget_usdc" integer DEFAULT 100 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "master_guardrails_owner_uid_unique" UNIQUE("owner_uid")
);
--> statement-breakpoint
CREATE TABLE "merchant_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_uid" text NOT NULL,
	"vendor_id" integer NOT NULL,
	"bot_id" text,
	"account_identifier" text,
	"encrypted_credentials" text,
	"encryption_method" text,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_uid" text NOT NULL,
	"transaction_alerts" boolean DEFAULT true NOT NULL,
	"budget_warnings" boolean DEFAULT true NOT NULL,
	"weekly_summary" boolean DEFAULT false NOT NULL,
	"purchase_over_threshold_cents" integer DEFAULT 5000 NOT NULL,
	"balance_low_cents" integer DEFAULT 500 NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_owner_uid_unique" UNIQUE("owner_uid")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_uid" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"bot_id" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obfuscation_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"bot_id" text,
	"profile_index" integer NOT NULL,
	"merchant_name" text NOT NULL,
	"merchant_slug" text NOT NULL,
	"item_name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"confirmation_id" text,
	"occurred_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obfuscation_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"bot_id" text,
	"phase" text DEFAULT 'warmup' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"activated_at" timestamp DEFAULT now() NOT NULL,
	"last_organic_at" timestamp,
	"last_obfuscation_at" timestamp,
	"organic_count" integer DEFAULT 0 NOT NULL,
	"obfuscation_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "obfuscation_state_card_id_unique" UNIQUE("card_id")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_uid" text NOT NULL,
	"rail" text NOT NULL,
	"bot_id" text,
	"bot_name" text,
	"wallet_id" integer,
	"card_id" text,
	"transaction_id" integer,
	"external_order_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"vendor" text,
	"vendor_id" integer,
	"vendor_details" jsonb,
	"product_name" text,
	"product_image_url" text,
	"product_url" text,
	"product_short_description" text,
	"sku" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price_cents" integer,
	"price_currency" text DEFAULT 'USD' NOT NULL,
	"taxes_cents" integer,
	"shipping_price_cents" integer,
	"shipping_type" text,
	"shipping_note" text,
	"shipping_address" jsonb,
	"tracking_info" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owners" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"stripe_customer_id" text,
	"flags" text[] DEFAULT '{}' NOT NULL,
	"onboarded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "owners_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "pairing_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"owner_uid" text NOT NULL,
	"bot_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"claimed_at" timestamp,
	CONSTRAINT "pairing_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "payment_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_link_id" text NOT NULL,
	"bot_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"description" text NOT NULL,
	"payer_email" text,
	"stripe_checkout_session_id" text,
	"checkout_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_links_payment_link_id_unique" UNIQUE("payment_link_id")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_uid" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_pm_id" text NOT NULL,
	"card_last4" text,
	"card_brand" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_methods_stripe_pm_id_unique" UNIQUE("stripe_pm_id")
);
--> statement-breakpoint
CREATE TABLE "privy_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"transaction_id" integer NOT NULL,
	"amount_usdc" bigint NOT NULL,
	"resource_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"decided_at" timestamp,
	"decided_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privy_guardrails" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"max_per_tx_usdc" integer DEFAULT 5 NOT NULL,
	"daily_budget_usdc" integer DEFAULT 10 NOT NULL,
	"monthly_budget_usdc" integer DEFAULT 50 NOT NULL,
	"require_approval_above" integer,
	"approval_mode" text DEFAULT 'ask_for_everything' NOT NULL,
	"recurring_allowed" boolean DEFAULT false NOT NULL,
	"auto_pause_on_zero" boolean DEFAULT true NOT NULL,
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "privy_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount_usdc" bigint NOT NULL,
	"recipient_address" text,
	"resource_url" text,
	"tx_hash" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"stripe_session_id" text,
	"metadata" jsonb,
	"balance_after" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "privy_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"owner_uid" text NOT NULL,
	"privy_wallet_id" text NOT NULL,
	"address" text NOT NULL,
	"balance_usdc" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procurement_controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_uid" text NOT NULL,
	"scope" text NOT NULL,
	"scope_ref_id" text,
	"allowlisted_domains" jsonb DEFAULT '[]'::jsonb,
	"blocklisted_domains" jsonb DEFAULT '[]'::jsonb,
	"allowlisted_merchants" jsonb DEFAULT '[]'::jsonb,
	"blocklisted_merchants" jsonb DEFAULT '[]'::jsonb,
	"allowlisted_categories" jsonb DEFAULT '[]'::jsonb,
	"blocklisted_categories" jsonb DEFAULT '[]'::jsonb,
	"approval_mode" text,
	"approval_threshold_cents" integer,
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "profile_allowance_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"bot_id" text,
	"profile_index" integer NOT NULL,
	"window_start" timestamp NOT NULL,
	"spent_cents" integer DEFAULT 0 NOT NULL,
	"exempt_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qr_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"owner_uid" text NOT NULL,
	"wallet_address" text NOT NULL,
	"amount_usdc" bigint NOT NULL,
	"eip681_uri" text NOT NULL,
	"balance_before" bigint NOT NULL,
	"credited_usdc" bigint,
	"status" text DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "qr_payments_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "rail4_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"owner_uid" text NOT NULL,
	"card_name" text DEFAULT 'Untitled Card' NOT NULL,
	"use_case" text,
	"bot_id" text,
	"decoy_filename" text NOT NULL,
	"real_profile_index" integer NOT NULL,
	"missing_digit_positions" integer[] NOT NULL,
	"missing_digits_value" text NOT NULL,
	"expiry_month" integer,
	"expiry_year" integer,
	"owner_name" text,
	"owner_zip" text,
	"owner_ip" text,
	"status" text DEFAULT 'pending_setup' NOT NULL,
	"fake_profiles_json" text NOT NULL,
	"profile_permissions" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rail4_cards_card_id_unique" UNIQUE("card_id")
);
--> statement-breakpoint
CREATE TABLE "rail4_guardrails" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"max_per_tx_cents" integer DEFAULT 500 NOT NULL,
	"daily_budget_cents" integer DEFAULT 1000 NOT NULL,
	"monthly_budget_cents" integer DEFAULT 5000 NOT NULL,
	"require_approval_above" integer,
	"approval_mode" text DEFAULT 'ask_for_everything' NOT NULL,
	"recurring_allowed" boolean DEFAULT false NOT NULL,
	"auto_pause_on_zero" boolean DEFAULT false NOT NULL,
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "rail5_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"owner_uid" text NOT NULL,
	"bot_id" text,
	"card_name" text DEFAULT 'Untitled Card' NOT NULL,
	"encrypted_key_hex" text DEFAULT '' NOT NULL,
	"encrypted_iv_hex" text DEFAULT '' NOT NULL,
	"encrypted_tag_hex" text DEFAULT '' NOT NULL,
	"card_last4" text DEFAULT '' NOT NULL,
	"card_brand" text DEFAULT 'visa' NOT NULL,
	"status" text DEFAULT 'pending_setup' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rail5_cards_card_id_unique" UNIQUE("card_id")
);
--> statement-breakpoint
CREATE TABLE "rail5_checkouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"checkout_id" text NOT NULL,
	"card_id" text NOT NULL,
	"bot_id" text NOT NULL,
	"owner_uid" text NOT NULL,
	"merchant_name" text NOT NULL,
	"merchant_url" text NOT NULL,
	"item_name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"category" text,
	"status" text DEFAULT 'approved' NOT NULL,
	"key_delivered" boolean DEFAULT false NOT NULL,
	"balance_after" integer,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rail5_checkouts_checkout_id_unique" UNIQUE("checkout_id")
);
--> statement-breakpoint
CREATE TABLE "rail5_guardrails" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"max_per_tx_cents" integer DEFAULT 5000 NOT NULL,
	"daily_budget_cents" integer DEFAULT 10000 NOT NULL,
	"monthly_budget_cents" integer DEFAULT 50000 NOT NULL,
	"require_approval_above" integer,
	"approval_mode" text DEFAULT 'auto_approve_under_threshold' NOT NULL,
	"recurring_allowed" boolean DEFAULT false NOT NULL,
	"auto_pause_on_zero" boolean DEFAULT false NOT NULL,
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "reconciliation_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"bot_id" text NOT NULL,
	"expected_cents" integer NOT NULL,
	"actual_cents" integer NOT NULL,
	"diff_cents" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" text NOT NULL,
	"checkout_page_id" text NOT NULL,
	"owner_uid" text NOT NULL,
	"amount_usdc" bigint NOT NULL,
	"payment_method" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"buyer_type" text,
	"buyer_identifier" text,
	"buyer_ip" text,
	"buyer_user_agent" text,
	"buyer_email" text,
	"buyer_name" text,
	"tx_hash" text,
	"stripe_onramp_session_id" text,
	"privy_transaction_id" integer,
	"checkout_title" text,
	"checkout_description" text,
	"invoice_id" text,
	"metadata" jsonb,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_sale_id_unique" UNIQUE("sale_id")
);
--> statement-breakpoint
CREATE TABLE "seller_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_uid" text NOT NULL,
	"business_name" text,
	"logo_url" text,
	"contact_email" text,
	"website_url" text,
	"description" text,
	"slug" text,
	"shop_published" boolean DEFAULT false NOT NULL,
	"shop_banner_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "seller_profiles_owner_uid_unique" UNIQUE("owner_uid"),
	CONSTRAINT "seller_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "shipping_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_uid" text NOT NULL,
	"label" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"line1" text NOT NULL,
	"line2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"postal_code" text NOT NULL,
	"country" text DEFAULT 'US' NOT NULL,
	"phone" text,
	"email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_url" text NOT NULL,
	"vendor_slug" text,
	"vendor_data" jsonb NOT NULL,
	"confidence" jsonb NOT NULL,
	"review_needed" text[] DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"auto_publish" boolean DEFAULT false NOT NULL,
	"created_by" text DEFAULT 'skill_builder' NOT NULL,
	"submitter_uid" text,
	"submitter_email" text,
	"submitter_name" text,
	"submitter_type" text DEFAULT 'system' NOT NULL,
	"submission_source" text DEFAULT 'admin' NOT NULL,
	"warnings" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"draft_id" integer NOT NULL,
	"field" text NOT NULL,
	"source" text NOT NULL,
	"url" text,
	"snippet" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_exports" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_slug" text NOT NULL,
	"version_id" integer NOT NULL,
	"destination" text NOT NULL,
	"exported_by" text,
	"exported_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_submitter_profiles" (
	"owner_uid" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"email" text,
	"skills_submitted" integer DEFAULT 0 NOT NULL,
	"skills_published" integer DEFAULT 0 NOT NULL,
	"skills_rejected" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_slug" text NOT NULL,
	"version" text NOT NULL,
	"vendor_data" jsonb NOT NULL,
	"skill_md" text NOT NULL,
	"skill_json" jsonb,
	"payments_md" text,
	"description_md" text,
	"checksum" text NOT NULL,
	"change_type" text NOT NULL,
	"change_summary" text,
	"changed_fields" jsonb,
	"previous_version_id" integer,
	"published_by" text,
	"source_type" text NOT NULL,
	"source_draft_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"exported_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topup_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"stripe_payment_intent_id" text,
	"description" text,
	"balance_after" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unified_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"approval_id" text NOT NULL,
	"rail" text NOT NULL,
	"owner_uid" text NOT NULL,
	"owner_email" text NOT NULL,
	"bot_name" text NOT NULL,
	"amount_display" text NOT NULL,
	"amount_raw" integer NOT NULL,
	"merchant_name" text NOT NULL,
	"item_name" text,
	"hmac_token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"decided_at" timestamp,
	"rail_ref" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unified_approvals_approval_id_unique" UNIQUE("approval_id")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"website_url" text,
	"logo_url" text,
	"vendor_type" text,
	"ordering_system" text,
	"config" jsonb,
	"supported_countries" text[] DEFAULT '{"US"}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'hero' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_entries_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"owner_uid" text NOT NULL,
	"balance_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"is_frozen" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_bot_id_unique" UNIQUE("bot_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"event_type" text NOT NULL,
	"callback_url" text NOT NULL,
	"payload" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"last_attempt_at" timestamp,
	"next_retry_at" timestamp,
	"response_status" integer,
	"response_body" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "base_pay_payments_tx_id_idx" ON "base_pay_payments" USING btree ("tx_id");--> statement-breakpoint
CREATE INDEX "base_pay_payments_recipient_idx" ON "base_pay_payments" USING btree ("recipient");--> statement-breakpoint
CREATE INDEX "base_pay_payments_status_idx" ON "base_pay_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "checkout_confirmations_card_idx" ON "checkout_confirmations" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "checkout_confirmations_bot_idx" ON "checkout_confirmations" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "checkout_confirmations_confirmation_idx" ON "checkout_confirmations" USING btree ("confirmation_id");--> statement-breakpoint
CREATE INDEX "checkout_pages_owner_uid_idx" ON "checkout_pages" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "checkout_pages_wallet_id_idx" ON "checkout_pages" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "checkout_pages_status_idx" ON "checkout_pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "checkout_pages_checkout_page_id_idx" ON "checkout_pages" USING btree ("checkout_page_id");--> statement-breakpoint
CREATE INDEX "crossmint_approvals_wallet_id_idx" ON "crossmint_approvals" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "crossmint_approvals_status_idx" ON "crossmint_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crossmint_guardrails_wallet_id_idx" ON "crossmint_guardrails" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "crossmint_transactions_wallet_id_idx" ON "crossmint_transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "crossmint_transactions_status_idx" ON "crossmint_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crossmint_transactions_type_idx" ON "crossmint_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "crossmint_transactions_order_id_idx" ON "crossmint_transactions" USING btree ("crossmint_order_id");--> statement-breakpoint
CREATE INDEX "crossmint_wallets_bot_id_idx" ON "crossmint_wallets" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "crossmint_wallets_owner_uid_idx" ON "crossmint_wallets" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "crossmint_wallets_address_idx" ON "crossmint_wallets" USING btree ("address");--> statement-breakpoint
CREATE INDEX "invoices_owner_uid_idx" ON "invoices" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "invoices_checkout_page_id_idx" ON "invoices" USING btree ("checkout_page_id");--> statement-breakpoint
CREATE INDEX "invoices_reference_number_idx" ON "invoices" USING btree ("reference_number");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_sale_id_idx" ON "invoices" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "master_guardrails_owner_uid_idx" ON "master_guardrails" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "merchant_accounts_owner_uid_idx" ON "merchant_accounts" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "merchant_accounts_vendor_id_idx" ON "merchant_accounts" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "notifications_owner_created_idx" ON "notifications" USING btree ("owner_uid","created_at");--> statement-breakpoint
CREATE INDEX "obfuscation_events_card_id_idx" ON "obfuscation_events" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "obfuscation_events_card_status_idx" ON "obfuscation_events" USING btree ("card_id","status");--> statement-breakpoint
CREATE INDEX "orders_owner_uid_idx" ON "orders" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "orders_rail_idx" ON "orders" USING btree ("rail");--> statement-breakpoint
CREATE INDEX "orders_bot_id_idx" ON "orders" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "orders_wallet_id_idx" ON "orders" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "orders_card_id_idx" ON "orders" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "orders_external_order_id_idx" ON "orders" USING btree ("external_order_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_vendor_id_idx" ON "orders" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "owners_uid_idx" ON "owners" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "pairing_codes_code_idx" ON "pairing_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "pairing_codes_owner_idx" ON "pairing_codes" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "payment_links_bot_created_idx" ON "payment_links" USING btree ("bot_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_links_stripe_session_idx" ON "payment_links" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE INDEX "privy_approvals_wallet_id_idx" ON "privy_approvals" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "privy_approvals_status_idx" ON "privy_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "privy_guardrails_wallet_id_idx" ON "privy_guardrails" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "privy_transactions_wallet_id_idx" ON "privy_transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "privy_transactions_status_idx" ON "privy_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "privy_transactions_type_idx" ON "privy_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "privy_wallets_bot_id_idx" ON "privy_wallets" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "privy_wallets_owner_uid_idx" ON "privy_wallets" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "privy_wallets_address_idx" ON "privy_wallets" USING btree ("address");--> statement-breakpoint
CREATE INDEX "procurement_controls_owner_uid_idx" ON "procurement_controls" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "procurement_controls_scope_idx" ON "procurement_controls" USING btree ("owner_uid","scope","scope_ref_id");--> statement-breakpoint
CREATE INDEX "profile_allowance_card_profile_idx" ON "profile_allowance_usage" USING btree ("card_id","profile_index");--> statement-breakpoint
CREATE INDEX "qr_payments_payment_id_idx" ON "qr_payments" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "qr_payments_owner_uid_idx" ON "qr_payments" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "qr_payments_status_idx" ON "qr_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rail4_cards_card_id_idx" ON "rail4_cards" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "rail4_cards_owner_uid_idx" ON "rail4_cards" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "rail4_cards_bot_id_idx" ON "rail4_cards" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "rail4_cards_status_idx" ON "rail4_cards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rail4_guardrails_card_id_idx" ON "rail4_guardrails" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "rail5_cards_card_id_idx" ON "rail5_cards" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "rail5_cards_owner_uid_idx" ON "rail5_cards" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "rail5_cards_bot_id_idx" ON "rail5_cards" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "rail5_cards_status_idx" ON "rail5_cards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rail5_checkouts_checkout_id_idx" ON "rail5_checkouts" USING btree ("checkout_id");--> statement-breakpoint
CREATE INDEX "rail5_checkouts_card_id_idx" ON "rail5_checkouts" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "rail5_checkouts_bot_id_idx" ON "rail5_checkouts" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "rail5_checkouts_status_idx" ON "rail5_checkouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rail5_guardrails_card_id_idx" ON "rail5_guardrails" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "sales_owner_uid_idx" ON "sales" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "sales_checkout_page_id_idx" ON "sales" USING btree ("checkout_page_id");--> statement-breakpoint
CREATE INDEX "sales_status_idx" ON "sales" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sales_payment_method_idx" ON "sales" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX "sales_created_at_idx" ON "sales" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sales_buyer_identifier_idx" ON "sales" USING btree ("buyer_identifier");--> statement-breakpoint
CREATE INDEX "sales_invoice_id_idx" ON "sales" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "shipping_addresses_owner_uid_idx" ON "shipping_addresses" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "shipping_addresses_is_default_idx" ON "shipping_addresses" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "skill_drafts_status_idx" ON "skill_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "skill_drafts_vendor_slug_idx" ON "skill_drafts" USING btree ("vendor_slug");--> statement-breakpoint
CREATE INDEX "skill_drafts_submitter_uid_idx" ON "skill_drafts" USING btree ("submitter_uid");--> statement-breakpoint
CREATE INDEX "skill_evidence_draft_id_idx" ON "skill_evidence" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "skill_exports_vendor_dest_idx" ON "skill_exports" USING btree ("vendor_slug","destination");--> statement-breakpoint
CREATE INDEX "skill_versions_vendor_active_idx" ON "skill_versions" USING btree ("vendor_slug","is_active");--> statement-breakpoint
CREATE INDEX "skill_versions_vendor_created_idx" ON "skill_versions" USING btree ("vendor_slug","created_at");--> statement-breakpoint
CREATE INDEX "unified_approvals_approval_id_idx" ON "unified_approvals" USING btree ("approval_id");--> statement-breakpoint
CREATE INDEX "unified_approvals_owner_uid_idx" ON "unified_approvals" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "unified_approvals_status_idx" ON "unified_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "unified_approvals_rail_idx" ON "unified_approvals" USING btree ("rail");--> statement-breakpoint
CREATE INDEX "vendors_slug_idx" ON "vendors" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_bot_created_idx" ON "webhook_deliveries" USING btree ("bot_id","created_at");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_status_retry_idx" ON "webhook_deliveries" USING btree ("status","next_retry_at");