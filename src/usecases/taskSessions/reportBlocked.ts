import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository } from "@/repos";

export type ReportBlocked = {
  task_session_id: string;
  reason: string;
  raw_context?: Record<string, unknown>;
};

export const reportBlocked = async (
  params: ReportBlocked,
  ctx: Env["Variables"],
) => {
  const { task_session_id, reason, raw_context } = params;

  const [workspace, db] = [ctx.workspace, ctx.db];
  const taskRepository = createTaskRepository({ db });
  const notificationService = createNotificationService(
    workspace,
    taskRepository,
  );

  const { session, blockReport } = await taskRepository.reportBlock({
    taskSessionId: task_session_id,
    workspaceId: workspace.id,
    reason,
    rawContext: raw_context ?? {},
  });

  const slackNotification = await notificationService.notifyTaskBlocked({
    session: {
      id: session.id,
      slackThreadTs: session.slackThreadTs,
      slackChannel: session.slackChannel,
    },
    reason,
  });

  return {
    task_session_id: session.id,
    block_report_id: blockReport.id,
    status: session.status,
    reason: blockReport.reason,
    slack_notification: slackNotification,
    message: "詰まり情報を登録しました。",
  };
};
