ALTER TABLE "master_guardrails" ADD COLUMN "approval_mode" text DEFAULT 'ask_for_everything' NOT NULL;--> statement-breakpoint
ALTER TABLE "master_guardrails" ADD COLUMN "require_approval_above" integer;--> statement-breakpoint
ALTER TABLE "crossmint_guardrails" DROP COLUMN "require_approval_above";--> statement-breakpoint
ALTER TABLE "crossmint_guardrails" DROP COLUMN "approval_mode";--> statement-breakpoint
ALTER TABLE "privy_guardrails" DROP COLUMN "require_approval_above";--> statement-breakpoint
ALTER TABLE "privy_guardrails" DROP COLUMN "approval_mode";--> statement-breakpoint
ALTER TABLE "procurement_controls" DROP COLUMN "approval_mode";--> statement-breakpoint
ALTER TABLE "procurement_controls" DROP COLUMN "approval_threshold_cents";--> statement-breakpoint
ALTER TABLE "profile_allowance_usage" DROP COLUMN "exempt_used";--> statement-breakpoint
ALTER TABLE "rail4_guardrails" DROP COLUMN "require_approval_above";--> statement-breakpoint
ALTER TABLE "rail4_guardrails" DROP COLUMN "approval_mode";--> statement-breakpoint
ALTER TABLE "rail5_guardrails" DROP COLUMN "require_approval_above";--> statement-breakpoint
ALTER TABLE "rail5_guardrails" DROP COLUMN "approval_mode";
