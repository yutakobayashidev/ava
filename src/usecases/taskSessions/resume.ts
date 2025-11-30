import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository } from "@/repos";

export type ResumeTask = {
  task_session_id: string;
  summary: string;
  raw_context?: Record<string, unknown>;
};

export const resumeTask = async (params: ResumeTask, ctx: Env["Variables"]) => {
  const { task_session_id, summary, raw_context } = params;

  const [workspace, db] = [ctx.workspace, ctx.db];
  const taskRepository = createTaskRepository({ db });
  const notificationService = createNotificationService(
    workspace,
    taskRepository,
  );

  const { session } = await taskRepository.resumeTask({
    taskSessionId: task_session_id,
    workspaceId: workspace.id,
    summary,
    rawContext: raw_context ?? {},
  });

  const slackNotification = await notificationService.notifyTaskResumed({
    session: {
      id: session.id,
      slackThreadTs: session.slackThreadTs,
      slackChannel: session.slackChannel,
    },
    summary,
  });

  return {
    task_session_id: session.id,
    status: session.status,
    resumed_at: session.resumedAt,
    slack_notification: slackNotification,
    message: "タスクを再開しました。",
  };
};
