ALTER TABLE "clients" ADD COLUMN "is_cimd" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "cimd_cached_until" timestamp with time zone;