CREATE TABLE "task_policy_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"task_session_id" text NOT NULL,
	"policy_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "task_policy_outbox" ADD CONSTRAINT "task_policy_outbox_task_session_id_task_sessions_id_fk" FOREIGN KEY ("task_session_id") REFERENCES "public"."task_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_policy_outbox_task_session_idx" ON "task_policy_outbox" USING btree ("task_session_id");--> statement-breakpoint
CREATE INDEX "task_policy_outbox_status_idx" ON "task_policy_outbox" USING btree ("status");