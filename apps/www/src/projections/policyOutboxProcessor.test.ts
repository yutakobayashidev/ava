import { randomUUID } from "crypto";

import type { Event } from "@/objects/task/types";
import { createEventStore } from "@/repos/event-store";
import * as schema from "@ava/database/schema";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { setup } from "../../tests/vitest.helper";
import { processTaskPolicyOutbox } from "./policyOutboxProcessor";
import { queuePolicyEvents } from "./taskPolicyOutbox";
import { projectTaskEvents } from "./taskSessionProjector";

const { db, createTestUserAndWorkspace } = await setup();

const mockPostMessage = vi.hoisted(() => vi.fn());
const mockAddReaction = vi.hoisted(() => vi.fn());

vi.mock("@/services/slackNotificationService", () => ({
  createSlackNotificationService: () => ({
    postMessage: mockPostMessage,
    addReaction: mockAddReaction,
  }),
}));

describe("taskPolicyOutbox & processTaskPolicyOutbox", () => {
  it("enqueues notify/reaction policies and processes them", async () => {
    const { workspace, user } = await createTestUserAndWorkspace();
    const streamId = `task-${randomUUID()}`;
    const base = new Date("2024-03-01T00:00:00.000Z");

    await db.insert(schema.taskSessions).values({
      id: streamId,
      userId: user.id,
      workspaceId: workspace.id,
      issueProvider: "manual",
      issueId: "ISSUE-1",
      issueTitle: "CQRS",
      initialSummary: "init",
      status: "in_progress",
      createdAt: base,
      updatedAt: base,
    });

    const events: Event[] = [
      {
        type: "TaskStarted",
        schemaVersion: 1,
        payload: {
          issue: { provider: "manual", id: "ISSUE-1", title: "CQRS" },
          initialSummary: "init",
          occurredAt: base,
        },
      },
      {
        type: "TaskCompleted",
        schemaVersion: 1,
        payload: {
          summary: "done",
          occurredAt: new Date(base.getTime() + 1000),
        },
      },
    ];

    await queuePolicyEvents(db, streamId, events, {
      workspaceId: workspace.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        slackId: user.slackId,
      },
      channel: workspace.notificationChannelId,
      threadTs: "thread-existing",
    });

    mockPostMessage.mockResolvedValue({
      delivered: true,
      channel: workspace.notificationChannelId,
      threadTs: "thread-existing",
    });
    mockAddReaction.mockResolvedValue({ delivered: true });

    await processTaskPolicyOutbox(db);

    const policies = await db
      .select({
        policyType: schema.taskPolicyOutbox.policyType,
        status: schema.taskPolicyOutbox.status,
        payload: schema.taskPolicyOutbox.payload,
      })
      .from(schema.taskPolicyOutbox)
      .where(eq(schema.taskPolicyOutbox.taskSessionId, streamId));

    expect(policies).toHaveLength(3); // started notify, completed notify, completed reaction
    expect(policies.every((p) => p.status === "processed")).toBe(true);
    expect(policies.map((p) => p.policyType).sort()).toEqual([
      "slack_notify",
      "slack_notify",
      "slack_reaction",
    ]);
    expect(mockPostMessage).toHaveBeenCalledTimes(2);
    expect(mockAddReaction).toHaveBeenCalledTimes(1);

    const linked = await db
      .select({ type: schema.taskEvents.eventType })
      .from(schema.taskEvents)
      .where(eq(schema.taskEvents.taskSessionId, streamId));

    // threadが既にある場合はSlackThreadLinkedを追加しない
    expect(linked.some((e) => e.type === "slack_thread_linked")).toBe(false);
  });

  it("links Slack thread when notify succeeds without pre-set threadTs", async () => {
    const { workspace, user } = await createTestUserAndWorkspace();
    const streamId = `task-${randomUUID()}`;
    const occurredAt = new Date("2024-04-01T00:00:00.000Z");

    const startEvent: Event = {
      type: "TaskStarted",
      schemaVersion: 1,
      payload: {
        issue: { provider: "manual", id: null, title: "Start only" },
        initialSummary: "init",
        occurredAt,
      },
    };

    const eventStore = createEventStore(db);
    await eventStore.append(streamId, -1, [startEvent]);
    await projectTaskEvents(db, streamId, [startEvent], {
      workspaceId: workspace.id,
      userId: user.id,
    });

    await queuePolicyEvents(db, streamId, [startEvent], {
      workspaceId: workspace.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        slackId: user.slackId,
      },
      channel: workspace.notificationChannelId,
      threadTs: null,
    });

    mockPostMessage.mockResolvedValue({
      delivered: true,
      channel: workspace.notificationChannelId,
      threadTs: "thread-from-slack",
    });

    await processTaskPolicyOutbox(db);

    const [policy] = await db
      .select({
        status: schema.taskPolicyOutbox.status,
        payload: schema.taskPolicyOutbox.payload,
      })
      .from(schema.taskPolicyOutbox)
      .where(eq(schema.taskPolicyOutbox.taskSessionId, streamId));

    expect(policy?.status).toBe("processed");

    const events = await db
      .select({
        eventType: schema.taskEvents.eventType,
        summary: schema.taskEvents.summary,
        reason: schema.taskEvents.reason,
      })
      .from(schema.taskEvents)
      .where(eq(schema.taskEvents.taskSessionId, streamId));

    const slackLinked = events.find(
      (event) => event.eventType === "slack_thread_linked",
    );
    expect(slackLinked).toBeDefined();
    expect(slackLinked?.summary).toBe("thread-from-slack");
    expect(slackLinked?.reason).toBe(workspace.notificationChannelId);

    const session = await db.query.taskSessions.findFirst({
      where: eq(schema.taskSessions.id, streamId),
    });

    expect(session?.slackThreadTs).toBe("thread-from-slack");
    expect(session?.slackChannel).toBe(workspace.notificationChannelId);
  });
});
