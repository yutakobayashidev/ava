ALTER TYPE "public"."task_event_type" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."task_event_type" ADD VALUE 'slack_thread_linked';--> statement-breakpoint
ALTER TABLE "task_events" DROP COLUMN "raw_context";