import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository, createWorkspaceRepository } from "@/repos";
import { isValidTransition, ALLOWED_TRANSITIONS } from "@/domain/task-status";

type UpdateTask = {
  taskSessionId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
};

export const updateTask = async (
  params: UpdateTask,
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

  // blocked/paused → in_progress への遷移を検証
  if (!isValidTransition(currentSession.status, "in_progress")) {
    return {
      success: false,
      error: `Invalid status transition: ${currentSession.status} → in_progress. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
    };
  }

  const { session, updateEvent } = await taskRepository.addTaskUpdate({
    taskSessionId: taskSessionId,
    workspaceId: workspace.id,
    userId: user.id,
    summary,
    rawContext: rawContext ?? {},
  });

  if (!session || !updateEvent) {
    return {
      success: false,
      error: "タスクの更新に失敗しました",
    };
  }

  const slackNotification = await notificationService.notifyTaskUpdate({
    session: {
      id: session.id,
      slackThreadTs: session.slackThreadTs,
      slackChannel: session.slackChannel,
    },
    summary,
  });

  const result = {
    task_session_id: session.id,
    update_id: updateEvent.id,
    status: session.status,
    summary: updateEvent.summary,
    slack_notification: slackNotification,
    message: "進捗を保存しました。",
  };

  return {
    success: true,
    data: JSON.stringify(result, null, 2),
  };
};
