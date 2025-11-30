import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository } from "@/repos";
import { createTaskEventRepository } from "@/repos/taskEvents";
import { validateTransition } from "@/domain/task-status";

export type ResolveBlocked = {
  task_session_id: string;
  block_report_id: string;
};

export const resolveBlocked = async (
  params: ResolveBlocked,
  ctx: Env["Variables"],
) => {
  const { task_session_id, block_report_id } = params;

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

  // blocked → in_progress への遷移を検証
  validateTransition(currentSession.status, "in_progress");

  const { session, blockReport } = await taskRepository.resolveBlockReport({
    taskSessionId: task_session_id,
    workspaceId: workspace.id,
    blockReportId: block_report_id,
  });

  // イベントログに保存
  await taskEventRepository.createEvent({
    taskSessionId: task_session_id,
    eventType: "block_resolved",
    reason: blockReport.reason,
  });

  const slackNotification = await notificationService.notifyBlockResolved({
    session: {
      id: session.id,
      slackThreadTs: session.slackThreadTs,
      slackChannel: session.slackChannel,
    },
    blockReason: blockReport.reason ?? "Unknown block",
  });

  return {
    task_session_id: session.id,
    block_report_id: blockReport.id,
    status: session.status,
    resolved_at: blockReport.createdAt,
    slack_notification: slackNotification,
    message: "ブロッキングの解決を報告しました。",
  };
};
