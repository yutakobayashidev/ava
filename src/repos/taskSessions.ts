import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { Database } from "../clients/drizzle";
import * as schema from "../db/schema";

type IssueProvider = (typeof schema.issueProviderEnum.enumValues)[number];

type TaskStatus = (typeof schema.taskStatusEnum.enumValues)[number];

type TaskRepositoryDeps = {
  db: Database;
};

type CreateTaskSessionInput = {
  userId: string;
  workspaceId: string;
  issueProvider: IssueProvider;
  issueId?: string | null;
  issueTitle: string;
  initialSummary: string;
};

type AddTaskUpdateInput = {
  taskSessionId: string;
  workspaceId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
};

type ReportBlockInput = {
  taskSessionId: string;
  workspaceId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
};

type CompleteTaskInput = {
  taskSessionId: string;
  workspaceId: string;
  summary: string;
};

type ResolveBlockInput = {
  taskSessionId: string;
  workspaceId: string;
  blockReportId: string;
};

type PauseTaskInput = {
  taskSessionId: string;
  workspaceId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
};

type ResumeTaskInput = {
  taskSessionId: string;
  workspaceId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
};

type ListOptions = {
  limit?: number;
};

type ListTaskSessionsInput = {
  userId: string;
  workspaceId: string;
  status?: TaskStatus;
  limit?: number;
};

const STATUS: Record<
  "inProgress" | "blocked" | "paused" | "completed",
  TaskStatus
