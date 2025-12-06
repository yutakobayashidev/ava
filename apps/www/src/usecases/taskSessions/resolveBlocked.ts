import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import type { TaskRepository } from "@/repos";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { HonoEnv } from "@/types";
import { buildBlockResolvedMessage } from "./slackMessages";

type ResolveBlockedParams = {
  taskSessionId: string;
  blockReportId: string;
};

export type ResolveBlockedInput = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  params: ResolveBlockedParams;
};

type ResolveBlockedSuccess = {
  taskSessionId: string;
  blockReportId: string;
  status: string;
  resolvedAt: Date;
  slackNotification: {
    delivered: boolean;
    reason?: string;
  };
};

type ResolveBlockedResult =
  | { success: true; data: ResolveBlockedSuccess }
  | { success: false; error: string };

export const createResolveBlocked = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
) => {
  return async (input: ResolveBlockedInput): Promise<ResolveBlockedResult> => {
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
      taskSessionId: taskSessionId,
      workspaceId: workspace.id,
      userId: user.id,
      blockReportId: blockReportId,
    });

    if (!session || !blockReport) {
      return {
        success: false,
        error: "ブロッキングの解決処理に失敗しました",
      };
    }

    // Slackスレッド情報の取得
    const slackThread = createSlackThreadInfo({
      channel: session.slackChannel,
      threadTs: session.slackThreadTs,
    });

    if (!slackThread) {
      return {
        success: false,
        error: "Slack thread not configured for this task session",
      };
    }

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

    const slackNotification = {
      delivered: notification.delivered,
      reason: notification.error,
    };

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
