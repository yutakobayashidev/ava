ALTER TABLE "access_tokens" RENAME COLUMN "token" TO "token_hash";--> statement-breakpoint
DROP INDEX "access_tokens_token_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "access_tokens_token_hash_unique" ON "access_tokens" USING btree ("token_hash");