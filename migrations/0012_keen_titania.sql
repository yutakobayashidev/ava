DROP INDEX "users_slack_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "users_slack_id_team_id_unique" ON "users" USING btree ("slack_id","slack_team_id");