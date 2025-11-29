import { Env } from "@/app/create-app";
import { notifyTaskStarted } from "@/lib/taskNotifications";
import { createTaskRepository } from "@/repos";

export type StartTask = {
  issue: {
    provider: "github" | "manual";
    id?: string;
    title: string;
  };
  initial_summary: string;
};

export const startTasks = async (params: StartTask, ctx: Env["Variables"]) => {
  const { issue, initial_summary } = params;

  const [user, workspace, db] = [ctx.user, ctx.workspace, ctx.db];
  const taskRepository = createTaskRepository({ db });

  const session = await taskRepository.createTaskSession({
    userId: user.id,
    workspaceId: workspace.id,
    issueProvider: issue.provider,
    issueId: issue.id ?? null,
    issueTitle: issue.title,
    initialSummary: initial_summary,
  });

  const slackNotification = await notifyTaskStarted({
    sessionId: session.id,
    workspaceId: workspace.id,
    issueTitle: issue.title,
    issueProvider: issue.provider,
    issueId: issue.id ?? null,
    initialSummary: initial_summary,
    userName: user.name,
    userEmail: user.email,
    userSlackId: user.slackId,
  });

  return {
    task_session_id: session.id,
    status: session.status,
    issued_at: session.createdAt,
    slack_notification: slackNotification,
    message: "タスクの追跡を開始しました。",
  };
};
