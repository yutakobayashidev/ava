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

export const taskEventTypeEnum = pgEnum("task_event_type", [
  "started",
  "updated",
  "blocked",
  "block_resolved",
  "paused",
  "resumed",
  "completed",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "in_progress",
  "blocked",
  "paused",
  "completed",
  "cancelled",
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
    iconUrl: text("icon_url"),
    botUserId: text("bot_user_id"),
    botAccessToken: text("bot_access_token"),
    botRefreshToken: text("bot_refresh_token"),
    botTokenExpiresAt: timestamp("bot_token_expires_at", {
      withTimezone: true,
    }),
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
    slackTeamId: text("slack_team_id").notNull(),
    workspaceId: text("workspace_id").references(() => workspaces.id, {
      onDelete: "set null",
    }),
    image: text("image"),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    slackIdTeamIdUnique: uniqueIndex("users_slack_id_team_id_unique").on(
      table.slackId,
      table.slackTeamId,
    ),
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
    tokenHash: text("token_hash").notNull(),
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
    tokenHashUnique: uniqueIndex("access_tokens_token_hash_unique").on(
      table.tokenHash,
    ),
  }),
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: text("id").primaryKey().notNull(),
    tokenHash: text("token_hash").notNull(),
    accessTokenId: text("access_token_id").references(() => accessTokens.id, {
      onDelete: "set null",
    }),
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

export const taskEvents = pgTable(
  "task_events",
  {
    id: text("id").primaryKey().notNull(),
    taskSessionId: text("task_session_id")
      .references(() => taskSessions.id, { onDelete: "cascade" })
      .notNull(),
    eventType: taskEventTypeEnum("event_type").notNull(),
    reason: text("reason"),
    summary: text("summary"),
    relatedEventId: text("related_event_id"),
    rawContext: jsonb("raw_context")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    taskSessionIdx: index("task_events_task_session_idx").on(
      table.taskSessionId,
    ),
    eventTypeIdx: index("task_events_event_type_idx").on(table.eventType),
    taskSessionEventTypeIdx: index(
      "task_events_task_session_event_type_idx",
    ).on(table.taskSessionId, table.eventType),
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
    events: many(taskEvents),
  }),
);

export const taskEventRelations = relations(taskEvents, ({ one }) => ({
  taskSession: one(taskSessions, {
    fields: [taskEvents.taskSessionId],
    references: [taskSessions.id],
  }),
}));

export const userRelations = relations(users, ({ many, one }) => ({
  authCodes: many(authCodes),
  accessTokens: many(accessTokens),
  refreshTokens: many(refreshTokens),
  sessions: many(sessions),
  taskSessions: many(taskSessions),
  workspace: one(workspaces, {
    fields: [users.workspaceId],
    references: [workspaces.id],
  }),
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

// workspaceMemberRelations は削除 - workspace_members テーブルが不要になったため

export type TaskSession = typeof taskSessions.$inferSelect;
export type NewTaskSession = typeof taskSessions.$inferInsert;
export type TaskEvent = typeof taskEvents.$inferSelect;
export type NewTaskEvent = typeof taskEvents.$inferInsert;
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
// WorkspaceMember 型は削除 - workspace_members テーブルが不要になったため
