import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { createTaskRepository } from "@/repos";
import { createNotificationService } from "@/services/notificationService";
import { HonoEnv } from "@/types";

type CompleteTask = {
  taskSessionId: string;
  summary: string;
};

type CompleteTaskSuccess = {
  taskSessionId: string;
  completionId: string;
  status: string;
  slackNotification: {
    delivered: boolean;
    reason?: string;
  };
  unresolvedBlocks?: Array<{
    blockReportId: string;
    reason: string | null;
    createdAt: Date;
  }>;
};

type CompleteTaskResult =
  | { success: true; data: CompleteTaskSuccess }
  | { success: false; error: string };

export const createCompleteTask = (
  taskRepository: ReturnType<typeof createTaskRepository>,
  notificationService: ReturnType<typeof createNotificationService>,
  user: HonoEnv["Variables"]["user"],
  workspace: HonoEnv["Variables"]["workspace"],
) => {
  return async (params: CompleteTask): Promise<CompleteTaskResult> => {
    const { taskSessionId, summary } = params;

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

    // → completed への遷移を検証
    if (!isValidTransition(currentSession.status, "completed")) {
      return {
        success: false,
        error: `Invalid status transition: ${currentSession.status} → completed. Allowed transitions from ${currentSession.status}: [${ALLOWED_TRANSITIONS[currentSession.status].join(", ")}]`,
      };
    }

    const { session, completedEvent, unresolvedBlocks } =
      await taskRepository.completeTask({
        taskSessionId: taskSessionId,
        workspaceId: workspace.id,
        userId: user.id,
        summary,
      });

    if (!session || !completedEvent) {
      return {
        success: false,
        error: "タスクの完了処理に失敗しました",
      };
    }

    const slackNotification = await notificationService.notifyTaskCompleted({
      session: {
        id: session.id,
        slackThreadTs: session.slackThreadTs,
        slackChannel: session.slackChannel,
      },
      summary,
    });

    const data: CompleteTaskSuccess = {
      taskSessionId: session.id,
      completionId: completedEvent.id,
      status: session.status,
      slackNotification,
    };

    if (unresolvedBlocks.length > 0) {
      data.unresolvedBlocks = unresolvedBlocks.map((block) => ({
        blockReportId: block.id,
        reason: block.reason,
        createdAt: block.createdAt,
      }));
    }

    return {
      success: true,
      data,
    };
  };
};
