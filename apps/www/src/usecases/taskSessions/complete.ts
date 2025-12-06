import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import type { TaskRepository } from "@/repos";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { buildTaskCompletedMessage } from "./slackMessages";
import { createCompletedTaskSession } from "@/models/taskSessions";
import type {
  CompleteTaskInput,
  CompleteTaskOutput,
  CompleteTaskSuccess,
} from "./interface";

export const createCompleteTask = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
) => {
  return async (input: CompleteTaskInput): Promise<CompleteTaskOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, summary } = params;

    // 現在のタスクセッションを取得して状態遷移を検証
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

    // → completed への遷移を検証
    if (!isValidTransition(currentSession.status, "completed")) {
      return {
        success: false,
        error: `Invalid status transition: ${currentSession.status} → completed. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
      };
    }

    const { session, completedEvent, unresolvedBlocks } =
      await taskRepository.completeTask({
        request: createCompletedTaskSession({
          taskSessionId: taskSessionId,
          workspaceId: workspace.id,
          userId: user.id,
          summary,
        }),
      });

    if (!session || !completedEvent) {
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

    const data: CompleteTaskSuccess = {
      taskSessionId: session.id,
      completionId: completedEvent.id,
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
