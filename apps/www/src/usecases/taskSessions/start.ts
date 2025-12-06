import { createSubscriptionRepository, createTaskRepository } from "@/repos";
import { createNotificationService } from "@/services/notificationService";
import { checkFreePlanLimit } from "@/services/subscriptionService";
import { HonoEnv } from "@/types";

type StartTask = {
  issue: {
    provider: "github" | "manual";
    id?: string;
    title: string;
  };
  initialSummary: string;
};

type StartTaskSuccess = {
  taskSessionId: string;
  status: string;
  issuedAt: Date;
  slackNotification: {
    delivered: boolean;
    reason?: string;
  };
};

type StartTaskResult =
  | { success: true; data: StartTaskSuccess }
  | { success: false; error: string };

export const createStartTask = (
  taskRepository: ReturnType<typeof createTaskRepository>,
  subscriptionRepository: ReturnType<typeof createSubscriptionRepository>,
  notificationService: ReturnType<typeof createNotificationService>,
  user: HonoEnv["Variables"]["user"],
  workspace: HonoEnv["Variables"]["workspace"],
) => {
  return async (params: StartTask): Promise<StartTaskResult> => {
    const { issue, initialSummary } = params;

    // プラン制限のチェック
    const limitError = await checkFreePlanLimit(
      user.id,
      subscriptionRepository,
    );
    if (limitError) {
      return {
        success: false,
        error: limitError,
      };
    }

    const session = await taskRepository.createTaskSession({
      userId: user.id,
      workspaceId: workspace.id,
      issueProvider: issue.provider,
      issueId: issue.id ?? null,
      issueTitle: issue.title,
      initialSummary: initialSummary,
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
      initialSummary: initialSummary,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        slackId: user.slackId,
      },
    });

    return {
      success: true,
      data: {
        taskSessionId: session.id,
        status: session.status,
        issuedAt: session.createdAt,
        slackNotification,
      },
    };
  };
};
