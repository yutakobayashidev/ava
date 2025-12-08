import { createHonoApp } from "@/create-app";
import { sessionMiddleware } from "@/middleware/session";
import { createTaskQueryRepository } from "@/repos";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

// クエリパラメータのバリデーション
const listTasksQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(100),
  status: z.enum(["in_progress", "blocked", "paused", "completed"]).optional(),
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
    const tasks = await taskRepository.listTaskSessions({
      userId: user.id,
      workspaceId: workspace.id,
      status: status as
        | "in_progress"
        | "blocked"
        | "paused"
        | "completed"
        | undefined,
      limit,
    });

    // 各タスクの完了情報を取得し、所要時間を計算
    const tasksWithCompletion = await Promise.all(
      tasks.map(async (task) => {
        const completedEvent = await taskRepository.getLatestEvent({
          taskSessionId: task.id,
          eventType: "completed",
        });

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
      }),
    );

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
    const task = await taskRepository.findTaskSessionById(
      id,
      workspace.id,
      user.id,
    );

    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    // イベント一覧を取得
    const events = await taskRepository.listEvents({
      taskSessionId: id,
      limit: 100,
    });

    // 完了情報を取得
    const completedEvent = await taskRepository.getLatestEvent({
      taskSessionId: task.id,
      eventType: "completed",
    });

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
