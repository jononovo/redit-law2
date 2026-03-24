CREATE TABLE "brand_index" (
        "id" serial PRIMARY KEY NOT NULL,
        "slug" text NOT NULL,
        "name" text NOT NULL,
        "domain" text,
        "url" text NOT NULL,
        "logo_url" text,
        "description" text NOT NULL,
        "sector" text NOT NULL,
        "sub_sectors" text[] DEFAULT '{}' NOT NULL,
        "tier" text,
        "tags" text[] DEFAULT '{}',
        "carries_brands" text[] DEFAULT '{}',
        "has_mcp" boolean DEFAULT false NOT NULL,
        "mcp_url" text,
        "has_api" boolean DEFAULT false NOT NULL,
        "api_endpoint" text,
        "api_auth_required" boolean DEFAULT false,
        "api_docs_url" text,
        "has_cli" boolean DEFAULT false NOT NULL,
        "cli_install_command" text,
        "site_search" boolean DEFAULT true NOT NULL,
        "product_feed" boolean DEFAULT false NOT NULL,
        "capabilities" text[] DEFAULT '{}' NOT NULL,
        "checkout_methods" text[] DEFAULT '{}' NOT NULL,
        "ordering" text,
        "checkout_provider" text,
        "payment_methods_accepted" text[] DEFAULT '{}',
        "creditclaw_supports" text[] DEFAULT '{}',
        "business_account" boolean DEFAULT false,
        "tax_exempt_supported" boolean DEFAULT false,
        "po_number_supported" boolean DEFAULT false,
        "delivery_options" text[] DEFAULT '{}',
        "free_shipping_threshold" numeric,
        "ships_internationally" boolean DEFAULT false,
        "supported_countries" text[] DEFAULT '{}',
        "has_deals" boolean DEFAULT false,
        "deals_url" text,
        "deals_api" text,
        "loyalty_program" text,
        "maturity" text DEFAULT 'draft' NOT NULL,
        "claimed_by" text,
        "claim_id" integer,
        "submitted_by" text NOT NULL,
        "submitter_type" text DEFAULT 'ai_generated' NOT NULL,
        "version" text DEFAULT '1.0.0' NOT NULL,
        "last_verified" text,
        "active_version_id" integer,
        "agent_readiness" integer DEFAULT 0,
        "brand_data" jsonb NOT NULL,
        "skill_md" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "brand_index_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "brand_index_domain_idx" ON "brand_index" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "brand_index_sector_idx" ON "brand_index" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "brand_index_tier_idx" ON "brand_index" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "brand_index_maturity_idx" ON "brand_index" USING btree ("maturity");--> statement-breakpoint
CREATE INDEX "brand_index_readiness_idx" ON "brand_index" USING btree ("agent_readiness");--> statement-breakpoint

ALTER TABLE "brand_index" ADD COLUMN "search_vector" tsvector;--> statement-breakpoint

CREATE INDEX "brand_index_sub_sectors_gin" ON "brand_index" USING gin ("sub_sectors");--> statement-breakpoint
CREATE INDEX "brand_index_tags_gin" ON "brand_index" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "brand_index_carries_brands_gin" ON "brand_index" USING gin ("carries_brands");--> statement-breakpoint
CREATE INDEX "brand_index_capabilities_gin" ON "brand_index" USING gin ("capabilities");--> statement-breakpoint
CREATE INDEX "brand_index_checkout_methods_gin" ON "brand_index" USING gin ("checkout_methods");--> statement-breakpoint
CREATE INDEX "brand_index_payment_methods_gin" ON "brand_index" USING gin ("payment_methods_accepted");--> statement-breakpoint
CREATE INDEX "brand_index_supported_countries_gin" ON "brand_index" USING gin ("supported_countries");--> statement-breakpoint
CREATE INDEX "brand_index_search_idx" ON "brand_index" USING gin ("search_vector");--> statement-breakpoint

CREATE INDEX "brand_index_has_mcp_idx" ON "brand_index" ("has_mcp") WHERE "has_mcp" = true;--> statement-breakpoint
CREATE INDEX "brand_index_has_api_idx" ON "brand_index" ("has_api") WHERE "has_api" = true;--> statement-breakpoint
CREATE INDEX "brand_index_has_deals_idx" ON "brand_index" ("has_deals") WHERE "has_deals" = true;--> statement-breakpoint
CREATE INDEX "brand_index_guest_idx" ON "brand_index" ("ordering") WHERE "ordering" = 'guest';--> statement-breakpoint
CREATE INDEX "brand_index_tax_exempt_idx" ON "brand_index" ("tax_exempt_supported") WHERE "tax_exempt_supported" = true;--> statement-breakpoint
CREATE INDEX "brand_index_po_number_idx" ON "brand_index" ("po_number_supported") WHERE "po_number_supported" = true;--> statement-breakpoint
CREATE INDEX "brand_index_claimed_idx" ON "brand_index" ("claimed_by") WHERE "claimed_by" IS NOT NULL;--> statement-breakpoint

CREATE OR REPLACE FUNCTION brand_index_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.sub_sectors, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.carries_brands, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.sector, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER brand_index_search_vector_trigger
  BEFORE INSERT OR UPDATE ON brand_index
  FOR EACH ROW EXECUTE FUNCTION brand_index_search_vector_update();