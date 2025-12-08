import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { ResultAsync } from "neverthrow";

import type { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import { wrapDrizzle } from "@/lib/db";
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
  (taskSessionId: string, workspaceId: string, userId: string) =>
    wrapDrizzle(
      db
        .select()
        .from(schema.taskSessions)
        .where(
          and(
            eq(schema.taskSessions.id, taskSessionId),
            eq(schema.taskSessions.workspaceId, workspaceId),
            eq(schema.taskSessions.userId, userId),
          ),
        ),
    ).map(([session]) => session ?? null);

const getUnresolvedBlockReports = (db: Database) => (taskSessionId: string) => {
  const blockedEventsQuery = wrapDrizzle(
    db
      .select()
      .from(schema.taskEvents)
      .where(
        and(
          eq(schema.taskEvents.taskSessionId, taskSessionId),
          eq(schema.taskEvents.eventType, "blocked"),
        ),
      )
      .orderBy(desc(schema.taskEvents.createdAt)),
  );

  const resolvedEventsQuery = wrapDrizzle(
    db
      .select()
      .from(schema.taskEvents)
      .where(
        and(
          eq(schema.taskEvents.taskSessionId, taskSessionId),
          eq(schema.taskEvents.eventType, "block_resolved"),
        ),
      ),
  );

  return ResultAsync.combine([blockedEventsQuery, resolvedEventsQuery]).map(
    ([blockedEvents, resolvedEvents]) => {
      const resolvedBlockIds = new Set(
        resolvedEvents
          .map((e) => e.relatedEventId)
          .filter((id): id is string => id !== null),
      );

      return blockedEvents.filter((block) => !resolvedBlockIds.has(block.id));
    },
  );
};

const getBulkUnresolvedBlockReports =
  (db: Database) => (taskSessionIds: string[]) => {
    if (taskSessionIds.length === 0) {
      return ResultAsync.fromSafePromise(
        Promise.resolve(new Map<string, schema.TaskEvent[]>()),
      );
    }

    const blockedEventsQuery = wrapDrizzle(
      db
        .select()
        .from(schema.taskEvents)
        .where(
          and(
            inArray(schema.taskEvents.taskSessionId, taskSessionIds),
            eq(schema.taskEvents.eventType, "blocked"),
          ),
        )
        .orderBy(desc(schema.taskEvents.createdAt)),
    );

    const resolvedEventsQuery = wrapDrizzle(
      db
        .select()
        .from(schema.taskEvents)
        .where(
          and(
            inArray(schema.taskEvents.taskSessionId, taskSessionIds),
            eq(schema.taskEvents.eventType, "block_resolved"),
          ),
        ),
    );

    return ResultAsync.combine([blockedEventsQuery, resolvedEventsQuery]).map(
      ([blockedEvents, resolvedEvents]) => {
        const resolvedBlockIds = new Set(
          resolvedEvents
            .map((e) => e.relatedEventId)
            .filter((id): id is string => id !== null),
        );

        const result = new Map<string, schema.TaskEvent[]>();
        for (const event of blockedEvents) {
          if (!resolvedBlockIds.has(event.id)) {
            const existing = result.get(event.taskSessionId) || [];
            existing.push(event);
            result.set(event.taskSessionId, existing);
          }
        }

        return result;
      },
    );
  };

const listTaskSessions =
  (db: Database) => (params: ListTaskSessionsRequest) => {
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

    return wrapDrizzle(
      db
        .select()
        .from(schema.taskSessions)
        .where(and(...conditions))
        .orderBy(desc(schema.taskSessions.updatedAt))
        .limit(limit),
    );
  };

const updateSlackThread =
  (db: Database) =>
  (params: {
    taskSessionId: string;
    workspaceId: string;
    userId: string;
    threadTs: string;
    channel: string;
  }) =>
    wrapDrizzle(
      db
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
        .returning(),
    ).map(([session]) => session ?? null);

const listEvents =
  (db: Database) =>
  (params: {
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

    return wrapDrizzle(
      db
        .select()
        .from(schema.taskEvents)
        .where(and(...conditions))
        .orderBy(desc(schema.taskEvents.createdAt))
        .limit(limit),
    );
  };

const getBulkLatestEvents =
  (db: Database) =>
  (params: {
    taskSessionIds: string[];
    eventType: (typeof schema.taskEventTypeEnum.enumValues)[number];
    limit?: number;
  }) => {
    if (params.taskSessionIds.length === 0) {
      return ResultAsync.fromSafePromise(
        Promise.resolve(new Map<string, schema.TaskEvent[]>()),
      );
    }

    const limit = params.limit ?? 5;

    return wrapDrizzle(
      db
        .select()
        .from(schema.taskEvents)
        .where(
          and(
            inArray(schema.taskEvents.taskSessionId, params.taskSessionIds),
            eq(schema.taskEvents.eventType, params.eventType),
          ),
        )
        .orderBy(desc(schema.taskEvents.createdAt)),
    ).map((events) => {
      const result = new Map<string, schema.TaskEvent[]>();
      for (const event of events) {
        const existing = result.get(event.taskSessionId) || [];
        if (existing.length < limit) {
          existing.push(event);
          result.set(event.taskSessionId, existing);
        }
      }
      return result;
    });
  };

const getLatestEvent =
  (db: Database) =>
  (params: {
    taskSessionId: string;
    eventType: (typeof schema.taskEventTypeEnum.enumValues)[number];
  }) =>
    wrapDrizzle(
      db
        .select()
        .from(schema.taskEvents)
        .where(
          and(
            eq(schema.taskEvents.taskSessionId, params.taskSessionId),
            eq(schema.taskEvents.eventType, params.eventType),
          ),
        )
        .orderBy(desc(schema.taskEvents.createdAt))
        .limit(1),
    ).map(([event]) => event ?? null);

const getLatestEventByTypes =
  (db: Database) =>
  (
    taskSessionId: string,
    eventTypes: (typeof schema.taskEventTypeEnum.enumValues)[number][],
  ) => {
    if (eventTypes.length === 0) {
      return ResultAsync.fromSafePromise(Promise.resolve(null));
    }

    return ResultAsync.combine(
      eventTypes.map((eventType) =>
        getLatestEvent(db)({ taskSessionId, eventType }),
      ),
    ).map((events) => {
      const validEvents = events.filter(
        (e): e is schema.TaskEvent => e !== null,
      );
      if (validEvents.length === 0) return null;

      return validEvents.reduce((latest, current) =>
        current.createdAt > latest.createdAt ? current : latest,
      );
    });
  };

const getTodayCompletedTasks =
  (db: Database) =>
  (params: {
    userId: string;
    workspaceId: string;
    dateRange: { from: Date; to: Date };
  }) => {
    const completedAlias = schema.taskEvents;

    return wrapDrizzle(
      db
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
        .orderBy(desc(completedAlias.createdAt)),
    ).map((result) =>
      result.map((r) => ({
        ...r.session,
        completedAt: r.completedEvent.createdAt,
        completionSummary: r.completedEvent.summary,
      })),
    );
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
