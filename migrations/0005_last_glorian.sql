CREATE TYPE "public"."task_event_type" AS ENUM('started', 'updated', 'blocked', 'block_resolved', 'paused', 'resumed', 'completed');--> statement-breakpoint
CREATE TABLE "task_events" (
	"id" text PRIMARY KEY NOT NULL,
	"task_session_id" text NOT NULL,
	"event_type" "task_event_type" NOT NULL,
	"reason" text,
	"summary" text,
	"raw_context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_task_session_id_task_sessions_id_fk" FOREIGN KEY ("task_session_id") REFERENCES "public"."task_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_events_task_session_idx" ON "task_events" USING btree ("task_session_id");--> statement-breakpoint
CREATE INDEX "task_events_event_type_idx" ON "task_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "task_events_task_session_event_type_idx" ON "task_events" USING btree ("task_session_id","event_type");--> statement-breakpoint
-- Migrate existing timestamp data to task_events table
-- Insert 'blocked' events for tasks that have blocked_at
INSERT INTO "task_events" ("id", "task_session_id", "event_type", "reason", "created_at")
SELECT
  gen_random_uuid()::text,
  "id",
  'blocked'::task_event_type,
  'Migrated from blocked_at timestamp',
  "blocked_at"
FROM "task_sessions"
WHERE "blocked_at" IS NOT NULL;
--> statement-breakpoint
-- Insert 'paused' events for tasks that have paused_at
INSERT INTO "task_events" ("id", "task_session_id", "event_type", "reason", "created_at")
SELECT
  gen_random_uuid()::text,
  "id",
  'paused'::task_event_type,
  'Migrated from paused_at timestamp',
  "paused_at"
FROM "task_sessions"
WHERE "paused_at" IS NOT NULL;
--> statement-breakpoint
-- Insert 'resumed' events for tasks that have resumed_at
INSERT INTO "task_events" ("id", "task_session_id", "event_type", "summary", "created_at")
SELECT
  gen_random_uuid()::text,
  "id",
  'resumed'::task_event_type,
  'Migrated from resumed_at timestamp',
  "resumed_at"
FROM "task_sessions"
WHERE "resumed_at" IS NOT NULL;
--> statement-breakpoint
-- Insert 'completed' events for tasks that have completed_at
INSERT INTO "task_events" ("id", "task_session_id", "event_type", "summary", "created_at")
SELECT
  gen_random_uuid()::text,
  "id",
  'completed'::task_event_type,
  'Migrated from completed_at timestamp',
  "completed_at"
FROM "task_sessions"
WHERE "completed_at" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "task_sessions" DROP COLUMN "blocked_at";--> statement-breakpoint
ALTER TABLE "task_sessions" DROP COLUMN "paused_at";--> statement-breakpoint
ALTER TABLE "task_sessions" DROP COLUMN "resumed_at";--> statement-breakpoint
ALTER TABLE "task_sessions" DROP COLUMN "completed_at";