> = {
  inProgress: "in_progress",
  blocked: "blocked",
  paused: "paused",
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
        id: uuidv7(),
        userId: params.userId,
        workspaceId: params.workspaceId,
        issueProvider: params.issueProvider,
        issueId: params.issueId ?? null,
        issueTitle: params.issueTitle,
        initialSummary: params.initialSummary,
      })
      .returning();

    return ensureRecord(session);
  };

  const findTaskSessionById = async (
    taskSessionId: string,
    workspaceId: string,
  ) => {
    const [session] = await db
      .select()
      .from(schema.taskSessions)
      .where(
        and(
          eq(schema.taskSessions.id, taskSessionId),
          eq(schema.taskSessions.workspaceId, workspaceId),
        ),
      );

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
          pausedAt: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.taskSessions.id, params.taskSessionId),
            eq(schema.taskSessions.workspaceId, params.workspaceId),
          ),
        )
        .returning();

      const validSession = ensureRecord(session);

      const [update] = await tx
        .insert(schema.taskUpdates)
        .values({
          id: uuidv7(),
          taskSessionId: params.taskSessionId,
          summary: params.summary,
          rawContext: params.rawContext ?? {},
        })
        .returning();

      return {
        session: validSession,
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
        .where(
          and(
            eq(schema.taskSessions.id, params.taskSessionId),
            eq(schema.taskSessions.workspaceId, params.workspaceId),
          ),
        )
        .returning();

      const validSession = ensureRecord(session);

      const [blockReport] = await tx
        .insert(schema.taskBlockReports)
        .values({
          id: uuidv7(),
          taskSessionId: params.taskSessionId,
          reason: params.reason,
          rawContext: params.rawContext ?? {},
        })
        .returning();

      return {
        session: validSession,
        blockReport: ensureRecord(blockReport),
      };
    });
  };

  const completeTask = async (params: CompleteTaskInput) => {
    const now = new Date();

    return db.transaction(async (tx) => {
      // 未解決のブロッキングを取得
      const unresolvedBlocks = await tx
        .select()
        .from(schema.taskBlockReports)
        .where(
          and(
            eq(schema.taskBlockReports.taskSessionId, params.taskSessionId),
            isNull(schema.taskBlockReports.resolvedAt),
          ),
        )
        .orderBy(desc(schema.taskBlockReports.createdAt));

      const [session] = await tx
        .update(schema.taskSessions)
        .set({
          status: STATUS.completed,
          blockedAt: null,
          completedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.taskSessions.id, params.taskSessionId),
            eq(schema.taskSessions.workspaceId, params.workspaceId),
          ),
        )
        .returning();

      const validSession = ensureRecord(session);

      const completionValues = {
        id: uuidv7(),
        taskSessionId: params.taskSessionId,
        summary: params.summary,
      };

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
        session: validSession,
        completion: ensureRecord(completion),
        unresolvedBlocks,
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

  const getUnresolvedBlockReports = async (taskSessionId: string) => {
    return db
      .select()
      .from(schema.taskBlockReports)
      .where(
        and(
          eq(schema.taskBlockReports.taskSessionId, taskSessionId),
          isNull(schema.taskBlockReports.resolvedAt),
        ),
      )
      .orderBy(desc(schema.taskBlockReports.createdAt));
  };

  const resolveBlockReport = async (params: ResolveBlockInput) => {
    const now = new Date();

    return db.transaction(async (tx) => {
      const [blockReport] = await tx
        .update(schema.taskBlockReports)
        .set({ resolvedAt: now })
        .where(
          and(
            eq(schema.taskBlockReports.id, params.blockReportId),
            eq(schema.taskBlockReports.taskSessionId, params.taskSessionId),
          ),
        )
        .returning();

      const validBlockReport = ensureRecord(blockReport);

      // タスクセッションのステータスをin_progressに戻す
      const [session] = await tx
        .update(schema.taskSessions)
        .set({
          status: STATUS.inProgress,
          blockedAt: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.taskSessions.id, params.taskSessionId),
            eq(schema.taskSessions.workspaceId, params.workspaceId),
          ),
        )
        .returning();

      return {
        session: ensureRecord(session),
        blockReport: validBlockReport,
      };
    });
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

    const conditions = [
      eq(schema.taskSessions.userId, params.userId),
      eq(schema.taskSessions.workspaceId, params.workspaceId),
    ];

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
    workspaceId: string;
    threadTs: string;
    channel: string;
  }) => {
    const [session] = await db
      .update(schema.taskSessions)
      .set({
        slackThreadTs: params.threadTs,
        slackChannel: params.channel,
      })
      .where(
        and(
          eq(schema.taskSessions.id, params.taskSessionId),
          eq(schema.taskSessions.workspaceId, params.workspaceId),
        ),
      )
      .returning();

    return ensureRecord(session);
  };

  const pauseTask = async (params: PauseTaskInput) => {
    const now = new Date();

    return db.transaction(async (tx) => {
      const [session] = await tx
        .update(schema.taskSessions)
        .set({
          status: STATUS.paused,
          pausedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.taskSessions.id, params.taskSessionId),
            eq(schema.taskSessions.workspaceId, params.workspaceId),
          ),
        )
        .returning();

      const validSession = ensureRecord(session);

      const [pauseReport] = await tx
        .insert(schema.taskPauseReports)
        .values({
          id: uuidv7(),
          taskSessionId: params.taskSessionId,
          reason: params.reason,
          rawContext: params.rawContext ?? {},
        })
        .returning();

      return {
        session: validSession,
        pauseReport: ensureRecord(pauseReport),
      };
    });
  };

  const resumeTask = async (params: ResumeTaskInput) => {
    const now = new Date();

    return db.transaction(async (tx) => {
      const [session] = await tx
        .update(schema.taskSessions)
        .set({
          status: STATUS.inProgress,
          resumedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.taskSessions.id, params.taskSessionId),
            eq(schema.taskSessions.workspaceId, params.workspaceId),
          ),
        )
        .returning();

      const validSession = ensureRecord(session);

      // 最新の未再開の pause report を更新
      await tx
        .update(schema.taskPauseReports)
        .set({ resumedAt: now })
        .where(
          and(
            eq(schema.taskPauseReports.taskSessionId, params.taskSessionId),
            isNull(schema.taskPauseReports.resumedAt),
          ),
        );

      return {
        session: validSession,
      };
    });
  };

  return {
    createTaskSession,
    findTaskSessionById,
    addTaskUpdate,
    reportBlock,
    pauseTask,
    resumeTask,
    completeTask,
    listUpdates,
    listBlockReports,
    getUnresolvedBlockReports,
    resolveBlockReport,
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
  PauseTaskInput,
  ResumeTaskInput,
  CompleteTaskInput,
  ResolveBlockInput,
  ListOptions,
  ListTaskSessionsInput,
};
