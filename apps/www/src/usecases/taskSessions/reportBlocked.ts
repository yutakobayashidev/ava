import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import type { TaskRepository } from "@/repos";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { HonoEnv } from "@/types";
import { buildTaskBlockedMessage } from "./slackMessages";

type ReportBlockedParams = {
  taskSessionId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
};

export type ReportBlockedInput = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  params: ReportBlockedParams;
};

type ReportBlockedSuccess = {
  taskSessionId: string;
  blockReportId: string;
  status: string;
  reason: string | null;
  slackNotification: {
    delivered: boolean;
    reason?: string;
  };
};

type ReportBlockedResult =
  | { success: true; data: ReportBlockedSuccess }
  | { success: false; error: string };

export const createReportBlocked = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
) => {
  return async (input: ReportBlockedInput): Promise<ReportBlockedResult> => {
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

    const { session, blockReport } = await taskRepository.reportBlock({
      taskSessionId: taskSessionId,
      workspaceId: workspace.id,
      userId: user.id,
      reason,
      rawContext: rawContext ?? {},
    });

    if (!session || !blockReport) {
      return {
        success: false,
        error: "ブロッキング情報の登録に失敗しました",
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
        reason: blockReport.reason,
        slackNotification,
      },
    };
  };
};
