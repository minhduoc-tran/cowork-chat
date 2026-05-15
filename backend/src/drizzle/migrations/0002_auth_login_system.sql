-- Migration: auth-login-system phase-01
-- Add Google OAuth support and refresh tokens table

-- 1. Add google_id column to users (unique, nullable for Google-only accounts)
ALTER TABLE "users" ADD COLUMN "google_id" varchar(255);
CREATE UNIQUE INDEX "users_google_id_unique" ON "users"("google_id");

-- 2. Make password_hash nullable (Google-only accounts don't have passwords)
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- 3. Create refresh_tokens table for opaque token rotation
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"token_hash" text NOT NULL UNIQUE,
	"family_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"replaced_by_token_id" uuid
);

CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");