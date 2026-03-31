-- Replace agentReadiness with ASX Score columns
ALTER TABLE "brand_index" DROP COLUMN IF EXISTS "agent_readiness";

ALTER TABLE "brand_index" ADD COLUMN IF NOT EXISTS "overall_score" integer;
ALTER TABLE "brand_index" ADD COLUMN IF NOT EXISTS "score_breakdown" jsonb;
ALTER TABLE "brand_index" ADD COLUMN IF NOT EXISTS "recommendations" jsonb;
ALTER TABLE "brand_index" ADD COLUMN IF NOT EXISTS "scan_tier" text;
ALTER TABLE "brand_index" ADD COLUMN IF NOT EXISTS "last_scanned_at" timestamp;
ALTER TABLE "brand_index" ADD COLUMN IF NOT EXISTS "last_scanned_by" text;

DROP INDEX IF EXISTS "brand_index_readiness_idx";
CREATE INDEX IF NOT EXISTS "brand_index_score_idx" ON "brand_index" ("overall_score");
