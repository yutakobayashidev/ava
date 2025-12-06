import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import type { TaskRepository } from "@/repos";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { HonoEnv } from "@/types";
import { buildTaskUpdateMessage } from "./slackMessages";

type UpdateTaskParams = {
  taskSessionId: string;
  summary: string;
  rawContext?: Record<string, unknown>;
};

export type UpdateTaskInput = {
  workspace: HonoEnv["Variables"]["workspace"];
  user: HonoEnv["Variables"]["user"];
  params: UpdateTaskParams;
};

type UpdateTaskSuccess = {
  taskSessionId: string;
  updateId: string;
  status: string;
  summary: string | null;
  slackNotification: {
    delivered: boolean;
    reason?: string;
  };
};

type UpdateTaskResult =
  | { success: true; data: UpdateTaskSuccess }
  | { success: false; error: string };

export const createUpdateTask = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
) => {
  return async (input: UpdateTaskInput): Promise<UpdateTaskResult> => {
    const { workspace, user, params } = input;
    const { taskSessionId, summary, rawContext } = params;

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

    // blocked/paused → in_progress への遷移を検証
    if (!isValidTransition(currentSession.status, "in_progress")) {
      return {
        success: false,
        error: `Invalid status transition: ${currentSession.status} → in_progress. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
      };
    }

    const { session, updateEvent } = await taskRepository.addTaskUpdate({
      taskSessionId: taskSessionId,
      workspaceId: workspace.id,
      userId: user.id,
      summary,
      rawContext: rawContext ?? {},
    });

    if (!session || !updateEvent) {
      return {
        success: false,
        error: "タスクの更新に失敗しました",
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
    const message = buildTaskUpdateMessage({ summary });

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
        updateId: updateEvent.id,
        status: session.status,
        summary: updateEvent.summary,
        slackNotification,
      },
    };
  };
};
