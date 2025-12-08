import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";

import type { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import type {
  ListTaskSessionsRequest,
  TaskQueryRepository,
  TaskStatus,
} from "./interface";

export type { TaskQueryRepository } from "./interface";

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

const findTaskSessionById =
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

const getUnresolvedBlockReports =
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

const getBulkUnresolvedBlockReports =
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

const listTaskSessions =
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

const updateSlackThread =
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

const listEvents =
  (db: Database) =>
  async (params: {
    taskSessionId: string;
    eventType?: (typeof schema.taskEventTypeEnum.enumValues)[number];
    limit?: number;
    includeTechnicalEvents?: boolean;
  }) => {
    const limit = params.limit ?? 50;
    const conditions = [
      eq(schema.taskEvents.taskSessionId, params.taskSessionId),
    ];

    if (params.eventType) {
      conditions.push(eq(schema.taskEvents.eventType, params.eventType));
    }

    // hide system events from general lists unless explicitly requested
    if (!params.includeTechnicalEvents && !params.eventType) {
      conditions.push(ne(schema.taskEvents.eventType, "slack_thread_linked"));
    }

    return db
      .select()
      .from(schema.taskEvents)
      .where(and(...conditions))
      .orderBy(desc(schema.taskEvents.createdAt))
      .limit(limit);
  };

const getBulkLatestEvents =
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

const getLatestEvent =
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

const getLatestEventByTypes =
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

const getTodayCompletedTasks =
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

export const createTaskQueryRepository = (
  db: Database,
): TaskQueryRepository => ({
  findTaskSessionById: findTaskSessionById(db),
  getUnresolvedBlockReports: getUnresolvedBlockReports(db),
  getBulkUnresolvedBlockReports: getBulkUnresolvedBlockReports(db),
  listTaskSessions: listTaskSessions(db),
  updateSlackThread: updateSlackThread(db),
  listEvents: listEvents(db),
  getBulkLatestEvents: getBulkLatestEvents(db),
  getLatestEvent: getLatestEvent(db),
  getLatestEventByTypes: getLatestEventByTypes(db),
  getTodayCompletedTasks: getTodayCompletedTasks(db),
});
