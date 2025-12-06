import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository, createWorkspaceRepository } from "@/repos";
import { isValidTransition, ALLOWED_TRANSITIONS } from "@/domain/task-status";

type CompleteTask = {
  taskSessionId: string;
  summary: string;
};

export const completeTask = async (
  params: CompleteTask,
  ctx: Env["Variables"],
): Promise<
  { success: true; data: string } | { success: false; error: string }
> => {
  const { taskSessionId, summary } = params;

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

  // → completed への遷移を検証
  if (!isValidTransition(currentSession.status, "completed")) {
    return {
      success: false,
      error: `Invalid status transition: ${currentSession.status} → completed. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
    };
  }

  const { session, completedEvent, unresolvedBlocks } =
    await taskRepository.completeTask({
      taskSessionId: taskSessionId,
      workspaceId: workspace.id,
      userId: user.id,
      summary,
    });

  if (!session || !completedEvent) {
    return {
      success: false,
      error: "タスクの完了処理に失敗しました",
    };
  }

  const slackNotification = await notificationService.notifyTaskCompleted({
    session: {
      id: session.id,
      slackThreadTs: session.slackThreadTs,
      slackChannel: session.slackChannel,
    },
    summary,
  });

  const response: Record<string, unknown> = {
    task_session_id: session.id,
    completion_id: completedEvent.id,
    status: session.status,
    slack_notification: slackNotification,
    message: "完了報告を保存しました。",
  };

  if (unresolvedBlocks.length > 0) {
    response.unresolved_blocks = unresolvedBlocks.map((block) => ({
      block_report_id: block.id,
      reason: block.reason,
      created_at: block.createdAt,
    }));
    response.message =
      "完了報告を保存しました。未解決のブロッキングがあります。resolve_blockedツールで解決を報告してください。";
  }

  return {
    success: true,
    data: JSON.stringify(response, null, 2),
  };
};
