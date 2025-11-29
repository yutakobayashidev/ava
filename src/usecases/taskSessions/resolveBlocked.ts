import { Env } from "@/app/create-app";
import { notifyBlockResolved } from "@/lib/taskNotifications";
import { createTaskRepository } from "@/repos";

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

  const { session, blockReport } = await taskRepository.resolveBlockReport({
    taskSessionId: task_session_id,
    workspaceId: workspace.id,
    blockReportId: block_report_id,
  });

  const slackNotification = await notifyBlockResolved({
    sessionId: session.id,
    workspaceId: workspace.id,
    blockReason: blockReport.reason,
  });

  return {
    task_session_id: session.id,
    block_report_id: blockReport.id,
    status: session.status,
    resolved_at: blockReport.resolvedAt,
    slack_notification: slackNotification,
    message: "ブロッキングの解決を報告しました。",
  };
};
