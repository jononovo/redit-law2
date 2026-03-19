ALTER TABLE "bots" ADD COLUMN "tunnel_id" text;--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "tunnel_token" text;--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "tunnel_status" text DEFAULT 'none' NOT NULL;