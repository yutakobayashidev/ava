import { and, desc, eq } from "drizzle-orm";
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
  "inProgress" | "blocked" | "paused" | "completed" | "cancelled",
  TaskStatus
> = {
  inProgress: "in_progress",
  blocked: "blocked",
  paused: "paused",
  completed: "completed",
  cancelled: "cancelled",
};

const ensureRecord = <T>(record: T | undefined): T => {
  if (!record) {
    throw new Error("レコードが見つかりませんでした");
  }
  return record;
};

export const createTaskRepository = ({ db }: TaskRepositoryDeps) => {
  const createTaskSession = async (params: CreateTaskSessionInput) => {
    return db.transaction(async (tx) => {
      const sessionId = uuidv7();
      const [session] = await tx
        .insert(schema.taskSessions)
        .values({
          id: sessionId,
          userId: params.userId,
          workspaceId: params.workspaceId,
          issueProvider: params.issueProvider,
          issueId: params.issueId ?? null,
          issueTitle: params.issueTitle,
          initialSummary: params.initialSummary,
        })
        .returning();

      // started イベントを作成
      await tx.insert(schema.taskEvents).values({
        id: uuidv7(),
        taskSessionId: sessionId,
        eventType: "started",
        summary: params.initialSummary,
        rawContext: {},
      });

      return ensureRecord(session);
    });
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
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.taskSessions.id, params.taskSessionId),
            eq(schema.taskSessions.workspaceId, params.workspaceId),
          ),
        )
        .returning();

      // updated イベントを作成
      await tx.insert(schema.taskEvents).values({
        id: uuidv7(),
        taskSessionId: params.taskSessionId,
        eventType: "updated",
        summary: params.summary,
        rawContext: params.rawContext ?? {},
      });

      return {
        session: ensureRecord(session),
        update: { id: uuidv7(), summary: params.summary }, // 互換性のためダミーオブジェクト
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

      const [blockEvent] = await tx
        .insert(schema.taskEvents)
        .values({
          id: uuidv7(),
          taskSessionId: params.taskSessionId,
          eventType: "blocked",
          reason: params.reason,
          rawContext: params.rawContext ?? {},
        })
        .returning();

      return {
        session: validSession,
        blockReport: ensureRecord(blockEvent),
      };
    });
  };

  const completeTask = async (params: CompleteTaskInput) => {
    const now = new Date();

    return db.transaction(async (tx) => {
      // 未解決のブロッキングを取得
      const unresolvedBlocks = await tx
        .select()
        .from(schema.taskEvents)
        .where(
          and(
            eq(schema.taskEvents.taskSessionId, params.taskSessionId),
            eq(schema.taskEvents.eventType, "blocked"),
          ),
        )
        .orderBy(desc(schema.taskEvents.createdAt));

      const [session] = await tx
        .update(schema.taskSessions)
        .set({
          status: STATUS.completed,
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

      // completed イベントを作成
      await tx.insert(schema.taskEvents).values({
        id: uuidv7(),
        taskSessionId: params.taskSessionId,
        eventType: "completed",
        summary: params.summary,
        rawContext: {},
      });

      return {
        session: validSession,
        completion: { id: uuidv7(), summary: params.summary }, // 互換性のためダミーオブジェクト
        unresolvedBlocks,
      };
    });
  };

  const listBlockReports = async (
    taskSessionId: string,
    options: ListOptions = {},
  ) => {
    const limit = options.limit ?? 50;
    return db
      .select()
      .from(schema.taskEvents)
      .where(
        and(
          eq(schema.taskEvents.taskSessionId, taskSessionId),
          eq(schema.taskEvents.eventType, "blocked"),
        ),
      )
      .orderBy(desc(schema.taskEvents.createdAt))
      .limit(limit);
  };

  const getUnresolvedBlockReports = async (taskSessionId: string) => {
    // ブロックイベントを取得
    const blockedEvents = await db
      .select()
      .from(schema.taskEvents)
      .where(
        and(
          eq(schema.taskEvents.taskSessionId, taskSessionId),
          eq(schema.taskEvents.eventType, "blocked"),
        ),
      )
      .orderBy(desc(schema.taskEvents.createdAt));

    // 解決イベントを取得
    const resolvedEvents = await db
      .select()
      .from(schema.taskEvents)
      .where(
        and(
          eq(schema.taskEvents.taskSessionId, taskSessionId),
          eq(schema.taskEvents.eventType, "block_resolved"),
        ),
      );

    // 解決されたブロックのIDを収集
    const resolvedBlockIds = new Set(
      resolvedEvents
        .map((e) => e.relatedEventId)
        .filter((id): id is string => id !== null),
    );

    // 解決されていないブロックのみを返す
    return blockedEvents.filter((block) => !resolvedBlockIds.has(block.id));
  };

  const resolveBlockReport = async (params: ResolveBlockInput) => {
    const now = new Date();

    return db.transaction(async (tx) => {
      // ブロックイベントを取得
      const [blockEvent] = await tx
        .select()
        .from(schema.taskEvents)
        .where(
          and(
            eq(schema.taskEvents.id, params.blockReportId),
            eq(schema.taskEvents.taskSessionId, params.taskSessionId),
            eq(schema.taskEvents.eventType, "blocked"),
          ),
        );

      const validBlockReport = ensureRecord(blockEvent);

      // block_resolved イベントを作成
      await tx.insert(schema.taskEvents).values({
        id: uuidv7(),
        taskSessionId: params.taskSessionId,
        eventType: "block_resolved",
        reason: validBlockReport.reason,
        relatedEventId: params.blockReportId,
        rawContext: {},
      });

      // タスクセッションのステータスをin_progressに戻す
      const [session] = await tx
        .update(schema.taskSessions)
        .set({
          status: STATUS.inProgress,
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

      const [pauseEvent] = await tx
        .insert(schema.taskEvents)
        .values({
          id: uuidv7(),
          taskSessionId: params.taskSessionId,
          eventType: "paused",
          reason: params.reason,
          rawContext: params.rawContext ?? {},
        })
        .returning();

      return {
        session: validSession,
        pauseReport: ensureRecord(pauseEvent),
      };
    });
  };

  const resumeTask = async (params: ResumeTaskInput) => {
    const now = new Date();

    return db.transaction(async (tx) => {
      // 最新のpausedイベントを取得
      const [latestPausedEvent] = await tx
        .select()
        .from(schema.taskEvents)
        .where(
          and(
            eq(schema.taskEvents.taskSessionId, params.taskSessionId),
            eq(schema.taskEvents.eventType, "paused"),
          ),
        )
        .orderBy(desc(schema.taskEvents.createdAt))
        .limit(1);

      const [session] = await tx
        .update(schema.taskSessions)
        .set({
          status: STATUS.inProgress,
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

      // resumed イベントを作成
      await tx.insert(schema.taskEvents).values({
        id: uuidv7(),
        taskSessionId: params.taskSessionId,
        eventType: "resumed",
        summary: params.summary,
        relatedEventId: latestPausedEvent?.id ?? null,
        rawContext: params.rawContext ?? {},
      });

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
    listBlockReports,
    getUnresolvedBlockReports,
    resolveBlockReport,
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
