import { and, desc, eq, inArray, sql } from "drizzle-orm";
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
  userId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
};

type ReportBlockInput = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
};

type CompleteTaskInput = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  summary: string;
};

type ResolveBlockInput = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  blockReportId: string;
};

type PauseTaskInput = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
};

type ResumeTaskInput = {
  taskSessionId: string;
  workspaceId: string;
  userId: string;
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
  updatedAfter?: Date;
  updatedBefore?: Date;
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

      return session ?? null;
    });
  };

  const findTaskSessionById = async (
    taskSessionId: string,
    workspaceId: string,
    userId: string,
  ) => {
    const [session] = await db
      .select()
      .from(schema.taskSessions)
      .where(
        and(
          eq(schema.taskSessions.id, taskSessionId),
          eq(schema.taskSessions.workspaceId, workspaceId),
          eq(schema.taskSessions.userId, userId),
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
            eq(schema.taskSessions.userId, params.userId),
          ),
        )
        .returning();

      // updated イベントを作成
      const [updateEvent] = await tx
        .insert(schema.taskEvents)
        .values({
          id: uuidv7(),
          taskSessionId: params.taskSessionId,
          eventType: "updated",
          summary: params.summary,
          rawContext: params.rawContext ?? {},
        })
        .returning();

      return {
        session: session ?? null,
        updateEvent: updateEvent ?? null,
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
            eq(schema.taskSessions.userId, params.userId),
          ),
        )
        .returning();

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
        session: session ?? null,
        blockReport: blockEvent ?? null,
      };
    });
  };

  const completeTask = async (params: CompleteTaskInput) => {
    const now = new Date();

    return db.transaction(async (tx) => {
      // ブロックイベントを取得
      const blockedEvents = await tx
        .select()
        .from(schema.taskEvents)
        .where(
          and(
            eq(schema.taskEvents.taskSessionId, params.taskSessionId),
            eq(schema.taskEvents.eventType, "blocked"),
          ),
        )
        .orderBy(desc(schema.taskEvents.createdAt));

      // 解決イベントを取得
      const resolvedEvents = await tx
        .select()
        .from(schema.taskEvents)
        .where(
          and(
            eq(schema.taskEvents.taskSessionId, params.taskSessionId),
            eq(schema.taskEvents.eventType, "block_resolved"),
          ),
        );

      // 解決されたブロックのIDを収集
      const resolvedBlockIds = new Set(
        resolvedEvents
          .map((e) => e.relatedEventId)
          .filter((id): id is string => id !== null),
      );

      // 未解決のブロックのみをフィルタリング
      const unresolvedBlocks = blockedEvents.filter(
        (block) => !resolvedBlockIds.has(block.id),
      );

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
            eq(schema.taskSessions.userId, params.userId),
          ),
        )
        .returning();

      // completed イベントを作成
      const [completedEvent] = await tx
        .insert(schema.taskEvents)
        .values({
          id: uuidv7(),
          taskSessionId: params.taskSessionId,
          eventType: "completed",
          summary: params.summary,
          rawContext: {},
        })
        .returning();

      return {
        session: session ?? null,
        completedEvent: completedEvent ?? null,
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

  const getBulkUnresolvedBlockReports = async (taskSessionIds: string[]) => {
    if (taskSessionIds.length === 0) {
      return new Map<string, schema.TaskEvent[]>();
    }

    // 全ブロックイベントを取得
    const blockedEvents = await db
      .select()
      .from(schema.taskEvents)
      .where(
        and(
          inArray(schema.taskEvents.taskSessionId, taskSessionIds),
          eq(schema.taskEvents.eventType, "blocked"),
        ),
      )
      .orderBy(desc(schema.taskEvents.createdAt));

    // 全解決イベントを取得
    const resolvedEvents = await db
      .select()
      .from(schema.taskEvents)
      .where(
        and(
          inArray(schema.taskEvents.taskSessionId, taskSessionIds),
          eq(schema.taskEvents.eventType, "block_resolved"),
        ),
      );

    // 解決されたブロックのIDを収集
    const resolvedBlockIds = new Set(
      resolvedEvents
        .map((e) => e.relatedEventId)
        .filter((id): id is string => id !== null),
    );

    // タスクIDごとにグループ化
    const result = new Map<string, schema.TaskEvent[]>();
    for (const event of blockedEvents) {
      if (!resolvedBlockIds.has(event.id)) {
        const existing = result.get(event.taskSessionId) || [];
        existing.push(event);
        result.set(event.taskSessionId, existing);
      }
    }

    return result;
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

      if (!blockEvent) {
        return {
          session: null,
          blockReport: null,
        };
      }

      // block_resolved イベントを作成
      await tx.insert(schema.taskEvents).values({
        id: uuidv7(),
        taskSessionId: params.taskSessionId,
        eventType: "block_resolved",
        reason: blockEvent.reason,
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
            eq(schema.taskSessions.userId, params.userId),
          ),
        )
        .returning();

      return {
        session: session ?? null,
        blockReport: blockEvent,
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

    if (params.updatedAfter) {
      conditions.push(
        sql`${schema.taskSessions.updatedAt} >= ${params.updatedAfter}`,
      );
    }

    if (params.updatedBefore) {
      conditions.push(
        sql`${schema.taskSessions.updatedAt} < ${params.updatedBefore}`,
      );
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
    userId: string;
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
          eq(schema.taskSessions.userId, params.userId),
        ),
      )
      .returning();

    return session ?? null;
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
            eq(schema.taskSessions.userId, params.userId),
          ),
        )
        .returning();

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
        session: session ?? null,
        pauseReport: pauseEvent ?? null,
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
            eq(schema.taskSessions.userId, params.userId),
          ),
        )
        .returning();

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
        session: session ?? null,
      };
    });
  };

  const listEvents = async (params: {
    taskSessionId: string;
    eventType?: (typeof schema.taskEventTypeEnum.enumValues)[number];
    limit?: number;
  }) => {
    const limit = params.limit ?? 50;
    const conditions = [
      eq(schema.taskEvents.taskSessionId, params.taskSessionId),
    ];

    if (params.eventType) {
      conditions.push(eq(schema.taskEvents.eventType, params.eventType));
    }

    return db
      .select()
      .from(schema.taskEvents)
      .where(and(...conditions))
      .orderBy(desc(schema.taskEvents.createdAt))
      .limit(limit);
  };

  const getBulkLatestEvents = async (params: {
    taskSessionIds: string[];
    eventType: (typeof schema.taskEventTypeEnum.enumValues)[number];
    limit?: number;
  }) => {
    if (params.taskSessionIds.length === 0) {
      return new Map<string, schema.TaskEvent[]>();
    }

    const limit = params.limit ?? 5;

    const events = await db
      .select()
      .from(schema.taskEvents)
      .where(
        and(
          inArray(schema.taskEvents.taskSessionId, params.taskSessionIds),
          eq(schema.taskEvents.eventType, params.eventType),
        ),
      )
      .orderBy(desc(schema.taskEvents.createdAt));

    // タスクIDごとにグループ化し、各グループでlimitを適用
    const result = new Map<string, schema.TaskEvent[]>();
    for (const event of events) {
      const existing = result.get(event.taskSessionId) || [];
      if (existing.length < limit) {
        existing.push(event);
        result.set(event.taskSessionId, existing);
      }
    }

    return result;
  };

  const getLatestEvent = async (params: {
    taskSessionId: string;
    eventType: (typeof schema.taskEventTypeEnum.enumValues)[number];
  }) => {
    const [event] = await db
      .select()
      .from(schema.taskEvents)
      .where(
        and(
          eq(schema.taskEvents.taskSessionId, params.taskSessionId),
          eq(schema.taskEvents.eventType, params.eventType),
        ),
      )
      .orderBy(desc(schema.taskEvents.createdAt))
      .limit(1);

    return event ?? null;
  };

  const getLatestEventByTypes = async (
    taskSessionId: string,
    eventTypes: (typeof schema.taskEventTypeEnum.enumValues)[number][],
  ) => {
    if (eventTypes.length === 0) return null;

    const events = await Promise.all(
      eventTypes.map((eventType) =>
        getLatestEvent({ taskSessionId, eventType }),
      ),
    );

    const validEvents = events.filter((e): e is schema.TaskEvent => e !== null);
    if (validEvents.length === 0) return null;

    return validEvents.reduce((latest, current) =>
      current.createdAt > latest.createdAt ? current : latest,
    );
  };

  const getTodayCompletedTasks = async (params: {
    userId: string;
    workspaceId: string;
    dateRange: { from: Date; to: Date };
  }) => {
    const completedAlias = schema.taskEvents;

    const result = await db
      .select({
        session: schema.taskSessions,
        completedEvent: completedAlias,
      })
      .from(schema.taskSessions)
      .innerJoin(
        completedAlias,
        and(
          eq(completedAlias.taskSessionId, schema.taskSessions.id),
          eq(completedAlias.eventType, "completed"),
        ),
      )
      .where(
        and(
          eq(schema.taskSessions.userId, params.userId),
          eq(schema.taskSessions.workspaceId, params.workspaceId),
          eq(schema.taskSessions.status, STATUS.completed),
          and(
            sql`${completedAlias.createdAt} >= ${params.dateRange.from}`,
            sql`${completedAlias.createdAt} < ${params.dateRange.to}`,
          ),
        ),
      )
      .orderBy(desc(completedAlias.createdAt));

    return result.map((r) => ({
      ...r.session,
      completedAt: r.completedEvent.createdAt,
      completionSummary: r.completedEvent.summary,
    }));
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
    getBulkUnresolvedBlockReports,
    resolveBlockReport,
    listTaskSessions,
    updateSlackThread,
    listEvents,
    getBulkLatestEvents,
    getLatestEvent,
    getLatestEventByTypes,
    getTodayCompletedTasks,
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
