import { randomUUID } from "crypto";

import * as schema from "@ava/database/schema";
import { describe, expect, it } from "vitest";

import { setup } from "../../../tests/vitest.helper";
import { createTaskQueryRepository } from ".";

const { db, createTestUserAndWorkspace } = await setup();

describe("listEvents", () => {
  it("hides slack_thread_linked by default but can include it when requested", async () => {
    const { workspace, user } = await createTestUserAndWorkspace();
    const streamId = `task-${randomUUID()}`;
    const base = new Date("2024-05-01T00:00:00.000Z");

    await db.insert(schema.taskSessions).values({
      id: streamId,
      userId: user.id,
      workspaceId: workspace.id,
      issueProvider: "manual",
      issueId: null,
      issueTitle: "Link suppression",
      initialSummary: "init",
      status: "in_progress",
      createdAt: base,
      updatedAt: base,
    });

    await db.insert(schema.taskEvents).values([
      {
        id: "evt-start",
        taskSessionId: streamId,
        eventType: "started",
        version: 0,
        summary: "kickoff",
        createdAt: base,
      },
      {
        id: "evt-link",
        taskSessionId: streamId,
        eventType: "slack_thread_linked",
        version: 1,
        summary: "thread-123",
        reason: "C123456",
        createdAt: new Date(base.getTime() + 1000),
      },
    ]);

    const repo = createTaskQueryRepository(db);

    const eventsResult = await repo.listEvents({
      taskSessionId: streamId,
      limit: 10,
    });
    expect.assert(eventsResult.isOk());
    expect(eventsResult.value.map((event) => event.eventType)).toEqual([
      "started",
    ]);

    const withTechnicalResult = await repo.listEvents({
      taskSessionId: streamId,
      includeTechnicalEvents: true,
    });
    expect.assert(withTechnicalResult.isOk());
    expect(withTechnicalResult.value.map((event) => event.eventType)).toEqual([
      "slack_thread_linked",
      "started",
    ]);
  });
});
