import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { createTaskRepository } from "@/repos";
import { createNotificationService } from "@/services/notificationService";
import { HonoEnv } from "@/types";

type PauseTask = {
  taskSessionId: string;
  reason: string;
  rawContext?: Record<string, unknown>;
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
