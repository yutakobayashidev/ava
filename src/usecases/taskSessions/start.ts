import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository } from "@/repos";
import { createTaskEventRepository } from "@/repos/taskEvents";

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
  const taskEventRepository = createTaskEventRepository({ db });
  const notificationService = createNotificationService(
    workspace,
    taskRepository,
  );

  const session = await taskRepository.createTaskSession({
    userId: user.id,
    workspaceId: workspace.id,
    issueProvider: issue.provider,
    issueId: issue.id ?? null,
    issueTitle: issue.title,
    initialSummary: initial_summary,
  });

  // イベントログに保存
  await taskEventRepository.createEvent({
    taskSessionId: session.id,
    eventType: "started",
    summary: initial_summary,
  });

  const slackNotification = await notificationService.notifyTaskStarted({
    session: { id: session.id },
    issue: {
      title: issue.title,
      provider: issue.provider,
      id: issue.id ?? null,
    },
    initialSummary: initial_summary,
    user: {
      name: user.name,
      email: user.email,
      slackId: user.slackId,
    },
  });

  return {
    task_session_id: session.id,
    status: session.status,
    issued_at: session.createdAt,
    slack_notification: slackNotification,
    message: "タスクの追跡を開始しました。",
  };
};
