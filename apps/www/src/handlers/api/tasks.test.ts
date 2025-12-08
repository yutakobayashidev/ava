import { beforeEach, describe, expect, it, vi } from "vitest";
import { setup } from "../../../tests/vitest.helper";

// vitest.helperの後にインポートする
import tasksApp from "@/handlers/api/tasks";
import * as schema from "@ava/database/schema";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase32, encodeHexLowerCase } from "@oslojs/encoding";
import { uuidv7 } from "uuidv7";

const { db, createTestUserAndWorkspace } = await setup();

describe("api/tasks", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // ヘルパー関数: 有効なセッショントークンを作成
  async function createValidSession(userId: string) {
    const token = encodeBase32(crypto.getRandomValues(new Uint8Array(20)));
    const sessionId = encodeHexLowerCase(
      sha256(new TextEncoder().encode(token)),
    );
    await db.insert(schema.sessions).values({
      id: sessionId,
      userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });
    return token;
  }

  // ヘルパー関数: テスト用のタスクセッションを作成
  async function createTaskSession(
    userId: string,
    workspaceId: string,
    overrides: Partial<typeof schema.taskSessions.$inferInsert> = {},
  ) {
    const taskSessionId = uuidv7();
    await db.insert(schema.taskSessions).values({
      id: taskSessionId,
      userId,
      workspaceId,
      issueProvider: "manual",
      issueId: null,
      issueTitle: "Test Task",
      initialSummary: "Initial summary",
      status: "in_progress",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
    return taskSessionId;
  }

  describe("GET /", () => {
    it("should reject request without session cookie", async () => {
      const res = await tasksApp.request("/", {
        method: "GET",
      });

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    });

    it("should return empty list when user has no tasks", async () => {
      const { user } = await createTestUserAndWorkspace();
      const token = await createValidSession(user.id);

      const res = await tasksApp.request("/", {
        method: "GET",
        headers: {
          Cookie: `session=${token}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tasks).toEqual([]);
    });

    it("should return user's tasks", async () => {
      const { user, workspace } = await createTestUserAndWorkspace();
      const token = await createValidSession(user.id);

      // テスト用タスクを作成
      await createTaskSession(user.id, workspace.id, {
        issueTitle: "Task 1",
        status: "in_progress",
      });
      const taskId2 = await createTaskSession(user.id, workspace.id, {
        issueTitle: "Task 2",
        status: "completed",
      });

      // completed イベントを作成
      await db.insert(schema.taskEvents).values({
        id: uuidv7(),
        taskSessionId: taskId2,
        eventType: "completed",
        version: 1,
        summary: "Completed",
        createdAt: new Date(),
      });

      const res = await tasksApp.request("/", {
        method: "GET",
        headers: {
          Cookie: `session=${token}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tasks).toHaveLength(2);
      expect(data.tasks[0].issueTitle).toBe("Task 2"); // 更新日時降順
      expect(data.tasks[1].issueTitle).toBe("Task 1");
    });

    it("should filter tasks by status", async () => {
      const { user, workspace } = await createTestUserAndWorkspace();
      const token = await createValidSession(user.id);

      await createTaskSession(user.id, workspace.id, {
        issueTitle: "In Progress Task",
        status: "in_progress",
      });
      await createTaskSession(user.id, workspace.id, {
        issueTitle: "Completed Task",
        status: "completed",
      });

      const res = await tasksApp.request("/?status=completed", {
        method: "GET",
        headers: {
          Cookie: `session=${token}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tasks).toHaveLength(1);
      expect(data.tasks[0].issueTitle).toBe("Completed Task");
      expect(data.tasks[0].status).toBe("completed");
    });

    it("should respect limit parameter", async () => {
      const { user, workspace } = await createTestUserAndWorkspace();
      const token = await createValidSession(user.id);

      // 3つのタスクを作成
      await createTaskSession(user.id, workspace.id, {
        issueTitle: "Task 1",
      });
      await createTaskSession(user.id, workspace.id, {
        issueTitle: "Task 2",
      });
      await createTaskSession(user.id, workspace.id, {
        issueTitle: "Task 3",
      });

      const res = await tasksApp.request("/?limit=2", {
        method: "GET",
        headers: {
          Cookie: `session=${token}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tasks).toHaveLength(2);
    });

    it("should not return tasks from other users", async () => {
      const { user: user1, workspace } = await createTestUserAndWorkspace();

      // user2を別途作成
      const user2Id = uuidv7();
      await db.insert(schema.users).values({
        id: user2Id,
        name: "User 2",
        email: "user2@example.com",
        slackId: "U789012",
        slackTeamId: "T789012",
        workspaceId: workspace.id,
      });

      const token1 = await createValidSession(user1.id);

      // user1のタスク
      await createTaskSession(user1.id, workspace.id, {
        issueTitle: "User 1 Task",
      });

      // user2のタスク
      await createTaskSession(user2Id, workspace.id, {
        issueTitle: "User 2 Task",
      });

      const res = await tasksApp.request("/", {
        method: "GET",
        headers: {
          Cookie: `session=${token1}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tasks).toHaveLength(1);
      expect(data.tasks[0].issueTitle).toBe("User 1 Task");
    });

    it("should return 400 for invalid status parameter", async () => {
      const { user } = await createTestUserAndWorkspace();
      const token = await createValidSession(user.id);

      const res = await tasksApp.request("/?status=invalid", {
        method: "GET",
        headers: {
          Cookie: `session=${token}`,
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid limit parameter", async () => {
      const { user } = await createTestUserAndWorkspace();
      const token = await createValidSession(user.id);

      const res = await tasksApp.request("/?limit=invalid", {
        method: "GET",
        headers: {
          Cookie: `session=${token}`,
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /:id", () => {
    it("should reject request without session cookie", async () => {
      const res = await tasksApp.request("/some-task-id", {
        method: "GET",
      });

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    });

    it("should return 404 for non-existent task", async () => {
      const { user } = await createTestUserAndWorkspace();
      const token = await createValidSession(user.id);

      const res = await tasksApp.request("/non-existent-id", {
        method: "GET",
        headers: {
          Cookie: `session=${token}`,
        },
      });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Task not found" });
    });

    it("should return task details with events", async () => {
      const { user, workspace } = await createTestUserAndWorkspace();
      const token = await createValidSession(user.id);

      const taskId = await createTaskSession(user.id, workspace.id, {
        issueTitle: "Detailed Task",
        status: "in_progress",
      });

      // イベントを追加
      await db.insert(schema.taskEvents).values([
        {
          id: uuidv7(),
          taskSessionId: taskId,
          eventType: "started",
          version: 0,
          summary: "Started working",
          createdAt: new Date(Date.now() - 2000),
        },
        {
          id: uuidv7(),
          taskSessionId: taskId,
          eventType: "updated",
          version: 1,
          summary: "Made progress",
          createdAt: new Date(Date.now() - 1000),
        },
      ]);

      const res = await tasksApp.request(`/${taskId}`, {
        method: "GET",
        headers: {
          Cookie: `session=${token}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.task.id).toBe(taskId);
      expect(data.task.issueTitle).toBe("Detailed Task");
      expect(data.events).toHaveLength(2);
      expect(data.events[0].eventType).toBe("updated"); // 新しい順
      expect(data.events[1].eventType).toBe("started");
    });

    it("should not return tasks from other users", async () => {
      const { user: user1, workspace } = await createTestUserAndWorkspace();

      // user2を別途作成
      const user2Id = uuidv7();
      await db.insert(schema.users).values({
        id: user2Id,
        name: "User 2",
        email: "user2@example.com",
        slackId: "U345678",
        slackTeamId: "T345678",
        workspaceId: workspace.id,
      });

      const token1 = await createValidSession(user1.id);

      // user2のタスクを作成
      const taskId = await createTaskSession(user2Id, workspace.id, {
        issueTitle: "User 2 Task",
      });

      const res = await tasksApp.request(`/${taskId}`, {
        method: "GET",
        headers: {
          Cookie: `session=${token1}`,
        },
      });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Task not found" });
    });

    it("should calculate duration for completed tasks", async () => {
      const { user, workspace } = await createTestUserAndWorkspace();
      const token = await createValidSession(user.id);

      const createdAt = new Date(Date.now() - 3600000); // 1時間前
      const taskId = await createTaskSession(user.id, workspace.id, {
        issueTitle: "Completed Task",
        status: "completed",
        createdAt,
      });

      // completed イベントを作成
      const completedAt = new Date();
      await db.insert(schema.taskEvents).values({
        id: uuidv7(),
        taskSessionId: taskId,
        eventType: "completed",
        version: 1,
        summary: "Done",
        createdAt: completedAt,
      });

      const res = await tasksApp.request(`/${taskId}`, {
        method: "GET",
        headers: {
          Cookie: `session=${token}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.task.durationMs).toBeGreaterThan(3500000); // 約1時間
      expect(data.task.completedAt).toBeTruthy();
    });

    it("should hide slack_thread_linked events by default", async () => {
      const { user, workspace } = await createTestUserAndWorkspace();
      const token = await createValidSession(user.id);

      const taskId = await createTaskSession(user.id, workspace.id);

      // イベントを追加（slack_thread_linked を含む）
      await db.insert(schema.taskEvents).values([
        {
          id: uuidv7(),
          taskSessionId: taskId,
          eventType: "started",
          version: 0,
          summary: "Started",
          createdAt: new Date(Date.now() - 2000),
        },
        {
          id: uuidv7(),
          taskSessionId: taskId,
          eventType: "slack_thread_linked",
          version: 1,
          summary: "thread-123",
          reason: "C123456",
          createdAt: new Date(Date.now() - 1000),
        },
      ]);

      const res = await tasksApp.request(`/${taskId}`, {
        method: "GET",
        headers: {
          Cookie: `session=${token}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.events).toHaveLength(1);
      expect(data.events[0].eventType).toBe("started");
    });
  });
});
