import { relations, sql } from "drizzle-orm";
import {
    index,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";

export const issueProviderEnum = pgEnum("issue_provider", ["github", "manual"]);

export const taskStatusEnum = pgEnum("task_status", [
    "in_progress",
    "blocked",
    "completed",
]);

export const workspaceProviderEnum = pgEnum("workspace_provider", ["slack"]);

export const workspaces = pgTable(
    "workspaces",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        provider: workspaceProviderEnum("provider").notNull(),
        externalId: text("external_id").notNull(),
        name: text("name").notNull(),
        domain: text("domain"),
        botUserId: text("bot_user_id"),
        botAccessToken: text("bot_access_token"),
        botRefreshToken: text("bot_refresh_token"),
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
        providerExternalUnique: uniqueIndex("workspaces_provider_external_unique").on(
            table.provider,
            table.externalId,
        ),
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
        email: text("email").unique(),
        emailVerified: timestamp("email_verified", { withTimezone: true }),
        image: text("image"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
);

export const authCodes = pgTable(
    "auth_codes",
    {
        id: text("id").primaryKey().notNull(),
        code: text("code").notNull().unique(),
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
        clientId: text("client_id")
            .references(() => clients.id, { onDelete: "cascade" })
            .notNull(),
        userId: text("user_id")
            .references(() => users.id, { onDelete: "cascade" })
            .notNull(),
        redirectUri: text("redirect_uri").notNull(),
        codeChallenge: text("code_challenge"),
        codeChallengeMethod: text("code_challenge_method"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (table) => ({
        codeIdx: uniqueIndex("auth_codes_code_unique").on(table.code),
    }),
);

export const accessTokens = pgTable(
    "access_tokens",
    {
        id: text("id").primaryKey().notNull(),
        token: text("token").notNull().unique(),
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
        clientId: text("client_id")
            .references(() => clients.id, { onDelete: "cascade" })
            .notNull(),
        userId: text("user_id")
            .references(() => users.id, { onDelete: "cascade" })
            .notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (table) => ({
        tokenIdx: uniqueIndex("access_tokens_token_unique").on(table.token),
    }),
);

export const taskSessions = pgTable(
    "task_sessions",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        issueProvider: issueProviderEnum("issue_provider").notNull(),
        issueId: text("issue_id"),
        issueTitle: text("issue_title").notNull(),
        initialSummary: text("initial_summary").notNull(),
        status: taskStatusEnum("status").notNull().default("in_progress"),
        blockedAt: timestamp("blocked_at", { withTimezone: true }),
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
        issueProviderIdx: index("task_sessions_issue_provider_idx").on(table.issueProvider),
        statusIdx: index("task_sessions_status_idx").on(table.status),
    }),
);

export const taskUpdates = pgTable(
    "task_updates",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        taskSessionId: uuid("task_session_id")
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
        taskSessionIdx: index("task_updates_task_session_idx").on(table.taskSessionId),
    }),
);

export const taskBlockReports = pgTable(
    "task_block_reports",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        taskSessionId: uuid("task_session_id")
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
        taskSessionIdx: index("task_block_reports_task_session_idx").on(table.taskSessionId),
    }),
);

export const taskCompletions = pgTable(
    "task_completions",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        taskSessionId: uuid("task_session_id")
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

export const taskSessionRelations = relations(taskSessions, ({ many }) => ({
    updates: many(taskUpdates),
    blockReports: many(taskBlockReports),
    completions: many(taskCompletions),
}));

export const taskUpdateRelations = relations(taskUpdates, ({ one }) => ({
    taskSession: one(taskSessions, {
        fields: [taskUpdates.taskSessionId],
        references: [taskSessions.id],
    }),
}));

export const taskBlockReportRelations = relations(taskBlockReports, ({ one }) => ({
    taskSession: one(taskSessions, {
        fields: [taskBlockReports.taskSessionId],
        references: [taskSessions.id],
    }),
}));

export const taskCompletionRelations = relations(taskCompletions, ({ one }) => ({
    taskSession: one(taskSessions, {
        fields: [taskCompletions.taskSessionId],
        references: [taskSessions.id],
    }),
}));

export const userRelations = relations(users, ({ many }) => ({
    authCodes: many(authCodes),
    accessTokens: many(accessTokens),
}));

export const authCodeRelations = relations(authCodes, ({ one }) => ({
    user: one(users, {
        fields: [authCodes.userId],
        references: [users.id],
    }),
    client: one(clients, {
        fields: [authCodes.clientId],
        references: [clients.id],
    }),
}));

export const accessTokenRelations = relations(accessTokens, ({ one }) => ({
    user: one(users, {
        fields: [accessTokens.userId],
        references: [users.id],
    }),
    client: one(clients, {
        fields: [accessTokens.clientId],
        references: [clients.id],
    }),
}));

export const clientRelations = relations(clients, ({ many }) => ({
    authCodes: many(authCodes),
    accessTokens: many(accessTokens),
}));

export type TaskSession = typeof taskSessions.$inferSelect;
export type NewTaskSession = typeof taskSessions.$inferInsert;
export type TaskUpdate = typeof taskUpdates.$inferSelect;
export type NewTaskUpdate = typeof taskUpdates.$inferInsert;
export type TaskBlockReport = typeof taskBlockReports.$inferSelect;
export type NewTaskBlockReport = typeof taskBlockReports.$inferInsert;
export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type NewTaskCompletion = typeof taskCompletions.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuthCode = typeof authCodes.$inferSelect;
export type NewAuthCode = typeof authCodes.$inferInsert;
export type AccessToken = typeof accessTokens.$inferSelect;
export type NewAccessToken = typeof accessTokens.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
