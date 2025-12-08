import * as schema from "@ava/database/schema";
import { asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { uuidv7 } from "zod";
import { setup } from "../../tests/vitest.helper";
import { createEventStore } from "./event-store";

const { db, createTestUserAndWorkspace } = await setup();

describe("event-store", () => {
  let store: ReturnType<typeof createEventStore>;
  let workspace: Awaited<
    ReturnType<typeof createTestUserAndWorkspace>
  >["workspace"];
  let user: Awaited<ReturnType<typeof createTestUserAndWorkspace>>["user"];

  beforeEach(() => {
    store = createEventStore(db);
  });

  async function seedStream(streamId: string) {
    ({ workspace, user } = await createTestUserAndWorkspace());
    const now = new Date();

    await db.insert(schema.taskSessions).values({
      id: streamId,
      userId: user.id,
      workspaceId: workspace.id,
      issueProvider: "manual",
      issueId: null,
      issueTitle: "seeded",
      initialSummary: "seeded",
      status: "in_progress",
      createdAt: now,
      updatedAt: now,
    });
  }

  it("persists events with sequential versions and loads them in order", async () => {
    const streamId = `task-${uuidv7()}`;
    await seedStream(streamId);
    const base = new Date("2024-01-01T00:00:00.000Z");

    const startEvent = {
      type: "TaskStarted" as const,
      payload: {
        issue: { provider: "manual" as const, title: "kickoff" },
        initialSummary: "kickoff",
        occurredAt: base,
      },
    };
    const updateEvent = {
      type: "TaskUpdated" as const,
      payload: {
        summary: "progressing",
        occurredAt: new Date(base.getTime() + 1000),
      },
    };
    const completedEvent = {
      type: "TaskCompleted" as const,
      payload: {
        summary: "done",
        occurredAt: new Date(base.getTime() + 2000),
      },
    };

    const appendResult = await store.append(streamId, -1, [
      startEvent,
      updateEvent,
      completedEvent,
    ]);

    expect(appendResult.newVersion).toBe(2);

    const persisted = await db
      .select({
        eventType: schema.taskEvents.eventType,
        version: schema.taskEvents.version,
        summary: schema.taskEvents.summary,
      })
      .from(schema.taskEvents)
      .where(eq(schema.taskEvents.taskSessionId, streamId))
      .orderBy(asc(schema.taskEvents.version));

    expect(persisted.map((event) => event.version)).toEqual([0, 1, 2]);
    expect(persisted.map((event) => event.eventType)).toEqual([
      "started",
      "updated",
      "completed",
    ]);
    expect(persisted[0]?.summary).toBe("kickoff");
    expect(persisted[1]?.summary).toBe("progressing");
    expect(persisted[2]?.summary).toBe("done");

    const loaded = await store.load(streamId);
    expect(loaded.map((event) => event.type)).toEqual([
      "TaskStarted",
      "TaskUpdated",
      "TaskCompleted",
    ]);
    expect(loaded[0]?.payload).toMatchObject({ initialSummary: "kickoff" });
    expect(loaded[1]?.payload).toMatchObject({ summary: "progressing" });
    expect(loaded[2]?.payload).toMatchObject({ summary: "done" });
  });

  it("throws a concurrency conflict when expected version does not match", async () => {
    const streamId = `task-${uuidv7()}`;
    await seedStream(streamId);
    const base = new Date("2024-01-02T00:00:00.000Z");

    await store.append(streamId, -1, [
      {
        type: "TaskStarted" as const,
        payload: {
          issue: { provider: "manual" as const, title: "kickoff" },
          initialSummary: "kickoff",
          occurredAt: base,
        },
      },
    ]);

    await expect(
      store.append(streamId, -1, [
        {
          type: "TaskUpdated" as const,
          payload: {
            summary: "late update",
            occurredAt: new Date(base.getTime() + 1000),
          },
        },
      ]),
    ).rejects.toThrow(/Concurrency conflict: expected version -1, got 0/);
  });

  it("maps related identifiers for block, pause/resume, slack link, and cancel events", async () => {
    const streamId = `task-${uuidv7()}`;
    await seedStream(streamId);
    const base = new Date("2024-01-03T00:00:00.000Z");
    const blockId = "block-123";
    const pauseId = "pause-123";

    await store.append(streamId, -1, [
      {
        type: "TaskBlocked" as const,
        payload: { blockId, reason: "db down", occurredAt: base },
      },
      {
        type: "BlockResolved" as const,
        payload: {
          blockId,
          reason: "fixed",
          occurredAt: new Date(base.getTime() + 1000),
        },
      },
      {
        type: "TaskPaused" as const,
        payload: {
          pauseId,
          reason: "break",
          occurredAt: new Date(base.getTime() + 2000),
        },
      },
      {
        type: "TaskResumed" as const,
        payload: {
          summary: "back",
          resumedFromPauseId: pauseId,
          occurredAt: new Date(base.getTime() + 3000),
        },
      },
      {
        type: "SlackThreadLinked" as const,
        payload: {
          channel: "C123",
          threadTs: "thread-123",
          occurredAt: new Date(base.getTime() + 4000),
        },
      },
      {
        type: "TaskCancelled" as const,
        payload: {
          reason: "canceled",
          occurredAt: new Date(base.getTime() + 5000),
        },
      },
    ]);

    const persisted = await db
      .select({
        eventType: schema.taskEvents.eventType,
        relatedEventId: schema.taskEvents.relatedEventId,
        reason: schema.taskEvents.reason,
        summary: schema.taskEvents.summary,
      })
      .from(schema.taskEvents)
      .where(eq(schema.taskEvents.taskSessionId, streamId))
      .orderBy(asc(schema.taskEvents.version));

    const blockResolvedRow = persisted.find(
      (event) => event.eventType === "block_resolved",
    );
    expect(blockResolvedRow?.relatedEventId).toBe(blockId);
    expect(blockResolvedRow?.reason).toBe("fixed");

    const resumedRow = persisted.find((event) => event.eventType === "resumed");
    expect(resumedRow?.relatedEventId).toBe(pauseId);
    expect(resumedRow?.summary).toBe("back");

    const slackLinkedRow = persisted.find(
      (event) => event.eventType === "slack_thread_linked",
    );
    expect(slackLinkedRow?.summary).toBe("thread-123");
    expect(slackLinkedRow?.reason).toBe("C123");

    const loaded = await store.load(streamId);
    expect(loaded.map((event) => event.type)).toEqual([
      "TaskBlocked",
      "BlockResolved",
      "TaskPaused",
      "TaskResumed",
      "SlackThreadLinked",
      "TaskCancelled",
    ]);

    const [blocked, resolved, paused, resumed, slackLinked, cancelled] = loaded;
    expect(blocked?.payload).toMatchObject({ blockId, reason: "db down" });
    expect(resolved?.payload).toMatchObject({ blockId, reason: "fixed" });
    expect(paused?.payload).toMatchObject({ pauseId, reason: "break" });
    expect(resumed?.payload).toMatchObject({
      resumedFromPauseId: pauseId,
      summary: "back",
    });
    expect(slackLinked?.payload).toMatchObject({
      channel: "C123",
      threadTs: "thread-123",
    });
    expect(cancelled?.payload).toMatchObject({ reason: "canceled" });
  });
});
