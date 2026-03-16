CREATE TABLE IF NOT EXISTS "bot_credentials" (
  "id" serial PRIMARY KEY NOT NULL,
  "credential_id" text NOT NULL UNIQUE,
  "bot_id" text NOT NULL,
  "merchant_domain" text NOT NULL,
  "merchant_name" text NOT NULL,
  "username" text NOT NULL,
  "encrypted_password" text NOT NULL,
  "encrypted_totp_secret" text,
  "login_url" text,
  "has_totp" boolean NOT NULL DEFAULT false,
  "notes" text,
  "login_count" integer NOT NULL DEFAULT 0,
  "last_login_at" timestamp,
  "last_login_status" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "bot_credentials_bot_id_idx" ON "bot_credentials" ("bot_id");
CREATE INDEX IF NOT EXISTS "bot_credentials_domain_idx" ON "bot_credentials" ("bot_id", "merchant_domain");
