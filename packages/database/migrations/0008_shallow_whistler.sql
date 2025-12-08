DROP INDEX "task_sessions_status_idx";--> statement-breakpoint
CREATE INDEX "task_sessions_status_created_at_idx" ON "task_sessions" USING btree ("status","created_at");