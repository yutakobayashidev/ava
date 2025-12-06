import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import type { TaskRepository } from "@/repos";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { buildBlockResolvedMessage } from "./slackMessages";
import { createResolvedBlockTaskSession } from "@/models/taskSessions";
import type { ResolveBlockedInput, ResolveBlockedOutput } from "./interface";

export const createResolveBlocked = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
) => {
  return async (input: ResolveBlockedInput): Promise<ResolveBlockedOutput> => {
    const { workspace, user, params } = input;
    const { taskSessionId, blockReportId } = params;

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

    // blocked → in_progress への遷移を検証
    if (!isValidTransition(currentSession.status, "in_progress")) {
      return {
        success: false,
        error: `Invalid status transition: ${currentSession.status} → in_progress. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
      };
    }

    const { session, blockReport } = await taskRepository.resolveBlockReport({
      request: createResolvedBlockTaskSession({
        taskSessionId: taskSessionId,
        workspaceId: workspace.id,
        userId: user.id,
        blockReportId: blockReportId,
      }),
    });

    if (!session || !blockReport) {
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
        blockReason: blockReport.reason ?? "Unknown block",
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
        resolvedAt: blockReport.createdAt,
        slackNotification,
      },
    };
  };
};
