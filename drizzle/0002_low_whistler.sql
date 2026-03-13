ALTER TABLE "rail4_cards" ADD COLUMN "card_color" text;--> statement-breakpoint
ALTER TABLE "rail5_cards" ADD COLUMN "card_color" text;--> statement-breakpoint
ALTER TABLE "rail5_cards" ADD COLUMN "test_token" text;--> statement-breakpoint
ALTER TABLE "rail5_cards" ADD COLUMN "test_started_at" timestamp;--> statement-breakpoint
CREATE INDEX "idx_access_logs_bot_created" ON "api_access_logs" USING btree ("bot_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_access_logs_bot_id" ON "api_access_logs" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "idx_access_logs_created_at" ON "api_access_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "obfuscation_events_bot_id_idx" ON "obfuscation_events" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "obfuscation_events_bot_status_idx" ON "obfuscation_events" USING btree ("bot_id","status");--> statement-breakpoint
CREATE INDEX "obfuscation_events_status_idx" ON "obfuscation_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "profile_allowance_bot_profile_idx" ON "profile_allowance_usage" USING btree ("bot_id","profile_index");--> statement-breakpoint
ALTER TABLE "obfuscation_state" ADD CONSTRAINT "obfuscation_state_bot_id_unique" UNIQUE("bot_id");--> statement-breakpoint
ALTER TABLE "rail4_cards" ADD CONSTRAINT "rail4_cards_bot_id_unique" UNIQUE("bot_id");