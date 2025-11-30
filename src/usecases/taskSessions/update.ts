import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository } from "@/repos";
import { validateTransition } from "@/domain/task-status";

export type UpdateTask = {
  task_session_id: string;
  summary: string;
  raw_context?: Record<string, unknown>;
};

export const updateTask = async (params: UpdateTask, ctx: Env["Variables"]) => {
  const { task_session_id, summary, raw_context } = params;

  const [workspace, db] = [ctx.workspace, ctx.db];
  const taskRepository = createTaskRepository({ db });
  const notificationService = createNotificationService(
    workspace,
    taskRepository,
  );

  // 現在のタスクセッションを取得して状態遷移を検証
  const currentSession = await taskRepository.findTaskSessionById(
    task_session_id,
    workspace.id,
  );

  if (!currentSession) {
    throw new Error("タスクセッションが見つかりません");
  }

  // blocked/paused → in_progress への遷移を検証
  validateTransition(currentSession.status, "in_progress");

  const { session, update } = await taskRepository.addTaskUpdate({
    taskSessionId: task_session_id,
    workspaceId: workspace.id,
    summary,
    rawContext: raw_context ?? {},
  });

  const slackNotification = await notificationService.notifyTaskUpdate({
    session: {
      id: session.id,
      slackThreadTs: session.slackThreadTs,
      slackChannel: session.slackChannel,
    },
    summary,
  });

  return {
    task_session_id: session.id,
    update_id: update.id,
    status: session.status,
    summary: update.summary,
    slack_notification: slackNotification,
    message: "進捗を保存しました。",
  };
};
