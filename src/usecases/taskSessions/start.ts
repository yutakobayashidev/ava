import { Env } from "@/app/create-app";
import { createNotificationService } from "@/services/notificationService";
import { createTaskRepository, createSubscriptionRepository } from "@/repos";
import { checkFreePlanLimit } from "@/services/subscriptionService";

export type StartTask = {
  issue: {
    provider: "github" | "manual";
    id?: string;
    title: string;
  };
  initial_summary: string;
};

export const startTasks = async (
  params: StartTask,
  ctx: Env["Variables"],
): Promise<
  { success: true; data: string } | { success: false; error: string }
> => {
  const { issue, initial_summary } = params;

  const [user, workspace, db] = [ctx.user, ctx.workspace, ctx.db];

  // プラン制限のチェック
  const subscriptionRepository = createSubscriptionRepository({ db });
  const limitError = await checkFreePlanLimit(user.id, subscriptionRepository);
  if (limitError) {
    return {
      success: false,
      error: limitError,
    };
  }

  const taskRepository = createTaskRepository({ db });
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

  if (!session) {
    return {
      success: false,
      error: "タスクセッションの作成に失敗しました",
    };
  }

  const slackNotification = await notificationService.notifyTaskStarted({
    session: { id: session.id },
    issue: {
      title: issue.title,
      provider: issue.provider,
      id: issue.id ?? null,
    },
    initialSummary: initial_summary,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      slackId: user.slackId,
    },
  });

  const result = {
    task_session_id: session.id,
    status: session.status,
    issued_at: session.createdAt,
    slack_notification: slackNotification,
    message: "タスクの追跡を開始しました。",
  };

  return {
    success: true,
    data: JSON.stringify(result, null, 2),
  };
};
