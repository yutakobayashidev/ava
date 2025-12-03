import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository, createWorkspaceRepository } from "@/repos";
import { isValidTransition, ALLOWED_TRANSITIONS } from "@/domain/task-status";

type ResumeTask = {
  taskSessionId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
};

export const resumeTask = async (
  params: ResumeTask,
  ctx: Env["Variables"],
): Promise<
  { success: true; data: string } | { success: false; error: string }
> => {
  const { taskSessionId, summary, rawContext } = params;

  const [user, workspace, db] = [ctx.user, ctx.workspace, ctx.db];
  const taskRepository = createTaskRepository({ db });
  const workspaceRepository = createWorkspaceRepository({ db });
  const notificationService = createNotificationService(
    workspace,
    taskRepository,
    workspaceRepository,
  );

  // 現在のタスクセッションを取得して状態遷移を検証
  const currentSession = await taskRepository.findTaskSessionById(
    taskSessionId,
    workspace.id,
    user.id,
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
    taskSessionId: taskSessionId,
    workspaceId: workspace.id,
    userId: user.id,
    summary,
    rawContext: rawContext ?? {},
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
