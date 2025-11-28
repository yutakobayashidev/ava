CREATE TYPE "public"."issue_provider" AS ENUM('github', 'manual');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('in_progress', 'blocked', 'completed');--> statement-breakpoint
CREATE TYPE "public"."workspace_provider" AS ENUM('slack');--> statement-breakpoint
CREATE TABLE "access_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text,
	"redirect_uri" text NOT NULL,
	"code_challenge" text,
	"code_challenge_method" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text,
	"name" text NOT NULL,
	"redirect_uris" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_block_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"task_session_id" text NOT NULL,
	"reason" text NOT NULL,
	"raw_context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_completions" (
	"id" text PRIMARY KEY NOT NULL,
	"task_session_id" text NOT NULL,
	"pr_url" text NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"issue_provider" "issue_provider" NOT NULL,
	"issue_id" text,
	"issue_title" text NOT NULL,
	"initial_summary" text NOT NULL,
	"status" "task_status" DEFAULT 'in_progress' NOT NULL,
	"workspace_id" text,
	"slack_thread_ts" text,
	"slack_channel" text,
	"blocked_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_updates" (
	"id" text PRIMARY KEY NOT NULL,
	"task_session_id" text NOT NULL,
	"summary" text NOT NULL,
	"raw_context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"slack_id" text,
	"image" text,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" "workspace_provider" NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"bot_user_id" text,
	"bot_access_token" text,
	"bot_refresh_token" text,
	"notification_channel_id" text,
	"notification_channel_name" text,
	"installed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_block_reports" ADD CONSTRAINT "task_block_reports_task_session_id_task_sessions_id_fk" FOREIGN KEY ("task_session_id") REFERENCES "public"."task_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_task_session_id_task_sessions_id_fk" FOREIGN KEY ("task_session_id") REFERENCES "public"."task_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_sessions" ADD CONSTRAINT "task_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_sessions" ADD CONSTRAINT "task_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_updates" ADD CONSTRAINT "task_updates_task_session_id_task_sessions_id_fk" FOREIGN KEY ("task_session_id") REFERENCES "public"."task_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "access_tokens_token_unique" ON "access_tokens" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_codes_code_unique" ON "auth_codes" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_client_id_unique" ON "clients" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "task_block_reports_task_session_idx" ON "task_block_reports" USING btree ("task_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_completions_task_session_unique" ON "task_completions" USING btree ("task_session_id");--> statement-breakpoint
CREATE INDEX "task_sessions_user_idx" ON "task_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "task_sessions_issue_provider_idx" ON "task_sessions" USING btree ("issue_provider");--> statement-breakpoint
CREATE INDEX "task_sessions_status_idx" ON "task_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_updates_task_session_idx" ON "task_updates" USING btree ("task_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_slack_id_unique" ON "users" USING btree ("slack_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_workspace_user_unique" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_idx" ON "workspace_members" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_provider_external_unique" ON "workspaces" USING btree ("provider","external_id");