import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import type { TaskRepository } from "@/repos";
import { createTaskCommandExecutor } from "./commandExecutor";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { buildTaskBlockedMessage } from "./slackMessages";
import type { ReportBlockedInput, ReportBlockedOutput } from "./interface";

export const createReportBlocked = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
  commandExecutorFactory: ReturnType<typeof createTaskCommandExecutor>,
) => {
  return async (input: ReportBlockedInput): Promise<ReportBlockedOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, reason, rawContext } = params;

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
        type: "ReportBlock",
        payload: { reason, rawContext },
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
        error: "ブロッキング情報の登録に失敗しました",
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
      const message = buildTaskBlockedMessage({
        session: { id: session.id },
        reason,
        blockReportId: result.persistedEvents[0]?.id ?? "",
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
        blockReportId: result.persistedEvents[0]?.id ?? "",
        status: session.status,
        reason,
        slackNotification,
      },
    };
  };
};
