import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { createBlockedTaskSession } from "@/models/taskSessions";
import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import type { TaskRepository } from "@/repos";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { buildTaskBlockedMessage } from "./slackMessages";
import type { ReportBlockedInput, ReportBlockedOutput } from "./interface";

export const createReportBlocked = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
) => {
  return async (input: ReportBlockedInput): Promise<ReportBlockedOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, reason, rawContext } = params;

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

    // → blocked への遷移を検証
    if (!isValidTransition(currentSession.status, "blocked")) {
      return {
        success: false,
        error: `Invalid status transition: ${currentSession.status} → blocked. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
      };
    }

    const blockedTask = createBlockedTaskSession({
      taskSessionId: taskSessionId,
      workspaceId: workspace.id,
      userId: user.id,
      reason,
      rawContext: rawContext ?? {},
    });

    const { session, blockReport } = await taskRepository.reportBlock({
      request: blockedTask,
    });

    if (!session || !blockReport) {
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
        blockReportId: blockReport.id,
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
        blockReportId: blockReport.id,
        status: session.status,
        reason: blockReport.reason,
        slackNotification,
      },
    };
  };
};
