import { createHonoApp } from "@/create-app";
import { sessionMiddleware } from "@/middleware/session";
import { TASK_STATUSES } from "@/objects/task/task-status";
import { createTaskQueryRepository } from "@/repos";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

// クエリパラメータのバリデーション
const listTasksQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(100),
  status: z.enum(TASK_STATUSES).optional(),
});

const app = createHonoApp()
  .use("/*", sessionMiddleware)
  /**
   * GET /api/tasks
   * タスク一覧を取得
   */
  .get("/", zValidator("query", listTasksQuerySchema), async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const workspace = c.get("workspace");
    const { limit, status } = c.req.valid("query");

    const taskRepository = createTaskQueryRepository(db);

    const tasksResult = await taskRepository.listTaskSessions({
      userId: user.id,
      workspaceId: workspace.id,
      status,
      limit,
    });

    if (!tasksResult.isOk()) {
      console.error("Failed to list tasks:", tasksResult.error);
      throw new HTTPException(500, { message: "Failed to list tasks" });
    }

    const tasks = tasksResult.value;

    // 完了イベントを一括取得 (N+1クエリ問題を回避)
    const taskIds = tasks.map((t) => t.id);
    const completedEventsMapResult = await taskRepository.getBulkLatestEvents({
      taskSessionIds: taskIds,
      eventType: "completed",
      limit: 1,
    });

    if (!completedEventsMapResult.isOk()) {
      console.error(
        "Failed to get completed events:",
        completedEventsMapResult.error,
      );
      throw new HTTPException(500, {
        message: "Failed to get completed events",
      });
    }

    const completedEventsMap = completedEventsMapResult.value;

    // 各タスクの完了情報と所要時間を計算
    const tasksWithCompletion = tasks.map((task) => {
      const events = completedEventsMap.get(task.id) ?? [];
      const completedEvent = events[0] ?? null;
      let durationMs: number | null = null;
      let completedAt: Date | null = null;

      if (task.status === "completed" && completedEvent) {
        completedAt = completedEvent.createdAt;
        durationMs = completedAt.getTime() - task.createdAt.getTime();
      }

      return {
        ...task,
        completedEvent,
        durationMs,
        completedAt,
      };
    });

    return c.json({ tasks: tasksWithCompletion });
  })
  /**
   * GET /api/tasks/:id
   * タスク詳細とイベント一覧を取得
   */
  .get("/:id", async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const workspace = c.get("workspace");
    const id = c.req.param("id");

    const taskRepository = createTaskQueryRepository(db);

    const taskResult = await taskRepository.findTaskSessionById(
      id,
      workspace.id,
      user.id,
    );

    if (!taskResult.isOk()) {
      console.error("Failed to get task:", taskResult.error);
      throw new HTTPException(500, { message: "Failed to get task" });
    }

    const task = taskResult.value;

    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    // イベント一覧を取得
    const eventsResult = await taskRepository.listEvents({
      taskSessionId: id,
      limit: 100,
    });

    if (!eventsResult.isOk()) {
      console.error("Failed to get events:", eventsResult.error);
      throw new HTTPException(500, { message: "Failed to get events" });
    }

    const events = eventsResult.value;

    // 完了情報を取得
    const completedEventResult = await taskRepository.getLatestEvent({
      taskSessionId: task.id,
      eventType: "completed",
    });

    if (!completedEventResult.isOk()) {
      console.error(
        "Failed to get completed event:",
        completedEventResult.error,
      );
      throw new HTTPException(500, {
        message: "Failed to get completed event",
      });
    }

    const completedEvent = completedEventResult.value;
    let durationMs: number | null = null;
    let completedAt: Date | null = null;

    if (task.status === "completed" && completedEvent) {
      completedAt = completedEvent.createdAt;
      durationMs = completedAt.getTime() - task.createdAt.getTime();
    }

    return c.json({
      task: {
        ...task,
        completedEvent,
        durationMs,
        completedAt,
      },
      events,
    });
  });

export type TasksRoute = typeof app;

export default app;
