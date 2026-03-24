CREATE TABLE "brand_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_slug" text NOT NULL,
	"claimer_uid" text NOT NULL,
	"claimer_email" text NOT NULL,
	"claim_type" text DEFAULT 'domain_match' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"verified_at" timestamp,
	"revoked_at" timestamp,
	"reviewed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "brand_claims_brand_slug_idx" ON "brand_claims" USING btree ("brand_slug");--> statement-breakpoint
CREATE INDEX "brand_claims_claimer_uid_idx" ON "brand_claims" USING btree ("claimer_uid");--> statement-breakpoint
CREATE INDEX "brand_claims_status_idx" ON "brand_claims" USING btree ("status");