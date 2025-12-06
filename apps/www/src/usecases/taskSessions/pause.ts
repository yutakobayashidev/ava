import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { createTaskRepository } from "@/repos";
import { createNotificationService } from "@/services/notificationService";
import { HonoEnv } from "@/types";

type PauseTask = {
  taskSessionId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
};

type PauseTaskResult =
  | { success: true; data: string }
  | { success: false; error: string };

export const createPauseTask = (
  taskRepository: ReturnType<typeof createTaskRepository>,
  notificationService: ReturnType<typeof createNotificationService>,
  user: HonoEnv["Variables"]["user"],
  workspace: HonoEnv["Variables"]["workspace"],
) => {
  return async (params: PauseTask): Promise<PauseTaskResult> => {
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

    const slackNotification = await notificationService.notifyTaskPaused({
      session: {
        id: session.id,
        slackThreadTs: session.slackThreadTs,
        slackChannel: session.slackChannel,
      },
      reason,
    });

    const result = {
      task_session_id: session.id,
      pause_report_id: pauseReport.id,
      status: session.status,
      paused_at: pauseReport.createdAt,
      slack_notification: slackNotification,
      message: "タスクを一時休止しました。",
    };

    return {
      success: true,
      data: JSON.stringify(result, null, 2),
    };
  };
};
