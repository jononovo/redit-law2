CREATE TABLE "bot_pending_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"staged_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crossmint_approvals" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "privy_approvals" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "crossmint_approvals" CASCADE;--> statement-breakpoint
DROP TABLE "privy_approvals" CASCADE;--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "webhook_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "webhook_fail_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "checkout_pages" ADD COLUMN "digital_product_url" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "x402_nonce" text;--> statement-breakpoint
CREATE INDEX "bot_pending_messages_bot_id_idx" ON "bot_pending_messages" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "bot_pending_messages_status_idx" ON "bot_pending_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bot_pending_messages_expires_at_idx" ON "bot_pending_messages" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sales_x402_nonce_idx" ON "sales" USING btree ("x402_nonce");--> statement-breakpoint
ALTER TABLE "checkout_pages" DROP COLUMN "seller_name";--> statement-breakpoint
ALTER TABLE "checkout_pages" DROP COLUMN "seller_logo_url";--> statement-breakpoint
ALTER TABLE "checkout_pages" DROP COLUMN "seller_email";