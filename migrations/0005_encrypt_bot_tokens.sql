-- Migration: Rename bot token columns to encrypted versions
-- This migration renames the columns but does NOT encrypt existing data
-- A separate data migration script is required to encrypt existing tokens

-- Rename bot_access_token to bot_access_token_encrypted
ALTER TABLE "workspaces" RENAME COLUMN "bot_access_token" TO "bot_access_token_encrypted";

-- Rename bot_refresh_token to bot_refresh_token_encrypted
ALTER TABLE "workspaces" RENAME COLUMN "bot_refresh_token" TO "bot_refresh_token_encrypted";
