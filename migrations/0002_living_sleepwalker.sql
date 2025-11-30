ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_access_token_id_access_tokens_id_fk";
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "access_token_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_access_token_id_access_tokens_id_fk" FOREIGN KEY ("access_token_id") REFERENCES "public"."access_tokens"("id") ON DELETE set null ON UPDATE no action;