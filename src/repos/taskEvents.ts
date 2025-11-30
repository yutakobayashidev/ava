import { and, desc, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { Database } from "../clients/drizzle";
import * as schema from "../db/schema";

type TaskEventType = (typeof schema.taskEventTypeEnum.enumValues)[number];

type TaskEventRepositoryDeps = {
  db: Database;
};

type CreateEventInput = {
  taskSessionId: string;
  eventType: TaskEventType;
  reason?: string | null;
  summary?: string | null;
  rawContext?: Record<string, unknown>;
};

type ListEventsInput = {
  taskSessionId: string;
  eventType?: TaskEventType;
  limit?: number;
};

type GetLatestEventInput = {
  taskSessionId: string;
  eventType: TaskEventType;
};

export const createTaskEventRepository = ({ db }: TaskEventRepositoryDeps) => {
  const createEvent = async (input: CreateEventInput) => {
    const [event] = await db
      .insert(schema.taskEvents)
      .values({
        id: uuidv7(),
        taskSessionId: input.taskSessionId,
        eventType: input.eventType,
        reason: input.reason ?? null,
        summary: input.summary ?? null,
        rawContext: input.rawContext ?? {},
      })
      .returning();

    return event;
  };

  const listEvents = async (input: ListEventsInput) => {
    const limit = input.limit ?? 50;
    const conditions = [
      eq(schema.taskEvents.taskSessionId, input.taskSessionId),
    ];

    if (input.eventType) {
      conditions.push(eq(schema.taskEvents.eventType, input.eventType));
    }

    return db
      .select()
      .from(schema.taskEvents)
      .where(and(...conditions))
      .orderBy(desc(schema.taskEvents.createdAt))
      .limit(limit);
  };

  const getLatestEvent = async (input: GetLatestEventInput) => {
    const [event] = await db
      .select()
      .from(schema.taskEvents)
      .where(
        and(
          eq(schema.taskEvents.taskSessionId, input.taskSessionId),
          eq(schema.taskEvents.eventType, input.eventType),
        ),
      )
      .orderBy(desc(schema.taskEvents.createdAt))
      .limit(1);

    return event ?? null;
  };

  const getLatestEventByTypes = async (
    taskSessionId: string,
    eventTypes: TaskEventType[],
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

  return {
    createEvent,
    listEvents,
    getLatestEvent,
    getLatestEventByTypes,
  };
};

export type TaskEventRepository = ReturnType<typeof createTaskEventRepository>;
export type { CreateEventInput, ListEventsInput, GetLatestEventInput };
