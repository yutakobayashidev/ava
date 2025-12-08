import { randomUUID } from "crypto";

import * as schema from "@ava/database/schema";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { describe, expect, it } from "vitest";
import { setup } from "../../tests/vitest.helper";
import { projectTaskEvents } from "./taskSessionProjector";

const { db, createTestUserAndWorkspace } = await setup();

describe("projectTaskEvents", () => {
  it("creates task_sessions from TaskStarted using the event payload", async () => {
    const { workspace, user } = await createTestUserAndWorkspace();
    const streamId = `task-${uuidv7()}`;
    const occurredAt = new Date("2024-01-01T00:00:00.000Z");

    await projectTaskEvents(
      db,
      streamId,
      [
        {
          type: "TaskStarted",
          schemaVersion: 1,
          payload: {
            issue: {
              provider: "manual",
              id: "ISSUE-1",
              title: "kickoff",
            },
            initialSummary: "first summary",
            occurredAt,
          },
        },
      ],
      { workspaceId: workspace.id, userId: user.id },
    );

    const [session] = await db
      .select()
      .from(schema.taskSessions)
      .where(eq(schema.taskSessions.id, streamId));

    expect(session).toBeDefined();
    expect(session?.issueId).toBe("ISSUE-1");
    expect(session?.issueTitle).toBe("kickoff");
    expect(session?.initialSummary).toBe("first summary");
    expect(session?.status).toBe("in_progress");
    expect(session?.createdAt.getTime()).toBe(occurredAt.getTime());
    expect(session?.updatedAt.getTime()).toBe(occurredAt.getTime());
  });

  it("updates status and timestamps for subsequent events", async () => {
    const { workspace, user } = await createTestUserAndWorkspace();
    const streamId = `task-${randomUUID()}`;
    const base = new Date("2024-02-01T00:00:00.000Z");
    const pausedAt = new Date(base.getTime() + 1_000);
    const resumedAt = new Date(base.getTime() + 2_000);
    const completedAt = new Date(base.getTime() + 3_000);

    await projectTaskEvents(
      db,
      streamId,
      [
        {
          type: "TaskStarted",
          schemaVersion: 1,
          payload: {
            issue: { provider: "manual", id: null, title: "flow" },
            initialSummary: "flow start",
            occurredAt: base,
          },
        },
        {
          type: "TaskPaused",
          schemaVersion: 1,
          payload: {
            pauseId: "pause-1",
            reason: "break",
            occurredAt: pausedAt,
          },
        },
        {
          type: "TaskResumed",
          schemaVersion: 1,
          payload: {
            summary: "back",
            resumedFromPauseId: "pause-1",
            occurredAt: resumedAt,
          },
        },
        {
          type: "TaskCompleted",
          schemaVersion: 1,
          payload: { summary: "done", occurredAt: completedAt },
        },
      ],
      { workspaceId: workspace.id, userId: user.id },
    );

    const [session] = await db
      .select()
      .from(schema.taskSessions)
      .where(eq(schema.taskSessions.id, streamId));

    expect(session?.status).toBe("completed");
    expect(session?.createdAt.getTime()).toBe(base.getTime());
    expect(session?.updatedAt.getTime()).toBe(completedAt.getTime());
  });
});
