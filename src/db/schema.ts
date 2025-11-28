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