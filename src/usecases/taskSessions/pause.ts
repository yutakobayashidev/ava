import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository } from "@/repos";

export type PauseTask = {
  task_session_id: string;
  reason: string;
  raw_context?: Record<string, unknown>;
};

export const pauseTask = async (params: PauseTask, ctx: Env["Variables"]) => {
  const { task_session_id, reason, raw_context } = params;

  const [workspace, db] = [ctx.workspace, ctx.db];
  const taskRepository = createTaskRepository({ db });
  const notificationService = createNotificationService(
    workspace,
    taskRepository,
  );

  const { session, pauseReport } = await taskRepository.pauseTask({
    taskSessionId: task_session_id,
    workspaceId: workspace.id,
    reason,
    rawContext: raw_context ?? {},
  });

  const slackNotification = await notificationService.notifyTaskPaused({
    session: {
      id: session.id,
      slackThreadTs: session.slackThreadTs,
      slackChannel: session.slackChannel,
    },
    reason,
  });

  return {
    task_session_id: session.id,
    pause_report_id: pauseReport.id,
    status: session.status,
    paused_at: pauseReport.createdAt,
    slack_notification: slackNotification,
    message: "タスクを一時休止しました。",
  };
};
