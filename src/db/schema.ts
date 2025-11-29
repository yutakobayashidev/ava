import { relations, sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const issueProviderEnum = pgEnum("issue_provider", ["github", "manual"]);

export const taskStatusEnum = pgEnum("task_status", [
  "in_progress",
  "blocked",
  "paused",
  "completed",
]);

export const workspaceProviderEnum = pgEnum("workspace_provider", ["slack"]);

export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id").primaryKey().notNull(),
    provider: workspaceProviderEnum("provider").notNull(),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    domain: text("domain"),
    botUserId: text("bot_user_id"),
    botAccessToken: text("bot_access_token"),
    botRefreshToken: text("bot_refresh_token"),
    notificationChannelId: text("notification_channel_id"),
    notificationChannelName: text("notification_channel_name"),
    installedAt: timestamp("installed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    providerExternalUnique: uniqueIndex(
      "workspaces_provider_external_unique",
    ).on(table.provider, table.externalId),
  }),
);

export const clients = pgTable(
  "clients",
  {
    id: text("id").primaryKey().notNull(),
    clientId: text("client_id").notNull(),
    clientSecret: text("client_secret"),
    name: text("name").notNull(),
    redirectUris: text("redirect_uris").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    clientIdUnique: uniqueIndex("clients_client_id_unique").on(table.clientId),
  }),
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey().notNull(),
    name: text("name"),
    email: text("email"),
    slackId: text("slack_id"),
    image: text("image"),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    slackIdUnique: uniqueIndex("users_slack_id_unique").on(table.slackId),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("sessions_user_idx").on(table.userId),
  }),
);

export const authCodes = pgTable(
  "auth_codes",
  {
    id: text("id").primaryKey().notNull(),
    code: text("code").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    clientId: text("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    workspaceId: text("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    redirectUri: text("redirect_uri").notNull(),
    codeChallenge: text("code_challenge"),
    codeChallengeMethod: text("code_challenge_method"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    codeUnique: uniqueIndex("auth_codes_code_unique").on(table.code),
  }),
);

export const accessTokens = pgTable(
  "access_tokens",
  {
    id: text("id").primaryKey().notNull(),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    clientId: text("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    workspaceId: text("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tokenUnique: uniqueIndex("access_tokens_token_unique").on(table.token),
  }),
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: text("id").primaryKey().notNull(),
    tokenHash: text("token_hash").notNull(),
    accessTokenId: text("access_token_id")
      .references(() => accessTokens.id, { onDelete: "cascade" })
      .notNull(),
    clientId: text("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    workspaceId: text("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("refresh_tokens_token_hash_unique").on(
      table.tokenHash,
    ),
    accessTokenIdx: index("refresh_tokens_access_token_idx").on(
      table.accessTokenId,
    ),
    userIdx: index("refresh_tokens_user_idx").on(table.userId),
  }),
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id").primaryKey().notNull(),
    workspaceId: text("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceUserUnique: uniqueIndex(
      "workspace_members_workspace_user_unique",
    ).on(table.workspaceId, table.userId),
    workspaceIdx: index("workspace_members_workspace_idx").on(
      table.workspaceId,
    ),
    userIdx: index("workspace_members_user_idx").on(table.userId),
  }),
);

export const taskSessions = pgTable(
  "task_sessions",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    issueProvider: issueProviderEnum("issue_provider").notNull(),
    issueId: text("issue_id"),
    issueTitle: text("issue_title").notNull(),
    initialSummary: text("initial_summary").notNull(),
    status: taskStatusEnum("status").notNull().default("in_progress"),
    workspaceId: text("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    slackThreadTs: text("slack_thread_ts"),
    slackChannel: text("slack_channel"),
    blockedAt: timestamp("blocked_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    resumedAt: timestamp("resumed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    userIdx: index("task_sessions_user_idx").on(table.userId),
    issueProviderIdx: index("task_sessions_issue_provider_idx").on(
      table.issueProvider,
    ),
    statusIdx: index("task_sessions_status_idx").on(table.status),
  }),
);

export const taskUpdates = pgTable(
  "task_updates",
  {
    id: text("id").primaryKey().notNull(),
    taskSessionId: text("task_session_id")
      .references(() => taskSessions.id, { onDelete: "cascade" })
      .notNull(),
    summary: text("summary").notNull(),
    rawContext: jsonb("raw_context")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    taskSessionIdx: index("task_updates_task_session_idx").on(
      table.taskSessionId,
    ),
  }),
);

export const taskBlockReports = pgTable(
  "task_block_reports",
  {
    id: text("id").primaryKey().notNull(),
    taskSessionId: text("task_session_id")
      .references(() => taskSessions.id, { onDelete: "cascade" })
      .notNull(),
    reason: text("reason").notNull(),
    rawContext: jsonb("raw_context")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    taskSessionIdx: index("task_block_reports_task_session_idx").on(
      table.taskSessionId,
    ),
  }),
);

