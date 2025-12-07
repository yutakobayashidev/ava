import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { wrapDrizzle } from "@/lib/database";
import type { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import type {
  AddTaskUpdate,
  CompleteTask,
  CreateTaskSession,
  FindTaskSessionById,
  GetBulkLatestEvents,
  GetBulkUnresolvedBlockReports,
  GetLatestEvent,
  GetLatestEventByTypes,
  GetTodayCompletedTasks,
  GetUnresolvedBlockReports,
  ListEvents,
  ListTaskSessions,
  PauseTask,
  ReportBlock,
  ResolveBlockReport,
  ResumeTask,
  TaskRepository,
  UpdateSlackThread,
} from "./interface";
export type { TaskRepository } from "./interface";

export const createTaskSession =
  (db: Database): CreateTaskSession =>
  ({ request }) => {
    return wrapDrizzle(
      db.transaction(async (tx) => {
        const [session] = await tx
          .insert(schema.taskSessions)
          .values({
            ...request,
            issueId: request.issueId ?? null,
          })
          .returning();

        await tx.insert(schema.taskEvents).values({
          id: uuidv7(),
          taskSessionId: request.id,
          eventType: "started",
          summary: request.initialSummary,
          rawContext: {},
        });

        if (!session) {
          throw new Error("Failed to create task session");
        }

        return session;
      }),
    );
  };

export const addTaskUpdate =
  (db: Database): AddTaskUpdate =>
  ({ request }) => {
    return wrapDrizzle(
      db.transaction(async (tx) => {
        const [session] = await tx
          .update(schema.taskSessions)
          .set({
            status: "in_progress",
            updatedAt: request.updatedAt,
          })
          .where(
            and(
              eq(schema.taskSessions.id, request.taskSessionId),
              eq(schema.taskSessions.workspaceId, request.workspaceId),
              eq(schema.taskSessions.userId, request.userId),
            ),
          )
          .returning();

        const [updateEvent] = await tx
          .insert(schema.taskEvents)
          .values({
            ...request,
            id: uuidv7(),
            taskSessionId: request.taskSessionId,
            eventType: "updated",
            rawContext: request.rawContext ?? {},
          })
          .returning();

        return {
          session: session ?? null,
          updateEvent: updateEvent ?? null,
        };
      }),
    );
  };

export const reportBlock =
  (db: Database): ReportBlock =>
  ({ request }) => {
    return wrapDrizzle(
      db.transaction(async (tx) => {
        const [session] = await tx
          .update(schema.taskSessions)
          .set({
            status: "blocked",
            updatedAt: request.updatedAt,
          })
          .where(
            and(
              eq(schema.taskSessions.id, request.taskSessionId),
              eq(schema.taskSessions.workspaceId, request.workspaceId),
              eq(schema.taskSessions.userId, request.userId),
            ),
          )
          .returning();

        const [blockEvent] = await tx
          .insert(schema.taskEvents)
          .values({
            ...request,
            id: uuidv7(),
            taskSessionId: request.taskSessionId,
            eventType: "blocked",
            rawContext: request.rawContext ?? {},
          })
          .returning();

        return {
          session: session ?? null,
          blockReport: blockEvent ?? null,
        };
      }),
    );
  };

export const pauseTask =
  (db: Database): PauseTask =>
  ({ request }) => {
    return wrapDrizzle(
      db.transaction(async (tx) => {
        const [session] = await tx
          .update(schema.taskSessions)
          .set({
            status: "paused",
            updatedAt: request.updatedAt,
          })
          .where(
            and(
              eq(schema.taskSessions.id, request.taskSessionId),
              eq(schema.taskSessions.workspaceId, request.workspaceId),
              eq(schema.taskSessions.userId, request.userId),
            ),
          )
          .returning();

        const [pauseEvent] = await tx
          .insert(schema.taskEvents)
          .values({
            ...request,
            id: uuidv7(),
            taskSessionId: request.taskSessionId,
            eventType: "paused",
            rawContext: request.rawContext ?? {},
          })
          .returning();

        return {
          session: session ?? null,
          pauseReport: pauseEvent ?? null,
        };
      }),
    );
  };

export const resumeTask =
  (db: Database): ResumeTask =>
  ({ request }) => {
    return wrapDrizzle(
      db.transaction(async (tx) => {
        const [latestPausedEvent] = await tx
          .select()
          .from(schema.taskEvents)
          .where(
            and(
              eq(schema.taskEvents.taskSessionId, request.taskSessionId),
              eq(schema.taskEvents.eventType, "paused"),
            ),
          )
          .orderBy(desc(schema.taskEvents.createdAt))
          .limit(1);

        const [session] = await tx
          .update(schema.taskSessions)
          .set({
            status: "in_progress",
            updatedAt: request.updatedAt,
          })
          .where(
            and(
              eq(schema.taskSessions.id, request.taskSessionId),
              eq(schema.taskSessions.workspaceId, request.workspaceId),
              eq(schema.taskSessions.userId, request.userId),
            ),
          )
          .returning();

        await tx.insert(schema.taskEvents).values({
          ...request,
          id: uuidv7(),
          taskSessionId: request.taskSessionId,
          eventType: "resumed",
          relatedEventId: latestPausedEvent?.id ?? null,
          rawContext: request.rawContext ?? {},
        });

        return {
          session: session ?? null,
        };
      }),
    );
  };

export const completeTask =
  (db: Database): CompleteTask =>
  ({ request }) => {
    return wrapDrizzle(
      db.transaction(async (tx) => {
        const blockedEvents = await tx
          .select()
          .from(schema.taskEvents)
          .where(
            and(
              eq(schema.taskEvents.taskSessionId, request.taskSessionId),
              eq(schema.taskEvents.eventType, "blocked"),
            ),
          )
          .orderBy(desc(schema.taskEvents.createdAt));

        const resolvedEvents = await tx
          .select()
          .from(schema.taskEvents)
          .where(
            and(
              eq(schema.taskEvents.taskSessionId, request.taskSessionId),
              eq(schema.taskEvents.eventType, "block_resolved"),
            ),
          );

        const resolvedBlockIds = new Set(
          resolvedEvents
            .map((e) => e.relatedEventId)
            .filter((id): id is string => id !== null),
        );

        const unresolvedBlocks = blockedEvents.filter(
          (block) => !resolvedBlockIds.has(block.id),
        );

        const [session] = await tx
          .update(schema.taskSessions)
          .set({
            status: "completed",
            updatedAt: request.updatedAt,
          })
          .where(
            and(
              eq(schema.taskSessions.id, request.taskSessionId),
              eq(schema.taskSessions.workspaceId, request.workspaceId),
              eq(schema.taskSessions.userId, request.userId),
            ),
          )
          .returning();

        const [completedEvent] = await tx
          .insert(schema.taskEvents)
          .values({
            ...request,
            id: uuidv7(),
            taskSessionId: request.taskSessionId,
            eventType: "completed",
            rawContext: {},
          })
          .returning();

        return {
          session: session ?? null,
          completedEvent: completedEvent ?? null,
          unresolvedBlocks,
        };
      }),
    );
  };

export const resolveBlockReport =
  (db: Database): ResolveBlockReport =>
  ({ request }) => {
    return wrapDrizzle(
      db.transaction(async (tx) => {
        const [blockEvent] = await tx
          .select()
          .from(schema.taskEvents)
          .where(
            and(
              eq(schema.taskEvents.id, request.blockReportId),
              eq(schema.taskEvents.taskSessionId, request.taskSessionId),
              eq(schema.taskEvents.eventType, "blocked"),
            ),
          );

        if (!blockEvent) {
          return {
            session: null,
            blockReport: null,
          };
        }

        await tx.insert(schema.taskEvents).values({
          id: uuidv7(),
          taskSessionId: request.taskSessionId,
          eventType: "block_resolved",
          reason: blockEvent.reason,
          relatedEventId: request.blockReportId,
          rawContext: {},
        });

        const [session] = await tx
          .update(schema.taskSessions)
          .set({
            status: "in_progress",
            updatedAt: request.updatedAt,
          })
          .where(
            and(
              eq(schema.taskSessions.id, request.taskSessionId),
              eq(schema.taskSessions.workspaceId, request.workspaceId),
              eq(schema.taskSessions.userId, request.userId),
            ),
          )
          .returning();

        return {
          session: session ?? null,
          blockReport: blockEvent,
        };
      }),
    );
  };

// ユーティリティ関数
export const findTaskSessionById =
  (db: Database): FindTaskSessionById =>
  ({ request }) => {
    return wrapDrizzle(
      (async () => {
        const [session] = await db
          .select()
          .from(schema.taskSessions)
          .where(
            and(
              eq(schema.taskSessions.id, request.taskSessionId),
              eq(schema.taskSessions.workspaceId, request.workspaceId),
              eq(schema.taskSessions.userId, request.userId),
            ),
          );

        return session ?? null;
      })(),
    );
  };

export const listTaskSessions =
  (db: Database): ListTaskSessions =>
  ({ request }) => {
    return wrapDrizzle(
      (async () => {
        const limit = request.limit ?? 50;

        const conditions = [
          eq(schema.taskSessions.userId, request.userId),
          eq(schema.taskSessions.workspaceId, request.workspaceId),
        ];

        if (request.status) {
          conditions.push(eq(schema.taskSessions.status, request.status));
        }

        if (request.updatedAfter) {
          conditions.push(
            sql`${schema.taskSessions.updatedAt} >= ${request.updatedAfter}`,
          );
        }

        if (request.updatedBefore) {
          conditions.push(
            sql`${schema.taskSessions.updatedAt} < ${request.updatedBefore}`,
          );
        }

        return db
          .select()
          .from(schema.taskSessions)
          .where(and(...conditions))
          .orderBy(desc(schema.taskSessions.updatedAt))
          .limit(limit);
      })(),
    );
  };

export const updateSlackThread =
  (db: Database): UpdateSlackThread =>
  ({ request }) => {
    return wrapDrizzle(
      (async () => {
        const [session] = await db
          .update(schema.taskSessions)
          .set({
            slackThreadTs: request.threadTs,
            slackChannel: request.channel,
          })
          .where(
            and(
              eq(schema.taskSessions.id, request.taskSessionId),
              eq(schema.taskSessions.workspaceId, request.workspaceId),
              eq(schema.taskSessions.userId, request.userId),
            ),
          )
          .returning();

        return session ?? null;
      })(),
    );
  };

export const listEvents =
  (db: Database): ListEvents =>
  ({ request }) => {
    return wrapDrizzle(
      (async () => {
        const limit = request.limit ?? 50;
        const conditions = [
          eq(schema.taskEvents.taskSessionId, request.taskSessionId),
        ];

        if (request.eventType) {
          conditions.push(eq(schema.taskEvents.eventType, request.eventType));
        }

        return db
          .select()
          .from(schema.taskEvents)
          .where(and(...conditions))
          .orderBy(desc(schema.taskEvents.createdAt))
          .limit(limit);
      })(),
    );
  };

export const getUnresolvedBlockReports =
  (db: Database): GetUnresolvedBlockReports =>
  ({ request }) => {
    return wrapDrizzle(
      (async () => {
        const blockedEvents = await db
          .select()
          .from(schema.taskEvents)
          .where(
            and(
              eq(schema.taskEvents.taskSessionId, request.taskSessionId),
              eq(schema.taskEvents.eventType, "blocked"),
            ),
          )
          .orderBy(desc(schema.taskEvents.createdAt));

        const resolvedEvents = await db
          .select()
          .from(schema.taskEvents)
          .where(
            and(
              eq(schema.taskEvents.taskSessionId, request.taskSessionId),
              eq(schema.taskEvents.eventType, "block_resolved"),
            ),
          );

        const resolvedBlockIds = new Set(
          resolvedEvents
            .map((e) => e.relatedEventId)
            .filter((id): id is string => id !== null),
        );

        return blockedEvents.filter((block) => !resolvedBlockIds.has(block.id));
      })(),
    );
  };

export const getBulkUnresolvedBlockReports =
  (db: Database): GetBulkUnresolvedBlockReports =>
  ({ request }) => {
    return wrapDrizzle(
      (async () => {
        if (request.taskSessionIds.length === 0) {
          return new Map<string, schema.TaskEvent[]>();
        }

        const blockedEvents = await db
          .select()
          .from(schema.taskEvents)
          .where(
            and(
              inArray(schema.taskEvents.taskSessionId, request.taskSessionIds),
              eq(schema.taskEvents.eventType, "blocked"),
            ),
          )
          .orderBy(desc(schema.taskEvents.createdAt));

        const resolvedEvents = await db
          .select()
          .from(schema.taskEvents)
          .where(
            and(
              inArray(schema.taskEvents.taskSessionId, request.taskSessionIds),
              eq(schema.taskEvents.eventType, "block_resolved"),
            ),
          );

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
      })(),
    );
  };

export const getBulkLatestEvents =
  (db: Database): GetBulkLatestEvents =>
  ({ request }) => {
    return wrapDrizzle(
      (async () => {
        if (request.taskSessionIds.length === 0) {
          return new Map<string, schema.TaskEvent[]>();
        }

        const limit = request.limit ?? 5;

        const events = await db
          .select()
          .from(schema.taskEvents)
          .where(
            and(
              inArray(schema.taskEvents.taskSessionId, request.taskSessionIds),
              eq(schema.taskEvents.eventType, request.eventType),
            ),
          )
          .orderBy(desc(schema.taskEvents.createdAt));

        const result = new Map<string, schema.TaskEvent[]>();
        for (const event of events) {
          const existing = result.get(event.taskSessionId) || [];
          if (existing.length < limit) {
            existing.push(event);
            result.set(event.taskSessionId, existing);
          }
        }

        return result;
      })(),
    );
  };

export const getLatestEvent =
  (db: Database): GetLatestEvent =>
  ({ request }) => {
    return wrapDrizzle(
      (async () => {
        const [event] = await db
          .select()
          .from(schema.taskEvents)
          .where(
            and(
              eq(schema.taskEvents.taskSessionId, request.taskSessionId),
              eq(schema.taskEvents.eventType, request.eventType),
            ),
          )
          .orderBy(desc(schema.taskEvents.createdAt))
          .limit(1);

        return event ?? null;
      })(),
    );
  };

export const getLatestEventByTypes =
  (db: Database): GetLatestEventByTypes =>
  ({ request }) => {
    return wrapDrizzle(
      (async () => {
        if (request.eventTypes.length === 0) return null;

        const eventResults = await Promise.all(
          request.eventTypes.map((eventType) =>
            getLatestEvent(db)({
              request: { taskSessionId: request.taskSessionId, eventType },
            }),
          ),
        );

        const events = await Promise.all(
          eventResults.map((result) =>
            result.match(
              (event) => event,
              () => null,
            ),
          ),
        );

        const validEvents = events.filter(
          (e): e is schema.TaskEvent => e !== null,
        );
        if (validEvents.length === 0) return null;

        return validEvents.reduce((latest, current) =>
          current.createdAt > latest.createdAt ? current : latest,
        );
      })(),
    );
  };

export const getTodayCompletedTasks =
  (db: Database): GetTodayCompletedTasks =>
  ({ request }) => {
    return wrapDrizzle(
      (async () => {
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
              eq(schema.taskSessions.userId, request.userId),
              eq(schema.taskSessions.workspaceId, request.workspaceId),
              eq(schema.taskSessions.status, "completed"),
              and(
                sql`${completedAlias.createdAt} >= ${request.dateRange.from}`,
                sql`${completedAlias.createdAt} < ${request.dateRange.to}`,
              ),
            ),
          )
          .orderBy(desc(completedAlias.createdAt));

        return result.map((r) => ({
          ...r.session,
          completedAt: r.completedEvent.createdAt,
          completionSummary: r.completedEvent.summary,
        }));
      })(),
    );
  };

export const createTaskRepository = (db: Database): TaskRepository => ({
  createTaskSession: createTaskSession(db),
  addTaskUpdate: addTaskUpdate(db),
  reportBlock: reportBlock(db),
  pauseTask: pauseTask(db),
  resumeTask: resumeTask(db),
  completeTask: completeTask(db),
  resolveBlockReport: resolveBlockReport(db),
  findTaskSessionById: findTaskSessionById(db),
  listTaskSessions: listTaskSessions(db),
  updateSlackThread: updateSlackThread(db),
  listEvents: listEvents(db),
  getUnresolvedBlockReports: getUnresolvedBlockReports(db),
  getBulkUnresolvedBlockReports: getBulkUnresolvedBlockReports(db),
  getBulkLatestEvents: getBulkLatestEvents(db),
  getLatestEvent: getLatestEvent(db),
  getLatestEventByTypes: getLatestEventByTypes(db),
  getTodayCompletedTasks: getTodayCompletedTasks(db),
});
