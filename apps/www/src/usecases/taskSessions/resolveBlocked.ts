import { ALLOWED_TRANSITIONS, isValidTransition } from "@/domain/task-status";
import { createTaskRepository } from "@/repos";
import { createNotificationService } from "@/services/notificationService";
import { HonoEnv } from "@/types";

type ResolveBlocked = {
  taskSessionId: string;
  blockReportId: string;
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
  taskRepository: ReturnType<typeof createTaskRepository>,
  notificationService: ReturnType<typeof createNotificationService>,
  user: HonoEnv["Variables"]["user"],
  workspace: HonoEnv["Variables"]["workspace"],
) => {
  return async (params: ResolveBlocked): Promise<ResolveBlockedResult> => {
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

    const slackNotification = await notificationService.notifyBlockResolved({
      session: {
        id: session.id,
        slackThreadTs: session.slackThreadTs,
        slackChannel: session.slackChannel,
      },
      blockReason: blockReport.reason ?? "Unknown block",
    });

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
