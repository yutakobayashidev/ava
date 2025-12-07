import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import type { TaskRepository } from "@/repos";
import { createTaskCommandExecutor } from "./commandExecutor";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import type {
  CompleteTaskInput,
  CompleteTaskOutput,
  CompleteTaskSuccess,
} from "./interface";
import { buildTaskCompletedMessage } from "./slackMessages";

export const createCompleteTask = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: CompleteTaskInput): Promise<CompleteTaskOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, summary } = params;

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
        type: "CompleteTask",
        payload: { summary },
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
        error: "タスクの完了処理に失敗しました",
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
      const message = buildTaskCompletedMessage({ summary });

      // Slack通知（インフラ層への委譲）
      const notification = await slackNotificationService.postMessage({
        workspace,
        channel: slackThread.channel,
        message,
        threadTs: slackThread.threadTs,
      });

      // リアクションを追加
      if (notification.delivered) {
        await slackNotificationService.addReaction({
          workspace,
          channel: slackThread.channel,
          timestamp: slackThread.threadTs,
          emoji: "white_check_mark",
        });
      }

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

    const unresolvedBlocks =
      (await taskRepository.getUnresolvedBlockReports(taskSessionId)) || [];

    const data: CompleteTaskSuccess = {
      taskSessionId: session.id,
      completionId: result.persistedEvents[0]?.id ?? "",
      status: session.status,
      slackNotification,
    };

    if (unresolvedBlocks.length > 0) {
      data.unresolvedBlocks = unresolvedBlocks.map((block) => ({
        blockReportId: block.id,
        reason: block.reason,
        createdAt: block.createdAt,
      }));
    }

    return {
      success: true,
      data,
    };
  };
};
