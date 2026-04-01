DROP INDEX IF EXISTS "brand_index_domain_idx";--> statement-breakpoint
ALTER TABLE "brand_index" ALTER COLUMN "domain" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_index" ADD CONSTRAINT "brand_index_domain_unique" UNIQUE ("domain");
