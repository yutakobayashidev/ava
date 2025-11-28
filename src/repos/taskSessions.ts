import { and, desc, eq, isNull } from "drizzle-orm";

import type { Database } from "../clients/drizzle";
import * as schema from "../db/schema";

type IssueProvider = (typeof schema.issueProviderEnum.enumValues)[number];

type TaskStatus = (typeof schema.taskStatusEnum.enumValues)[number];

type TaskRepositoryDeps = {
    db: Database;
};

type CreateTaskSessionInput = {
    userId: string;
    issueProvider: IssueProvider;
    issueId?: string | null;
    issueTitle: string;
    initialSummary: string;
};

type AddTaskUpdateInput = {
    taskSessionId: string;
    summary: string;
    rawContext?: Record<string, unknown>;
};

type ReportBlockInput = {
    taskSessionId: string;
    reason: string;
    rawContext?: Record<string, unknown>;
};

type CompleteTaskInput = {
    taskSessionId: string;
    prUrl: string;
    summary: string;
};

type ListOptions = {
    limit?: number;
};

type ListTaskSessionsInput = {
    userId: string;
    status?: TaskStatus;
    limit?: number;
};

const STATUS: Record<"inProgress" | "blocked" | "completed", TaskStatus> = {
    inProgress: "in_progress",
    blocked: "blocked",
    completed: "completed",
};

const ensureRecord = <T>(record: T | undefined): T => {
    if (!record) {
        throw new Error("レコードが見つかりませんでした");
    }
    return record;
};

export const createTaskRepository = ({ db }: TaskRepositoryDeps) => {
    const createTaskSession = async (params: CreateTaskSessionInput) => {
        const [session] = await db
            .insert(schema.taskSessions)
            .values({
                userId: params.userId,
                issueProvider: params.issueProvider,
                issueId: params.issueId ?? null,
                issueTitle: params.issueTitle,
                initialSummary: params.initialSummary,
            })
            .returning();

        return ensureRecord(session);
    };

    const findTaskSessionById = async (taskSessionId: string) => {
        const [session] = await db
            .select()
            .from(schema.taskSessions)
            .where(eq(schema.taskSessions.id, taskSessionId));

        return session ?? null;
    };

    const addTaskUpdate = async (params: AddTaskUpdateInput) => {
        const now = new Date();

        return db.transaction(async (tx) => {
            const [session] = await tx
                .update(schema.taskSessions)
                .set({
                    status: STATUS.inProgress,
                    blockedAt: null,
                    updatedAt: now,
                })
                .where(eq(schema.taskSessions.id, params.taskSessionId))
                .returning();

            await tx
                .update(schema.taskBlockReports)
                .set({ resolvedAt: now })
                .where(
                    and(
                        eq(schema.taskBlockReports.taskSessionId, params.taskSessionId),
                        isNull(schema.taskBlockReports.resolvedAt),
                    ),
                );

            const [update] = await tx
                .insert(schema.taskUpdates)
                .values({
                    taskSessionId: params.taskSessionId,
                    summary: params.summary,
                    rawContext: params.rawContext ?? {},
                })
                .returning();

            return {
                session: ensureRecord(session),
                update: ensureRecord(update),
            };
        });
    };

    const reportBlock = async (params: ReportBlockInput) => {
        const now = new Date();

        return db.transaction(async (tx) => {
            const [session] = await tx
                .update(schema.taskSessions)
                .set({
                    status: STATUS.blocked,
                    blockedAt: now,
                    updatedAt: now,
                })
                .where(eq(schema.taskSessions.id, params.taskSessionId))
                .returning();

            const [blockReport] = await tx
                .insert(schema.taskBlockReports)
                .values({
                    taskSessionId: params.taskSessionId,
                    reason: params.reason,
                    rawContext: params.rawContext ?? {},
                })
                .returning();

            return {
                session: ensureRecord(session),
                blockReport: ensureRecord(blockReport),
            };
        });
    };

    const completeTask = async (params: CompleteTaskInput) => {
        const now = new Date();

        return db.transaction(async (tx) => {
            const [session] = await tx
                .update(schema.taskSessions)
                .set({
                    status: STATUS.completed,
                    blockedAt: null,
                    completedAt: now,
                    updatedAt: now,
                })
                .where(eq(schema.taskSessions.id, params.taskSessionId))
                .returning();

            const completionValues = {
                taskSessionId: params.taskSessionId,
                prUrl: params.prUrl,
                summary: params.summary,
            }

            const [completion] = await tx
                .insert(schema.taskCompletions)
                .values(completionValues)
                .onConflictDoUpdate({
                    target: schema.taskCompletions.taskSessionId,
                    set: completionValues,
                })
                .returning();

            await tx
                .update(schema.taskBlockReports)
                .set({ resolvedAt: now })
                .where(
                    and(
                        eq(schema.taskBlockReports.taskSessionId, params.taskSessionId),
                        isNull(schema.taskBlockReports.resolvedAt),
                    ),
                );

            return {
                session: ensureRecord(session),
                completion: ensureRecord(completion),
            };
        });
    };

    const listUpdates = async (
        taskSessionId: string,
        options: ListOptions = {},
    ) => {
        const limit = options.limit ?? 50;
        return db
            .select()
            .from(schema.taskUpdates)
            .where(eq(schema.taskUpdates.taskSessionId, taskSessionId))
            .orderBy(desc(schema.taskUpdates.createdAt))
            .limit(limit);
    };

    const listBlockReports = async (
        taskSessionId: string,
        options: ListOptions = {},
    ) => {
        const limit = options.limit ?? 50;
        return db
            .select()
            .from(schema.taskBlockReports)
            .where(eq(schema.taskBlockReports.taskSessionId, taskSessionId))
            .orderBy(desc(schema.taskBlockReports.createdAt))
            .limit(limit);
    };

    const findCompletionByTaskSessionId = async (taskSessionId: string) => {
        const [completion] = await db
            .select()
            .from(schema.taskCompletions)
            .where(eq(schema.taskCompletions.taskSessionId, taskSessionId));

        return completion ?? null;
    };

    const listTaskSessions = async (params: ListTaskSessionsInput) => {
        const limit = params.limit ?? 50;

        const conditions = [eq(schema.taskSessions.userId, params.userId)];

        if (params.status) {
            conditions.push(eq(schema.taskSessions.status, params.status));
        }

        return db
            .select()
            .from(schema.taskSessions)
            .where(and(...conditions))
            .orderBy(desc(schema.taskSessions.updatedAt))
            .limit(limit);
    };

    const updateSlackThread = async (params: {
        taskSessionId: string;
        threadTs: string;
        channel: string;
    }) => {
        const [session] = await db
            .update(schema.taskSessions)
            .set({
                slackThreadTs: params.threadTs,
                slackChannel: params.channel,
            })
            .where(eq(schema.taskSessions.id, params.taskSessionId))
            .returning();

        return ensureRecord(session);
    };

    return {
        createTaskSession,
        findTaskSessionById,
        addTaskUpdate,
        reportBlock,
        completeTask,
        listUpdates,
        listBlockReports,
        findCompletionByTaskSessionId,
        listTaskSessions,
        updateSlackThread,
    };
};

export type TaskRepository = ReturnType<typeof createTaskRepository>;
export type {
    CreateTaskSessionInput,
    AddTaskUpdateInput,
    ReportBlockInput,
    CompleteTaskInput,
    ListOptions,
    ListTaskSessionsInput,
};
