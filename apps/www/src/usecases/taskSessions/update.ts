import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { createSlackThreadInfo } from "@/domain/slack-thread-info";
import type { TaskRepository } from "@/repos";
import type { SlackNotificationService } from "@/services/slackNotificationService";
import { createUpdatedTaskSession } from "@/models/taskSessions";
import { buildTaskUpdateMessage } from "./slackMessages";
import type { UpdateTaskInput, UpdateTaskOutput } from "./interface";

export const createUpdateTask = (
  taskRepository: TaskRepository,
  slackNotificationService: SlackNotificationService,
) => {
  return async (input: UpdateTaskInput): Promise<UpdateTaskOutput> => {
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

    const updatedTask = createUpdatedTaskSession({
      taskSessionId: taskSessionId,
      workspaceId: workspace.id,
      userId: user.id,
      summary,
      rawContext: rawContext ?? {},
    });

    const { session, updateEvent } = await taskRepository.addTaskUpdate({
      request: updatedTask,
    });

    if (!session || !updateEvent) {
      return {
        success: false,
        error: "タスクの更新に失敗しました",
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
      const message = buildTaskUpdateMessage({ summary });

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
        updateId: updateEvent.id,
        status: session.status,
        summary: updateEvent.summary,
        slackNotification,
      },
    };
  };
};
