import { Env } from "@/app/create-app";
import { notifyTaskPaused } from "@/lib/taskNotifications";
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

  const { session, pauseReport } = await taskRepository.pauseTask({
    taskSessionId: task_session_id,
    workspaceId: workspace.id,
    reason,
    rawContext: raw_context ?? {},
  });

  const slackNotification = await notifyTaskPaused({
    sessionId: session.id,
    workspaceId: workspace.id,
    reason,
  });

  return {
    task_session_id: session.id,
    pause_report_id: pauseReport.id,
    status: session.status,
    paused_at: session.pausedAt,
    slack_notification: slackNotification,
    message: "タスクを一時休止しました。",
  };
};
