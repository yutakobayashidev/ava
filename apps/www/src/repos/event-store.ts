import { DatabaseError, wrapDrizzle } from "@/lib/db";
import { BadRequestError } from "@/errors";
import type { Event, Issue } from "@/objects/task/types";
import { upcastEvent } from "@/objects/task/upcaster";
import type { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import { asc, eq, sql } from "drizzle-orm";
import { ResultAsync } from "neverthrow";
import { uuidv7 } from "uuidv7";

type AppendResult = {
  newVersion: number;
  persistedEvents: schema.TaskEvent[];
};

function mapEventToDb(event: Event, version: number, streamId: string) {
  switch (event.type) {
    case "TaskStarted":
      return {
        id: uuidv7(),
        taskSessionId: streamId,
        version,
        eventType: "started" as const,
        summary: event.payload.initialSummary,
        metadata: {
          schemaVersion: event.schemaVersion,
          issue: event.payload.issue,
        },
        createdAt: event.payload.occurredAt,
      } satisfies schema.NewTaskEvent;
    case "TaskUpdated":
      return {
        id: uuidv7(),
        taskSessionId: streamId,
        version,
        eventType: "updated" as const,
        summary: event.payload.summary,
        metadata: {
          schemaVersion: event.schemaVersion,
        },
        createdAt: event.payload.occurredAt,
      } satisfies schema.NewTaskEvent;
    case "TaskBlocked":
      return {
        id: event.payload.blockId,
        taskSessionId: streamId,
        version,
        eventType: "blocked" as const,
        reason: event.payload.reason,
        metadata: {
          schemaVersion: event.schemaVersion,
        },
        createdAt: event.payload.occurredAt,
      } satisfies schema.NewTaskEvent;
    case "BlockResolved":
      return {
        id: uuidv7(),
        taskSessionId: streamId,
        version,
        eventType: "block_resolved" as const,
        reason: event.payload.reason,
        relatedEventId: event.payload.blockId,
        metadata: {
          schemaVersion: event.schemaVersion,
        },
        createdAt: event.payload.occurredAt,
      } satisfies schema.NewTaskEvent;
    case "TaskPaused":
      return {
        id: event.payload.pauseId,
        taskSessionId: streamId,
        version,
        eventType: "paused" as const,
        reason: event.payload.reason,
        metadata: {
          schemaVersion: event.schemaVersion,
        },
        createdAt: event.payload.occurredAt,
      } satisfies schema.NewTaskEvent;
    case "TaskResumed":
      return {
        id: uuidv7(),
        taskSessionId: streamId,
        version,
        eventType: "resumed" as const,
        summary: event.payload.summary,
        relatedEventId: event.payload.resumedFromPauseId ?? null,
        metadata: {
          schemaVersion: event.schemaVersion,
        },
        createdAt: event.payload.occurredAt,
      } satisfies schema.NewTaskEvent;
    case "TaskCompleted":
      return {
        id: uuidv7(),
        taskSessionId: streamId,
        version,
        eventType: "completed" as const,
        summary: event.payload.summary,
        metadata: {
          schemaVersion: event.schemaVersion,
        },
        createdAt: event.payload.occurredAt,
      } satisfies schema.NewTaskEvent;
    case "TaskCancelled":
      return {
        id: uuidv7(),
        taskSessionId: streamId,
        version,
        eventType: "cancelled" as const,
        reason: event.payload.reason,
        metadata: {
          schemaVersion: event.schemaVersion,
        },
        createdAt: event.payload.occurredAt,
      } satisfies schema.NewTaskEvent;
    case "SlackThreadLinked":
      return {
        id: uuidv7(),
        taskSessionId: streamId,
        version,
        eventType: "slack_thread_linked" as const,
        summary: event.payload.threadTs,
        reason: event.payload.channel,
        metadata: {
          schemaVersion: event.schemaVersion,
        },
        createdAt: event.payload.occurredAt,
      } satisfies schema.NewTaskEvent;
    default: {
      const _: never = event;
      throw new Error("Unsupported event type for persistence");
    }
  }
}

type EventStore = {
  load: (streamId: string) => ResultAsync<Event[], DatabaseError>;
  append: (
    streamId: string,
    expectedVersion: number,
    events: Event[],
  ) => ResultAsync<AppendResult, BadRequestError | DatabaseError>;
};

function mapDbToDomain(event: schema.TaskEvent): Event {
  // All events are currently version 1. When version 2+ is introduced,
  // the upcaster will handle conversion from older versions.
  // Legacy events without schemaVersion are also treated as version 1.
  let domainEvent: Event;

  switch (event.eventType) {
    case "started": {
      const issue: Issue = event.metadata?.issue ?? {
        provider: "manual",
        id: null,
        title: event.summary ?? "",
      };
      domainEvent = {
        type: "TaskStarted",
        schemaVersion: 1,
        payload: {
          issue,
          initialSummary: event.summary ?? "",
          occurredAt: event.createdAt,
        },
      };
      break;
    }
    case "updated":
      domainEvent = {
        type: "TaskUpdated",
        schemaVersion: 1,
        payload: {
          summary: event.summary ?? "",
          occurredAt: event.createdAt,
        },
      };
      break;
    case "blocked":
      domainEvent = {
        type: "TaskBlocked",
        schemaVersion: 1,
        payload: {
          blockId: event.id,
          reason: event.reason ?? "",
          occurredAt: event.createdAt,
        },
      };
      break;
    case "block_resolved":
      domainEvent = {
        type: "BlockResolved",
        schemaVersion: 1,
        payload: {
          blockId: event.relatedEventId ?? "",
          reason: event.reason ?? "",
          occurredAt: event.createdAt,
        },
      };
      break;
    case "paused":
      domainEvent = {
        type: "TaskPaused",
        schemaVersion: 1,
        payload: {
          pauseId: event.id,
          reason: event.reason ?? "",
          occurredAt: event.createdAt,
        },
      };
      break;
    case "resumed":
      domainEvent = {
        type: "TaskResumed",
        schemaVersion: 1,
        payload: {
          summary: event.summary ?? "",
          resumedFromPauseId: event.relatedEventId ?? undefined,
          occurredAt: event.createdAt,
        },
      };
      break;
    case "completed":
      domainEvent = {
        type: "TaskCompleted",
        schemaVersion: 1,
        payload: {
          summary: event.summary ?? "",
          occurredAt: event.createdAt,
        },
      };
      break;
    case "cancelled":
      domainEvent = {
        type: "TaskCancelled",
        schemaVersion: 1,
        payload: {
          reason: event.reason ?? undefined,
          occurredAt: event.createdAt,
        },
      };
      break;
    case "slack_thread_linked":
      domainEvent = {
        type: "SlackThreadLinked",
        schemaVersion: 1,
        payload: {
          channel: event.reason ?? "",
          threadTs: event.summary ?? "",
          occurredAt: event.createdAt,
        },
      };
      break;
    default:
      throw new Error(
        `Unsupported event type when loading: ${event.eventType}`,
      );
  }

  // Apply upcasting to convert old schema versions to latest
  return upcastEvent(domainEvent);
}

export const createEventStore = (db: Database): EventStore => {
  return {
    load: (streamId: string) => {
      return wrapDrizzle(
        db
          .select()
          .from(schema.taskEvents)
          .where(eq(schema.taskEvents.taskSessionId, streamId))
          .orderBy(asc(schema.taskEvents.version)),
      ).map((rows) => rows.map(mapDbToDomain));
    },
    append: (streamId, expectedVersion, events) => {
      return ResultAsync.fromPromise(
        db.transaction(async (tx) => {
          const [latest] = await tx
            .select({
              version: sql<number>`COALESCE(MAX(${schema.taskEvents.version}), -1)`,
            })
            .from(schema.taskEvents)
            .where(eq(schema.taskEvents.taskSessionId, streamId));

          const currentVersion = latest?.version ?? -1;
          if (currentVersion !== expectedVersion) {
            throw new BadRequestError(
              `Concurrency conflict: expected version ${expectedVersion}, got ${currentVersion}`,
            );
          }

          const rows = events.map((event, idx) =>
            mapEventToDb(event, expectedVersion + 1 + idx, streamId),
          );

          const persisted = await tx
            .insert(schema.taskEvents)
            .values(rows)
            .returning();

          return {
            newVersion: expectedVersion + events.length,
            persistedEvents: persisted,
          } satisfies AppendResult;
        }),
        (error) => {
          if (error instanceof BadRequestError) return error;
          if (error instanceof DatabaseError) return error;
          return new DatabaseError("Failed to append events", error);
        },
      );
    },
  };
};
