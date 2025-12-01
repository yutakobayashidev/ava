import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository } from "@/repos";
import { isValidTransition, ALLOWED_TRANSITIONS } from "@/domain/task-status";

export type ResumeTask = {
  task_session_id: string;
  summary: string;
  raw_context?: Record<string, unknown>;
};

export const resumeTask = async (
  params: ResumeTask,
  ctx: Env["Variables"],
): Promise<
  { success: true; data: string } | { success: false; error: string }
> => {
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
    return {
      success: false,
      error: "タスクセッションが見つかりません",
    };
  }

  // paused → in_progress への遷移を検証
  if (!isValidTransition(currentSession.status, "in_progress")) {
    return {
      success: false,
      error: `Invalid status transition: ${currentSession.status} → in_progress. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
    };
  }

  const { session } = await taskRepository.resumeTask({
    taskSessionId: task_session_id,
    workspaceId: workspace.id,
    summary,
    rawContext: raw_context ?? {},
  });

  if (!session) {
    return {
      success: false,
      error: "タスクの再開処理に失敗しました",
    };
  }

  const slackNotification = await notificationService.notifyTaskResumed({
    session: {
      id: session.id,
      slackThreadTs: session.slackThreadTs,
      slackChannel: session.slackChannel,
    },
    summary,
  });

  const result = {
    task_session_id: session.id,
    status: session.status,
    resumed_at: session.updatedAt,
    slack_notification: slackNotification,
    message: "タスクを再開しました。",
  };

  return {
    success: true,
    data: JSON.stringify(result, null, 2),
  };
};
