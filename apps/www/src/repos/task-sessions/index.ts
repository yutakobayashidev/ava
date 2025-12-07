import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import type {
  AddTaskUpdateRequest,
  CompleteTaskRequest,
  CreateTaskSessionRequest,
  ListOptions,
  ListTaskSessionsRequest,
  PauseTaskRequest,
  ReportBlockRequest,
  ResolveBlockRequest,
  ResumeTaskRequest,
  TaskRepository,
  TaskStatus,
} from "./interface";

export type { TaskRepository } from "./interface";

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

// 高階関数として定義
export const createTaskSession =
  (db: Database) => async (params: CreateTaskSessionRequest) => {
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

      return session;
    });
  };

export const findTaskSessionById =
  (db: Database) =>
  async (taskSessionId: string, workspaceId: string, userId: string) => {
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

export const addTaskUpdate =
  (db: Database) => async (params: AddTaskUpdateRequest) => {
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
        session,
        updateEvent,
      };
    });
  };

export const reportBlock =
  (db: Database) => async (params: ReportBlockRequest) => {
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
        session,
        blockReport: blockEvent,
      };
    });
  };

export const completeTask =
  (db: Database) => async (params: CompleteTaskRequest) => {
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
        session,
        completedEvent,
        unresolvedBlocks,
      };
    });
  };

export const listBlockReports =
  (db: Database) =>
  async (taskSessionId: string, options: ListOptions = {}) => {
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

export const getUnresolvedBlockReports =
  (db: Database) => async (taskSessionId: string) => {
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

export const getBulkUnresolvedBlockReports =
  (db: Database) => async (taskSessionIds: string[]) => {
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

export const resolveBlockReport =
  (db: Database) => async (params: ResolveBlockRequest) => {
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
        session,
        blockReport: blockEvent,
      };
    });
  };

export const listTaskSessions =
  (db: Database) => async (params: ListTaskSessionsRequest) => {
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

export const updateSlackThread =
  (db: Database) =>
  async (params: {
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

    return session;
  };

export const pauseTask = (db: Database) => async (params: PauseTaskRequest) => {
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

export const resumeTask =
  (db: Database) => async (params: ResumeTaskRequest) => {
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

export const listEvents =
  (db: Database) =>
  async (params: {
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

export const getBulkLatestEvents =
  (db: Database) =>
  async (params: {
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

export const getLatestEvent =
  (db: Database) =>
  async (params: {
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

export const getLatestEventByTypes =
  (db: Database) =>
  async (
    taskSessionId: string,
    eventTypes: (typeof schema.taskEventTypeEnum.enumValues)[number][],
  ) => {
    if (eventTypes.length === 0) return null;

    const events = await Promise.all(
      eventTypes.map((eventType) =>
        getLatestEvent(db)({ taskSessionId, eventType }),
      ),
    );

    const validEvents = events.filter((e): e is schema.TaskEvent => e !== null);
    if (validEvents.length === 0) return null;

    return validEvents.reduce((latest, current) =>
      current.createdAt > latest.createdAt ? current : latest,
    );
  };

export const getTodayCompletedTasks =
  (db: Database) =>
  async (params: {
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

export const createTaskRepository = (db: Database): TaskRepository => ({
  createTaskSession: createTaskSession(db),
  findTaskSessionById: findTaskSessionById(db),
  addTaskUpdate: addTaskUpdate(db),
  reportBlock: reportBlock(db),
  pauseTask: pauseTask(db),
  resumeTask: resumeTask(db),
  completeTask: completeTask(db),
  listBlockReports: listBlockReports(db),
  getUnresolvedBlockReports: getUnresolvedBlockReports(db),
  getBulkUnresolvedBlockReports: getBulkUnresolvedBlockReports(db),
  resolveBlockReport: resolveBlockReport(db),
  listTaskSessions: listTaskSessions(db),
  updateSlackThread: updateSlackThread(db),
  listEvents: listEvents(db),
  getBulkLatestEvents: getBulkLatestEvents(db),
  getLatestEvent: getLatestEvent(db),
  getLatestEventByTypes: getLatestEventByTypes(db),
  getTodayCompletedTasks: getTodayCompletedTasks(db),
});
