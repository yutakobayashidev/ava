import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository } from "@/repos";
import { isValidTransition, ALLOWED_TRANSITIONS } from "@/domain/task-status";

type PauseTask = {
  task_session_id: string;
  reason: string;
  raw_context?: Record<string, unknown>;
};

export const pauseTask = async (
  params: PauseTask,
  ctx: Env["Variables"],
): Promise<
  { success: true; data: string } | { success: false; error: string }
> => {
  const { task_session_id, reason, raw_context } = params;

  const [user, workspace, db] = [ctx.user, ctx.workspace, ctx.db];
  const taskRepository = createTaskRepository({ db });
  const notificationService = createNotificationService(
    workspace,
    taskRepository,
  );

  // 現在のタスクセッションを取得して状態遷移を検証
  const currentSession = await taskRepository.findTaskSessionById(
    task_session_id,
    workspace.id,
    user.id,
  );

  if (!currentSession) {
    return {
      success: false,
      error: "タスクセッションが見つかりません",
    };
  }

  // → paused への遷移を検証
  if (!isValidTransition(currentSession.status, "paused")) {
    return {
      success: false,
      error: `Invalid status transition: ${currentSession.status} → paused. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
    };
  }

  const { session, pauseReport } = await taskRepository.pauseTask({
    taskSessionId: task_session_id,
    workspaceId: workspace.id,
    userId: user.id,
    reason,
    rawContext: raw_context ?? {},
  });

  if (!session || !pauseReport) {
    return {
      success: false,
      error: "タスクの一時休止処理に失敗しました",
    };
  }

  const slackNotification = await notificationService.notifyTaskPaused({
    session: {
      id: session.id,
      slackThreadTs: session.slackThreadTs,
      slackChannel: session.slackChannel,
    },
    reason,
  });

  const result = {
    task_session_id: session.id,
    pause_report_id: pauseReport.id,
    status: session.status,
    paused_at: pauseReport.createdAt,
    slack_notification: slackNotification,
    message: "タスクを一時休止しました。",
  };

  return {
    success: true,
    data: JSON.stringify(result, null, 2),
  };
};
