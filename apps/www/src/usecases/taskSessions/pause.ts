import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import type { TaskRepository } from "@/repos";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { HonoEnv } from "@/types";
import { buildTaskPausedMessage } from "./slackMessages";

type PauseTaskParams = {
  taskSessionId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
};

export type PauseTaskInput = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  params: PauseTaskParams;
};

type PauseTaskSuccess = {
  taskSessionId: string;
  pauseReportId: string;
  status: string;
  pausedAt: Date;
  slackNotification: {
    delivered: boolean;
    reason?: string;
  };
};

type PauseTaskResult =
  | { success: true; data: PauseTaskSuccess }
  | { success: false; error: string };

export const createPauseTask = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
) => {
  return async (input: PauseTaskInput): Promise<PauseTaskResult> => {
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

    // → paused への遷移を検証
    if (!isValidTransition(currentSession.status, "paused")) {
      return {
        success: false,
        error: `Invalid status transition: ${currentSession.status} → paused. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
      };
    }

    const { session, pauseReport } = await taskRepository.pauseTask({
      taskSessionId: taskSessionId,
      workspaceId: workspace.id,
      userId: user.id,
      reason,
      rawContext: rawContext ?? {},
    });

    if (!session || !pauseReport) {
      return {
        success: false,
        error: "タスクの一時休止処理に失敗しました",
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
    const message = buildTaskPausedMessage({
      session: { id: session.id },
      reason,
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
        pauseReportId: pauseReport.id,
        status: session.status,
        pausedAt: pauseReport.createdAt,
        slackNotification,
      },
    };
  };
};
