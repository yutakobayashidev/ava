import { desc, eq, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Database } from "@ava/database/client";
import * as schema from "@ava/database/schema";
import type { Event } from "@/domain/task/types";

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
        rawContext: {},
        createdAt: event.payload.occurredAt,
      } satisfies schema.NewTaskEvent;
    case "TaskUpdated":
      return {
        id: uuidv7(),
        taskSessionId: streamId,
        version,
        eventType: "updated" as const,
        summary: event.payload.summary,
        rawContext: event.payload.rawContext,
        createdAt: event.payload.occurredAt,
      } satisfies schema.NewTaskEvent;
    case "TaskBlocked":
      return {
        id: event.payload.blockId,
        taskSessionId: streamId,
        version,
        eventType: "blocked" as const,
        reason: event.payload.reason,
        rawContext: event.payload.rawContext,
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
        rawContext: {},
        createdAt: event.payload.occurredAt,
      } satisfies schema.NewTaskEvent;
    case "TaskPaused":
      return {
        id: event.payload.pauseId,
        taskSessionId: streamId,
        version,
        eventType: "paused" as const,
        reason: event.payload.reason,
        rawContext: event.payload.rawContext,
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
        rawContext: event.payload.rawContext,
        createdAt: event.payload.occurredAt,
      } satisfies schema.NewTaskEvent;
    case "TaskCompleted":
      return {
        id: uuidv7(),
        taskSessionId: streamId,
        version,
        eventType: "completed" as const,
        summary: event.payload.summary,
        rawContext: {},
        createdAt: event.payload.occurredAt,
      } satisfies schema.NewTaskEvent;
    default:
      throw new Error(`Unsupported event type for persistence: ${event.type}`);
  }
}

export type EventStore = {
  load: (streamId: string) => Promise<Event[]>;
  append: (
    streamId: string,
    expectedVersion: number,
    events: Event[],
  ) => Promise<AppendResult>;
};

function mapDbToDomain(event: schema.TaskEvent): Event {
  switch (event.eventType) {
    case "started": {
      return {
        type: "TaskStarted",
        payload: {
          issue: {
            provider: "manual",
            id: null,
            title: event.summary ?? "",
          },
          initialSummary: event.summary ?? "",
          occurredAt: event.createdAt,
        },
      };
    }
    case "updated":
      return {
        type: "TaskUpdated",
        payload: {
          summary: event.summary ?? "",
          rawContext: {},
          occurredAt: event.createdAt,
        },
      };
    case "blocked":
      return {
        type: "TaskBlocked",
        payload: {
          blockId: event.id,
          reason: event.reason ?? "",
          rawContext: {},
          occurredAt: event.createdAt,
        },
      };
    case "block_resolved":
      return {
        type: "BlockResolved",
        payload: {
          blockId: event.relatedEventId ?? "",
          reason: event.reason ?? "",
          occurredAt: event.createdAt,
        },
      };
    case "paused":
      return {
        type: "TaskPaused",
        payload: {
          pauseId: event.id,
          reason: event.reason ?? "",
          rawContext: {},
          occurredAt: event.createdAt,
        },
      };
    case "resumed":
      return {
        type: "TaskResumed",
        payload: {
          summary: event.summary ?? "",
          rawContext: {},
          resumedFromPauseId: event.relatedEventId ?? undefined,
          occurredAt: event.createdAt,
        },
      };
    case "completed":
      return {
        type: "TaskCompleted",
        payload: {
          summary: event.summary ?? "",
          occurredAt: event.createdAt,
        },
      };
    default:
      throw new Error(
        `Unsupported event type when loading: ${event.eventType}`,
      );
  }
}

export const createEventStore = (db: Database): EventStore => {
  return {
    load: async (streamId: string) => {
      const rows = await db
        .select()
        .from(schema.taskEvents)
        .where(eq(schema.taskEvents.taskSessionId, streamId))
        .orderBy(desc(schema.taskEvents.version));

      return rows.reverse().map(mapDbToDomain);
    },
    append: async (streamId, expectedVersion, events) => {
      return db.transaction(async (tx) => {
        const [latest] = await tx
          .select({
            version: sql<number>`COALESCE(MAX(${schema.taskEvents.version}), -1)`,
          })
          .from(schema.taskEvents)
          .where(eq(schema.taskEvents.taskSessionId, streamId));

        const currentVersion = latest?.version ?? -1;
        if (currentVersion !== expectedVersion) {
          throw new Error(
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
      });
    },
  };
};
