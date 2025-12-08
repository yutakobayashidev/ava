import { asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@ava/database/schema";
import { createTaskCommandExecutor, type TaskCommandExecutor } from "./index";
import { setup } from "../../../tests/vitest.helper";

const { db, createTestUserAndWorkspace } = await setup();

const mockPostMessage = vi.hoisted(() => vi.fn());
const mockAddReaction = vi.hoisted(() => vi.fn());

vi.mock("@/services/slackNotificationService", () => ({
  createSlackNotificationService: () => ({
    postMessage: mockPostMessage,
    addReaction: mockAddReaction,
  }),
}));

describe("createTaskCommandExecutor", () => {
  let workspace: Awaited<
    ReturnType<typeof createTestUserAndWorkspace>
  >["workspace"];
  let user: Awaited<ReturnType<typeof createTestUserAndWorkspace>>["user"];
  let executeCommand: TaskCommandExecutor;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ user, workspace } = await createTestUserAndWorkspace());
    executeCommand = createTaskCommandExecutor({ db });

    mockPostMessage.mockResolvedValue({
      delivered: true,
      channel: workspace.notificationChannelId,
      threadTs: "thread-ts",
    });
    mockAddReaction.mockResolvedValue({ delivered: true });
  });

  it("appends events, updates projections, and processes policy outbox", async () => {
    const streamId = "task-cqrs-integration";
    const issue = { provider: "manual" as const, title: "CQRS flow" };

    await executeCommand({
      streamId,
      workspace,
      user,
      command: {
        type: "StartTask",
        payload: { issue, initialSummary: "initial" },
      },
    });

    await executeCommand({
      streamId,
      workspace,
      user,
      command: {
        type: "AddProgress",
        payload: { summary: "doing the work" },
      },
    });

    await executeCommand({
      streamId,
      workspace,
      user,
      command: {
        type: "CompleteTask",
        payload: { summary: "all done" },
      },
    });

    const events = await db
      .select({
        eventType: schema.taskEvents.eventType,
        version: schema.taskEvents.version,
      })
      .from(schema.taskEvents)
      .where(eq(schema.taskEvents.taskSessionId, streamId))
      .orderBy(asc(schema.taskEvents.version));

    expect(events.map((event) => event.eventType)).toEqual([
      "started",
      "slack_thread_linked",
      "updated",
      "completed",
    ]);

    const session = await db.query.taskSessions.findFirst({
      where: eq(schema.taskSessions.id, streamId),
    });

    expect(session?.status).toBe("completed");
    expect(session?.slackChannel).toBe(workspace.notificationChannelId);
    expect(session?.slackThreadTs).toBe("thread-ts");

    const policies = await db
      .select({
        policyType: schema.taskPolicyOutbox.policyType,
        status: schema.taskPolicyOutbox.status,
        payload: schema.taskPolicyOutbox.payload,
      })
      .from(schema.taskPolicyOutbox)
      .where(eq(schema.taskPolicyOutbox.taskSessionId, streamId));

    expect(policies).toHaveLength(4);
    expect(policies.every((policy) => policy.status === "processed")).toBe(
      true,
    );

    const templates = policies
      .filter((policy) => policy.policyType === "slack_notify")
      .map((policy) => (policy.payload as { template?: string }).template)
      .filter(Boolean);

    expect(templates.sort()).toEqual(["completed", "started", "updated"]);
  });

  it("rejects progress updates while unresolved blocks remain", async () => {
    const streamId = "task-cqrs-blocked";
    const issue = { provider: "manual" as const, title: "Blocked task" };

    await executeCommand({
      streamId,
      workspace,
      user,
      command: {
        type: "StartTask",
        payload: { issue, initialSummary: "initial" },
      },
    });

    await executeCommand({
      streamId,
      workspace,
      user,
      command: { type: "ReportBlock", payload: { reason: "waiting" } },
    });

    await expect(
      executeCommand({
        streamId,
        workspace,
        user,
        command: {
          type: "AddProgress",
          payload: { summary: "should fail" },
        },
      }),
    ).rejects.toThrow("Resolve blocking issues before updating progress");

    const events = await db
      .select({ eventType: schema.taskEvents.eventType })
      .from(schema.taskEvents)
      .where(eq(schema.taskEvents.taskSessionId, streamId));

    expect(
      events.filter((event) => event.eventType === "blocked"),
    ).toHaveLength(1);
    expect(
      events.filter((event) => event.eventType === "updated"),
    ).toHaveLength(0);

    const session = await db.query.taskSessions.findFirst({
      where: eq(schema.taskSessions.id, streamId),
    });

    expect(session?.status).toBe("blocked");
  });
});
