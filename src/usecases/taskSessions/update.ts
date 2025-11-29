import { Env } from "@/app/create-app";
import { notifyTaskUpdate } from "@/lib/taskNotifications";
import { createTaskRepository } from "@/repos";

export type UpdateTask = {
  task_session_id: string;
  summary: string;
  raw_context?: Record<string, unknown>;
};

export const updateTask = async (params: UpdateTask, ctx: Env["Variables"]) => {
  const { task_session_id, summary, raw_context } = params;

  const [workspace, db] = [ctx.workspace, ctx.db];
  const taskRepository = createTaskRepository({ db });

  const { session, update } = await taskRepository.addTaskUpdate({
    taskSessionId: task_session_id,
    workspaceId: workspace.id,
    summary,
    rawContext: raw_context ?? {},
  });

  const slackNotification = await notifyTaskUpdate({
    sessionId: session.id,
    workspaceId: workspace.id,
    summary,
  });

  return {
    task_session_id: session.id,
    update_id: update.id,
    status: session.status,
    summary: update.summary,
    slack_notification: slackNotification,
    message: "進捗を保存しました。",
  };
};