export const taskPauseReports = pgTable(
  "task_pause_reports",
  {
    id: text("id").primaryKey().notNull(),
    taskSessionId: text("task_session_id")
      .references(() => taskSessions.id, { onDelete: "cascade" })
      .notNull(),
    reason: text("reason").notNull(),
    rawContext: jsonb("raw_context")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    resumedAt: timestamp("resumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    taskSessionIdx: index("task_pause_reports_task_session_idx").on(
      table.taskSessionId,
    ),
  }),
);

export const taskCompletions = pgTable(
  "task_completions",
  {
    id: text("id").primaryKey().notNull(),
    taskSessionId: text("task_session_id")
      .references(() => taskSessions.id, { onDelete: "cascade" })
      .notNull(),
    prUrl: text("pr_url").notNull(),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    taskSessionUnique: uniqueIndex("task_completions_task_session_unique").on(
      table.taskSessionId,
    ),
  }),
);

export const taskSessionRelations = relations(
  taskSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [taskSessions.userId],
      references: [users.id],
    }),
    workspace: one(workspaces, {
      fields: [taskSessions.workspaceId],
      references: [workspaces.id],
    }),
    updates: many(taskUpdates),
    blockReports: many(taskBlockReports),
    pauseReports: many(taskPauseReports),
    completions: many(taskCompletions),
  }),
);

export const taskUpdateRelations = relations(taskUpdates, ({ one }) => ({
  taskSession: one(taskSessions, {
    fields: [taskUpdates.taskSessionId],
    references: [taskSessions.id],
  }),
}));

export const taskBlockReportRelations = relations(
  taskBlockReports,
  ({ one }) => ({
    taskSession: one(taskSessions, {
      fields: [taskBlockReports.taskSessionId],
      references: [taskSessions.id],
    }),
  }),
);

export const taskPauseReportRelations = relations(
  taskPauseReports,
  ({ one }) => ({
    taskSession: one(taskSessions, {
      fields: [taskPauseReports.taskSessionId],
      references: [taskSessions.id],
    }),
  }),
);

export const taskCompletionRelations = relations(
  taskCompletions,
  ({ one }) => ({
    taskSession: one(taskSessions, {
      fields: [taskCompletions.taskSessionId],
      references: [taskSessions.id],
    }),
  }),
);

export const userRelations = relations(users, ({ many }) => ({
  authCodes: many(authCodes),
  accessTokens: many(accessTokens),
  refreshTokens: many(refreshTokens),
  sessions: many(sessions),
  taskSessions: many(taskSessions),
  workspaceMemberships: many(workspaceMembers),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const authCodeRelations = relations(authCodes, ({ one }) => ({
  user: one(users, {
    fields: [authCodes.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [authCodes.workspaceId],
    references: [workspaces.id],
  }),
  client: one(clients, {
    fields: [authCodes.clientId],
    references: [clients.id],
  }),
}));

export const accessTokenRelations = relations(
  accessTokens,
  ({ one, many }) => ({
    user: one(users, {
      fields: [accessTokens.userId],
      references: [users.id],
    }),
    workspace: one(workspaces, {
      fields: [accessTokens.workspaceId],
      references: [workspaces.id],
    }),
    client: one(clients, {
      fields: [accessTokens.clientId],
      references: [clients.id],
    }),
    refreshTokens: many(refreshTokens),
  }),
);

export const refreshTokenRelations = relations(refreshTokens, ({ one }) => ({
  accessToken: one(accessTokens, {
    fields: [refreshTokens.accessTokenId],
    references: [accessTokens.id],
  }),
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [refreshTokens.workspaceId],
    references: [workspaces.id],
  }),
  client: one(clients, {
    fields: [refreshTokens.clientId],
    references: [clients.id],
  }),
}));

export const clientRelations = relations(clients, ({ many }) => ({
  authCodes: many(authCodes),
  accessTokens: many(accessTokens),
  refreshTokens: many(refreshTokens),
}));

export const workspaceMemberRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
  }),
);

export type TaskSession = typeof taskSessions.$inferSelect;
export type NewTaskSession = typeof taskSessions.$inferInsert;
export type TaskUpdate = typeof taskUpdates.$inferSelect;
export type NewTaskUpdate = typeof taskUpdates.$inferInsert;
export type TaskBlockReport = typeof taskBlockReports.$inferSelect;
export type NewTaskBlockReport = typeof taskBlockReports.$inferInsert;
export type TaskPauseReport = typeof taskPauseReports.$inferSelect;
export type NewTaskPauseReport = typeof taskPauseReports.$inferInsert;
export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type NewTaskCompletion = typeof taskCompletions.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type AuthCode = typeof authCodes.$inferSelect;
export type NewAuthCode = typeof authCodes.$inferInsert;
export type AccessToken = typeof accessTokens.$inferSelect;
export type NewAccessToken = typeof accessTokens.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
