import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository } from "@/repos";
import { isValidTransition, ALLOWED_TRANSITIONS } from "@/domain/task-status";

export type ResolveBlocked = {
  task_session_id: string;
  block_report_id: string;
};

export const resolveBlocked = async (
  params: ResolveBlocked,
  ctx: Env["Variables"],
): Promise<
  { success: true; data: string } | { success: false; error: string }
> => {
  const { task_session_id, block_report_id } = params;

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

  // blocked → in_progress への遷移を検証
  if (!isValidTransition(currentSession.status, "in_progress")) {
    return {
      success: false,
      error: `Invalid status transition: ${currentSession.status} → in_progress. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
    };
  }

  const { session, blockReport } = await taskRepository.resolveBlockReport({
    taskSessionId: task_session_id,
    workspaceId: workspace.id,
    blockReportId: block_report_id,
  });

  if (!session || !blockReport) {
    return {
      success: false,
      error: "ブロッキングの解決処理に失敗しました",
    };
  }

  const slackNotification = await notificationService.notifyBlockResolved({
    session: {
      id: session.id,
      slackThreadTs: session.slackThreadTs,
      slackChannel: session.slackChannel,
    },
    blockReason: blockReport.reason ?? "Unknown block",
  });

  const result = {
    task_session_id: session.id,
    block_report_id: blockReport.id,
    status: session.status,
    resolved_at: blockReport.createdAt,
    slack_notification: slackNotification,
    message: "ブロッキングの解決を報告しました。",
  };

  return {
    success: true,
    data: JSON.stringify(result, null, 2),
  };
};
