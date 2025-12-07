import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import type { TaskRepository } from "@/repos";
import { createTaskCommandExecutor } from "./commandExecutor";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { buildBlockResolvedMessage } from "./slackMessages";
import type { ResolveBlockedInput, ResolveBlockedOutput } from "./interface";

export const createResolveBlocked = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: ResolveBlockedInput): Promise<ResolveBlockedOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, blockReportId } = params;

    const currentSession = await taskRepository.findTaskSessionById(
      taskSessionId,
      workspace.id,
      user.id,
    );

    if (!currentSession) {
      return {
        success: false,
        error: "タスクセッションが見つかりません",
      };
    }

    const executeCommand = commandExecutorFactory;
    const result = await executeCommand({
      streamId: taskSessionId,
      workspace,
      user,
      command: {
        type: "ResolveBlock",
        payload: { blockId: blockReportId },
      },
    });

    const session = await taskRepository.findTaskSessionById(
      taskSessionId,
      workspace.id,
      user.id,
    );

    if (!session) {
      return {
        success: false,
        error: "ブロッキングの解決処理に失敗しました",
      };
    }

    // Slack通知
    let slackNotification: { delivered: boolean; reason?: string };

    const slackThread = createSlackThreadInfo({
      channel: session.slackChannel,
      threadTs: session.slackThreadTs,
    });

    if (slackThread) {
      // メッセージ組み立て（ユースケース層の責務）
      const message = buildBlockResolvedMessage({
        blockReason: "ブロック解消",
      });

      // Slack通知（インフラ層への委譲）
      const notification = await slackNotificationService.postMessage({
        workspace,
        channel: slackThread.channel,
        message,
        threadTs: slackThread.threadTs,
      });

      slackNotification = {
        delivered: notification.delivered,
        reason: notification.error,
      };
    } else {
      slackNotification = {
        delivered: false,
        reason: "Slack thread not configured",
      };
    }

    return {
      success: true,
      data: {
        taskSessionId: session.id,
        blockReportId: blockReportId,
        status: session.status,
        resolvedAt: result.persistedEvents[0]?.createdAt ?? session.updatedAt,
        slackNotification,
      },
    };
  };
};
