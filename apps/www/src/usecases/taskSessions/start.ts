import type { TaskRepository } from "@/repos";
import { createSubscriptionRepository } from "@/repos";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { checkFreePlanLimit } from "@/services/subscriptionService";
import type { StartTaskInput, StartTaskOutput } from "./interface";
import { buildTaskStartedMessage } from "./slackMessages";

export const createStartTask = (
  taskRepository: TaskRepository,
  subscriptionRepository: ReturnType<typeof createSubscriptionRepository>,
  slackNotificationService: SlackNotificationService,
) => {
  return async (input: StartTaskInput): Promise<StartTaskOutput> => {
    const { workspace, user, params } = input;
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
    // Slack通知
    let slackNotification: { delivered: boolean; reason?: string };

    if (workspace.notificationChannelId) {
      // メッセージ組み立て（ユースケース層の責務）
      const message = buildTaskStartedMessage({
        session: { id: session.id },
        issue: {
          title: issue.title,
          provider: issue.provider,
          id: issue.id ?? null,
        },
        initialSummary,
        user: {
          name: user.name,
          email: user.email,
          slackId: user.slackId,
        },
      });

      // Slack通知（インフラ層への委譲）
      const notification = await slackNotificationService.postMessage({
        workspace,
        channel: workspace.notificationChannelId,
        message,
      });

      // スレッド情報を保存
      if (
        notification.delivered &&
        notification.threadTs &&
        notification.channel
      ) {
        await taskRepository.updateSlackThread({
          taskSessionId: session.id,
          workspaceId: workspace.id,
          userId: user.id,
          threadTs: notification.threadTs,
          channel: notification.channel,
        });
      }

      slackNotification = {
        delivered: notification.delivered,
        reason: notification.error,
      };
    } else {
      slackNotification = {
        delivered: false,
        reason: "Notification channel not configured",
      };
    }

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
