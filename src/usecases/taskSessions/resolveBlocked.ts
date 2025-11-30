import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
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
  const notificationService = createNotificationService(
    workspace,
    taskRepository,
  );

  const { session, blockReport } = await taskRepository.resolveBlockReport({
    taskSessionId: task_session_id,
    workspaceId: workspace.id,
    blockReportId: block_report_id,
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
