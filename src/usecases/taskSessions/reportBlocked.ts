import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository } from "@/repos";
import { isValidTransition, ALLOWED_TRANSITIONS } from "@/domain/task-status";

type ReportBlocked = {
  task_session_id: string;
  reason: string;
  raw_context?: Record<string, unknown>;
};

export const reportBlocked = async (
  params: ReportBlocked,
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

  // → blocked への遷移を検証
  if (!isValidTransition(currentSession.status, "blocked")) {
    return {
      success: false,
      error: `Invalid status transition: ${currentSession.status} → blocked. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
    };
  }

  const { session, blockReport } = await taskRepository.reportBlock({
    taskSessionId: task_session_id,
    workspaceId: workspace.id,
    userId: user.id,
    reason,
    rawContext: raw_context ?? {},
  });

  if (!session || !blockReport) {
    return {
      success: false,
      error: "ブロッキング情報の登録に失敗しました",
    };
  }

  const slackNotification = await notificationService.notifyTaskBlocked({
    session: {
      id: session.id,
      slackThreadTs: session.slackThreadTs,
      slackChannel: session.slackChannel,
    },
    reason,
  });

  const result = {
    task_session_id: session.id,
    block_report_id: blockReport.id,
    status: session.status,
    reason: blockReport.reason,
    slack_notification: slackNotification,
    message: "詰まり情報を登録しました。",
  };

  return {
    success: true,
    data: JSON.stringify(result, null, 2),
  };
};
