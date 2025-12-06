ALTER TABLE "clients" ADD COLUMN "grant_types" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "response_types" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "token_endpoint_auth_method" text NOT NULL;