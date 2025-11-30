import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository } from "@/repos";
import { createTaskEventRepository } from "@/repos/taskEvents";
import { validateTransition } from "@/domain/task-status";

export type ResumeTask = {
  task_session_id: string;
  summary: string;
  raw_context?: Record<string, unknown>;
};

export const resumeTask = async (params: ResumeTask, ctx: Env["Variables"]) => {
  const { task_session_id, summary, raw_context } = params;

  const [workspace, db] = [ctx.workspace, ctx.db];
  const taskRepository = createTaskRepository({ db });
  const taskEventRepository = createTaskEventRepository({ db });
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

  // paused → in_progress への遷移を検証
  validateTransition(currentSession.status, "in_progress");

  const { session } = await taskRepository.resumeTask({
    taskSessionId: task_session_id,
    workspaceId: workspace.id,
    summary,
    rawContext: raw_context ?? {},
  });

  // イベントログに保存
  await taskEventRepository.createEvent({
    taskSessionId: task_session_id,
    eventType: "resumed",
    summary,
    rawContext: raw_context,
  });

  const slackNotification = await notificationService.notifyTaskResumed({
    session: {
      id: session.id,
      slackThreadTs: session.slackThreadTs,
      slackChannel: session.slackChannel,
    },
    summary,
  });

  return {
    task_session_id: session.id,
    status: session.status,
    resumed_at: session.updatedAt,
    slack_notification: slackNotification,
    message: "タスクを再開しました。",
  };
};
